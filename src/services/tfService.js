/**
 * TensorFlow.js ML Service for AdversarialX
 *
 * Provides real adversarial attack simulations against MobileNet V2
 */

let model = null
let modelLoading = false
let modelLoaded = false

const IMAGENET_CLASSES = [
  'tench', 'goldfish', 'great white shark', 'hammerhead', 'electric ray', 'stingray', 'cock', 'hen', 'ostrich', 'brambling',
  'goldfinch', 'house finch', 'junco', 'indigo bunting', 'robin', 'bulbul', 'jay', 'magpie', 'chickadee', 'water ouzel',
  'kite', 'bald eagle', 'vulture', 'great grey owl', 'European fire salamander', 'smooth newt', 'newt', 'spotted salamander',
  'axolotl', 'American bullfrog', 'tree frog', 'tailed frog', 'loggerhead sea turtle', 'leatherback sea turtle', 'mud turtle',
  'terrapin', 'box turtle', 'banded gecko', 'common iguana', 'American chameleon', 'whiptail', 'agama', 'frilled lizard',
  'alligator lizard', 'Gila monster', 'European green lizard', 'chameleon', 'Komodo dragon', 'African crocodile', 'American alligator',
  'triceratops', 'worm snake', 'ring-necked snake', 'hognose snake', 'smooth green snake', 'king snake', 'garter snake', 'water snake',
  'vine snake', 'night snake', 'boa constrictor', 'African rock python', 'Indian cobra', 'green mamba', 'sea snake', 'Saharan horned viper',
  'diamondback', 'sidewinder', 'trilobite', 'harvestman', 'scorpion', 'garden spider', 'barn spider', 'European garden spider',
  'cross spider', 'tarantula', 'wolf spider', 'tick', 'centipede', 'black grouse', 'ptarmigan', 'ruffed grouse', 'prairie chicken',
  'peacock', 'quail', 'partridge', 'African grey parrot', 'macaw', 'sulphur-crested cockatoo', 'lorikeet', 'coucal', 'bee eater',
  'hornbill', 'hummingbird', 'jacamar', 'toucan', 'water ouzel', 'kite', 'bald eagle', 'vulture', 'great grey owl'
]

const CONFIG = {
  MODEL_URL: 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json',
  IMAGE_SIZE: 224,
}

let imageCounter = 0

function generateRandomImage(seed = null) {
  const canvas = document.createElement('canvas')
  canvas.width = CONFIG.IMAGE_SIZE
  canvas.height = CONFIG.IMAGE_SIZE
  const ctx = canvas.getContext('2d')

  const seedValue = seed !== null ? seed : imageCounter++
  const random = (i) => {
    const x = Math.sin(i * 12.9898 + 78.233 + seedValue) * 43758.5453
    return x - Math.floor(x)
  }

  const baseHue = (seedValue * 37) % 360
  const gradient = ctx.createLinearGradient(0, 0, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE)
  gradient.addColorStop(0, `hsl(${baseHue}, 60%, 20%)`)
  gradient.addColorStop(0.5, `hsl(${(baseHue + 60) % 360}, 70%, 35%)`)
  gradient.addColorStop(1, `hsl(${(baseHue + 120) % 360}, 60%, 25%)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE)

  for (let i = 0; i < 50; i++) {
    const x = random(i * 2) * CONFIG.IMAGE_SIZE
    const y = random(i * 2 + 1) * CONFIG.IMAGE_SIZE
    const r = random(i * 3 + 2) * 30 + 5
    const hue = (baseHue + random(i * 4 + 3) * 180) % 360

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.3)`
    ctx.fill()
  }

  const centerX = CONFIG.IMAGE_SIZE / 2
  const centerY = CONFIG.IMAGE_SIZE / 2
  const radius = 60 + random(10) * 20

  const centerGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  centerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
  centerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = centerGrad
  ctx.fillRect(0, 0, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE)

  return canvas
}

async function loadModel() {
  if (modelLoaded && model) return model

  if (modelLoading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (modelLoaded) {
          clearInterval(check)
          resolve(model)
        }
      }, 100)
    })
  }

  modelLoading = true
  console.log('[TF.js] Loading MobileNet V2...')

  try {
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    model = await tf.loadGraphModel(CONFIG.MODEL_URL)
    modelLoaded = true
    modelLoading = false
    console.log('[TF.js] MobileNet V2 loaded')
    return model
  } catch (error) {
    modelLoading = false
    console.error('[TF.js] Model load error:', error)
    throw error
  }
}

async function getPredictions(tensor) {
  const logits = model.predict(tensor)
  const probs = await logits.data()
  logits.dispose()

  return Array.from(probs)
    .map((p, i) => ({ label: IMAGENET_CLASSES[i] || `Class ${i}`, confidence: p * 100 }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
}

async function predictImage(seed = null) {
  const tf = await import('@tensorflow/tfjs')
  const img = generateRandomImage(seed)
  const tensor = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const predictions = await getPredictions(tensor)
  tensor.dispose()

  return {
    predictions,
    topPrediction: predictions[0],
    timestamp: Date.now()
  }
}

async function fgsmAttack(epsilon = 0.03, seed = null) {
  const tf = await import('@tensorflow/tfjs')
  const img = generateRandomImage(seed)

  const input = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const originalPred = await getPredictions(input)
  const originalTop = originalPred[0]

  const grads = tf.grad(x => {
    const logits = model.predict(x)
    return tf.max(tf.squeeze(logits))
  })(input)

  const signGrads = tf.sign(grads)
  const perturbation = signGrads.mul(epsilon)
  const adversarial = input.add(perturbation).clipByValue(0, 1)

  const advPredictions = await getPredictions(adversarial)
  const advTop = advPredictions[0]

  input.dispose()
  grads.dispose()
  signGrads.dispose()
  perturbation.dispose()
  adversarial.dispose()

  const success = advTop.label !== originalTop.label ||
                  Math.abs(advTop.confidence - originalTop.confidence) > 10

  return {
    originalPrediction: originalTop.label,
    originalConfidence: originalTop.confidence,
    adversarialPrediction: advTop.label,
    adversarialConfidence: advTop.confidence,
    predictions: advPredictions,
    perturbationNorm: epsilon * 255,
    epsilon,
    attackType: 'fgsm',
    success,
    timestamp: Date.now()
  }
}

async function pgdAttack(epsilon = 0.03, iterations = 10, seed = null) {
  const tf = await import('@tensorflow/tfjs')
  const img = generateRandomImage(seed)

  const input = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const originalPred = await getPredictions(input)
  const originalTop = originalPred[0]

  let adversarial = input.clone()
  const alpha = epsilon / 5

  for (let i = 0; i < iterations; i++) {
    const grads = tf.grad(x => {
      const logits = model.predict(x)
      return tf.max(tf.squeeze(logits))
    })(adversarial)

    const signGrad = tf.sign(grads)
    adversarial = adversarial.add(signGrad.mul(alpha))
    adversarial = adversarial.clipByValue(input.sub(epsilon), input.add(epsilon)).clipByValue(0, 1)

    grads.dispose()
    signGrad.dispose()
  }

  const advPredictions = await getPredictions(adversarial)
  const advTop = advPredictions[0]

  input.dispose()
  adversarial.dispose()

  const success = advTop.label !== originalTop.label ||
                  Math.abs(advTop.confidence - originalTop.confidence) > 15

  return {
    originalPrediction: originalTop.label,
    originalConfidence: originalTop.confidence,
    adversarialPrediction: advTop.label,
    adversarialConfidence: advTop.confidence,
    predictions: advPredictions,
    perturbationNorm: epsilon * 255,
    epsilon,
    iterations,
    attackType: 'pgd',
    success,
    timestamp: Date.now()
  }
}

async function deepfoolAttack(epsilon = 0.03, seed = null) {
  const tf = await import('@tensorflow/tfjs')
  const img = generateRandomImage(seed)

  const input = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const originalPred = await getPredictions(input)
  const originalTop = originalPred[0]

  const logits = model.predict(input)
  const probs = await logits.data()
  const originalClass = probs.indexOf(Math.max(...probs))
  logits.dispose()

  let perturbed = input.clone()
  let minPerturbation = 1000
  let iterations = 0
  const maxIterations = 20

  while (iterations < maxIterations) {
    const log = model.predict(perturbed)
    const logData = await log.data()
    log.dispose()

    const gradF0 = tf.grad(x => {
      const l = model.predict(x)
      return tf.max(tf.squeeze(l))
    })(perturbed)

    const perturbations = []
    for (let k = 0; k < 5; k++) {
      if (k === originalClass) continue

      const gradFk = tf.grad(x => {
        const l = model.predict(x)
        return tf.squeeze(tf.gather(l, tf.tensor1d([k]), 1))
      })(perturbed)

      const f_k = logData[k]
      const f_0 = logData[originalClass]
      const gradDiff = gradFk.sub(gradF0)
      const norm = gradDiff.norm().dataSync()[0]

      if (norm > 0) {
        const pert = Math.abs(f_k - f_0) / norm
        if (pert < minPerturbation) {
          minPerturbation = pert
        }
      }

      gradFk.dispose()
    }

    gradF0.dispose()

    const step = minPerturbation * 0.5
    const gradNorm = tf.grad(x => {
      const l = model.predict(x)
      return tf.squeeze(tf.gather(l, tf.tensor1d([originalClass]), 1))
    })(perturbed)

    const update = gradNorm.mul(step / (gradNorm.norm().dataSync()[0] + 0.0001))
    perturbed = perturbed.sub(update).clipByValue(0, 1)

    gradNorm.dispose()
    update.dispose()

    iterations++

    const newLog = model.predict(perturbed)
    const newData = await newLog.data()
    const newTopClass = newData.indexOf(Math.max(...newData))
    newLog.dispose()

    if (newTopClass !== originalClass) break
  }

  const advLog = model.predict(perturbed)
  const advPredictions = await getPredictions(advLog)
  const advTop = advPredictions[0]
  advLog.dispose()

  input.dispose()
  perturbed.dispose()

  const success = advTop.label !== originalTop.label

  return {
    originalPrediction: originalTop.label,
    originalConfidence: originalTop.confidence,
    adversarialPrediction: advTop.label,
    adversarialConfidence: advTop.confidence,
    predictions: advPredictions,
    perturbationNorm: Math.min(minPerturbation * 255, epsilon * 255),
    epsilon,
    iterations,
    attackType: 'deepfool',
    success,
    timestamp: Date.now()
  }
}

async function cwAttack(epsilon = 0.03, seed = null) {
  const tf = await import('@tensorflow/tfjs')
  const img = generateRandomImage(seed)

  const input = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const originalPred = await getPredictions(input)
  const originalTop = originalPred[0]

  const logits = model.predict(input)
  const probs = await logits.data()
  const originalClass = probs.indexOf(Math.max(...probs))
  logits.dispose()

  let w = tf.randomNormal(input.shape).mul(0.01)
  const lr = 0.01
  const iterations = 15

  for (let i = 0; i < iterations; i++) {
    const x = tf.sigmoid(w).mul(2 * epsilon).add(input).clipByValue(0, 1)
    const pred = model.predict(x)
    const predData = await pred.data()

    const targetLogit = predData[originalClass]
    const otherLogits = predData.filter((_, idx) => idx !== originalClass)
    const maxOther = Math.max(...otherLogits)

    const loss = tf.sum(tf.square(w)).mul(0.001)
      .add(tf.maximum(tf.scalar(maxOther - targetLogit + 50), 0))

    const grad = tf.grad(() => loss)(w)
    w = w.sub(grad.mul(lr))

    loss.dispose()
    grad.dispose()
    x.dispose()
    pred.dispose()
  }

  const adversarial = tf.sigmoid(w).mul(2 * epsilon).add(input).clipByValue(0, 1)
  const advPredictions = await getPredictions(adversarial)
  const advTop = advPredictions[0]

  input.dispose()
  w.dispose()
  adversarial.dispose()

  const success = advTop.label !== originalTop.label

  return {
    originalPrediction: originalTop.label,
    originalConfidence: originalTop.confidence,
    adversarialPrediction: advTop.label,
    adversarialConfidence: advTop.confidence,
    predictions: advPredictions,
    perturbationNorm: epsilon * 255 * 0.5,
    epsilon,
    attackType: 'cw',
    success,
    timestamp: Date.now()
  }
}

async function executeAttack(attackType, epsilon, seed = null) {
  switch (attackType) {
    case 'fgsm':
      return fgsmAttack(epsilon, seed)
    case 'pgd':
      return pgdAttack(epsilon, 10, seed)
    case 'cw':
      return cwAttack(epsilon, seed)
    case 'deepfool':
      return deepfoolAttack(epsilon, seed)
    default:
      return fgsmAttack(epsilon, seed)
  }
}

export default {
  loadModel,
  predictImage,
  executeAttack,
  generateRandomImage
}

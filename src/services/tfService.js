/**
 * TensorFlow.js ML Service for AdversarialX
 *
 * Comprehensive adversarial attack demonstrations:
 * 1. FGSM - Fast Gradient Sign Method (one-shot attack)
 * 2. PGD - Projected Gradient Descent (iterative attack)
 * 3. C&W - Carlini & Wagner (optimization-based)
 * 4. DeepFool - Minimal perturbation (linearization)
 *
 * Each attack demonstrates how small perturbations can fool neural networks.
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
  const random = seedValue === 0 ? () => 0.5 : ((i) => {
    const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
  })

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
  console.log('[TF.js] Loading MobileNet V2 model...')

  try {
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    model = await tf.loadGraphModel(CONFIG.MODEL_URL)
    modelLoaded = true
    modelLoading = false
    console.log('[TF.js] MobileNet V2 loaded successfully')
    return model
  } catch (error) {
    modelLoading = false
    console.error('[TF.js] Model load error:', error)
    throw error
  }
}

async function predictImage(imageElement, seed = null) {
  const tf = await import('@tensorflow/tfjs')

  const img = imageElement || generateRandomImage(seed)
  const tensor = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const logits = model.predict(tensor)
  const probs = await logits.data()

  tensor.dispose()
  logits.dispose()

  const predictions = Array.from(probs)
    .map((p, i) => ({ label: IMAGENET_CLASSES[i] || `Class ${i}`, confidence: p * 100 }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)

  return {
    predictions,
    topPrediction: predictions[0],
    timestamp: Date.now()
  }
}

/**
 * FGSM Attack - Fast Gradient Sign Method
 *
 * THEORY:
 * J(θ, x, y) = Loss function
 * gradient = ∂J/∂x (gradient of loss w.r.t. input)
 * sign(gradient) = direction to increase loss
 * x_adv = x + ε * sign(gradient)
 *
 * ONE-SHOT ATTACK: Just one gradient computation, then add perturbation.
 * Simple, fast, but less precise.
 */
async function fgsmAttack(imageElement, epsilon = 0.03, seed = null) {
  const tf = await import('@tensorflow/tfjs')

  const img = imageElement || generateRandomImage(seed)
  const input = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const originalPred = await predictImage(img, seed)
  const originalClass = originalPred.predictions.findIndex(p => p.confidence === originalPred.topPrediction.confidence)

  const targetClass = tf.tensor1d([originalClass])
  const loss = tf.tensor1d([0])

  const gradient = tf.grad(x => {
    const logits = model.predict(x)
    const logit = tf.gather(logits, targetClass, 1)
    return logit
  })

  const grads = gradient(input)
  const signGrads = tf.sign(grads)
  const perturbation = signGrads.mul(epsilon)

  const adversarial = input.add(perturbation).clipByValue(0, 1)
  const logits = model.predict(adversarial)
  const probs = await logits.data()

  input.dispose()
  targetClass.dispose()
  loss.dispose()
  gradient.dispose()
  grads.dispose()
  signGrads.dispose()
  perturbation.dispose()
  adversarial.dispose()
  logits.dispose()

  const advPredictions = Array.from(probs)
    .map((p, i) => ({ label: IMAGENET_CLASSES[i] || `Class ${i}`, confidence: p * 100 }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)

  const newTop = advPredictions[0]
  const originalTop = originalPred.topPrediction

  const success = newTop.label !== originalTop.label ||
                  Math.abs(newTop.confidence - originalTop.confidence) > 5

  return {
    originalPrediction: originalTop.label,
    originalConfidence: originalTop.confidence,
    adversarialPrediction: newTop.label,
    adversarialConfidence: newTop.confidence,
    predictions: advPredictions,
    perturbationNorm: epsilon * 255,
    epsilon,
    attackType: 'fgsm',
    success,
    perturbation,
    timestamp: Date.now()
  }
}

/**
 * PGD Attack - Projected Gradient Descent
 *
 * THEORY:
 * Iterative version of FGSM with projection back to valid region.
 * x^(t+1) = Clip(x + α * sign(∇xJ(x^(t), y)))
 * α = step size, ε = max perturbation
 *
 * ITERATIVE ATTACK: Multiple small steps, each projecting back to ε-ball.
 * More powerful, harder to defend against.
 */
async function pgdAttack(imageElement, epsilon = 0.03, iterations = 10, seed = null) {
  const tf = await import('@tensorflow/tfjs')

  const img = imageElement || generateRandomImage(seed)
  const input = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const originalPred = await predictImage(img, seed)

  const targetClass = tf.tensor1d([originalPred.predictions.findIndex(p =>
    p.confidence === originalPred.topPrediction.confidence
  )])

  let adversarial = input.clone()
  const alpha = epsilon / 5

  for (let i = 0; i < iterations; i++) {
    const grads = tf.grad(x => {
      const logits = model.predict(x)
      const logit = tf.gather(logits, targetClass, 1)
      return logit
    })

    const gradient = grads(adversarial)
    const signGrad = tf.sign(gradient)

    adversarial = adversarial.add(signGrad.mul(alpha))
    adversarial = adversarial.clipByValue(input.sub(epsilon), input.add(epsilon)).clipByValue(0, 1)

    gradient.dispose()
  }

  const logits = model.predict(adversarial)
  const probs = await logits.data()

  input.dispose()
  targetClass.dispose()
  adversarial.dispose()
  logits.dispose()

  const advPredictions = Array.from(probs)
    .map((p, i) => ({ label: IMAGENET_CLASSES[i] || `Class ${i}`, confidence: p * 100 }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)

  const newTop = advPredictions[0]
  const originalTop = originalPred.topPrediction

  const success = newTop.label !== originalTop.label ||
                  Math.abs(newTop.confidence - originalTop.confidence) > 10

  return {
    originalPrediction: originalTop.label,
    originalConfidence: originalTop.confidence,
    adversarialPrediction: newTop.label,
    adversarialConfidence: newTop.confidence,
    predictions: advPredictions,
    perturbationNorm: epsilon * 255,
    epsilon,
    iterations,
    attackType: 'pgd',
    success,
    timestamp: Date.now()
  }
}

/**
 * DeepFool Attack
 *
 * THEORY:
 * Linearizes the classifier around each sample and finds minimal
 * perturbation to cross decision boundary.
 * Works by iteratively approximating the decision boundary.
 *
 * MINIMAL PERTURBATION: Finds the smallest change needed to misclassify.
 * Good for measuring classifier robustness.
 */
async function deepfoolAttack(imageElement, epsilon = 0.03, seed = null) {
  const tf = await import('@tensorflow/tfjs')

  const img = imageElement || generateRandomImage(seed)
  const input = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const originalPred = await predictImage(img, seed)

  const logits = model.predict(input)
  const probs = await logits.data()
  const originalClass = probs.indexOf(Math.max(...probs))

  let perturbed = input.clone()
  let minPerturbation = 1000
  let iterations = 0
  const maxIterations = 50

  while (iterations < maxIterations) {
    const grad = tf.grad(x => {
      const l = model.predict(x)
      const v = tf.gather(l, tf.tensor1d([originalClass]), 1)
      return v
    })(perturbed)

    const perturbations = []
    for (let i = 0; i < 10; i++) {
      if (i === originalClass) continue
      const otherGrad = tf.grad(x => {
        const l = model.predict(x)
        const v = tf.gather(l, tf.tensor1d([i]), 1)
        return v
      })(perturbed)

      const f_i = tf.squeeze(tf.gather(model.predict(perturbed), tf.tensor1d([i]), 1))
      const f_orig = tf.squeeze(tf.gather(model.predict(perturbed), tf.tensor1d([originalClass]), 1))
      const diff = f_i.sub(f_orig)
      const gradDiff = otherGrad.sub(grad)
      const gradNorm = gradDiff.norm()

      if (gradNorm.dataSync()[0] > 0) {
        const perturbation = Math.abs(diff.dataSync()[0] / gradNorm.dataSync()[0])
        perturbations.push({ class: i, perturbation, grad: otherGrad })
      }
      otherGrad.dispose()
    }

    if (perturbations.length > 0) {
      perturbations.sort((a, b) => a.perturbation - b.perturbation)
      const min = perturbations[0]

      const gradNorm = min.grad.norm()
      if (gradNorm.dataSync()[0] > 0) {
        const step = min.perturbation / gradNorm.dataSync()[0] * 0.5
        const update = min.grad.mul(step / gradNorm.dataSync()[0])
        perturbed = perturbed.sub(update)
        update.dispose()
      }
      minPerturbation = min.perturbation
    }

    grad.dispose()
    iterations++

    const newPreds = model.predict(perturbed)
    const newProbs = await newPreds.data()
    const newTopClass = newProbs.indexOf(Math.max(...newProbs))
    if (newTopClass !== originalClass) break
  }

  const advLogits = model.predict(perturbed)
  const advProbs = await advLogits.data()

  input.dispose()
  perturbed.dispose()
  advLogits.dispose()

  const advPredictions = Array.from(advProbs)
    .map((p, i) => ({ label: IMAGENET_CLASSES[i] || `Class ${i}`, confidence: p * 100 }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)

  const newTop = advPredictions[0]
  const originalTop = originalPred.topPrediction

  const success = newTop.label !== originalTop.label

  return {
    originalPrediction: originalTop.label,
    originalConfidence: originalTop.confidence,
    adversarialPrediction: newTop.label,
    adversarialConfidence: newTop.confidence,
    predictions: advPredictions,
    perturbationNorm: minPerturbation * 255,
    epsilon,
    iterations,
    attackType: 'deepfool',
    success,
    timestamp: Date.now()
  }
}

/**
 * C&W Attack - Carlini & Wagner
 *
 * THEORY:
 * Formulated as an optimization problem:
 * minimize ||x* - x||² + c * f(x*)
 * where f(x*) = max(Z(x*)_y - Z(x*)_t, -κ)
 *
 * OPTIMIZATION-BASED: Finds minimal L2 perturbation.
 * Strongest attack but computationally expensive.
 */
async function cwAttack(imageElement, epsilon = 0.03, seed = null) {
  const tf = await import('@tensorflow/tfjs')

  const img = imageElement || generateRandomImage(seed)
  const input = tf.browser.fromPixels(img)
    .resizeBilinear([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE])
    .expandDims(0)
    .div(255.0)

  const originalPred = await predictImage(img, seed)

  const logits = model.predict(input)
  const probs = await logits.data()
  const originalClass = probs.indexOf(Math.max(...probs))

  let w = tf.zerosLike(input)
  const learningRate = 0.01
  const iterations = 20

  for (let i = 0; i < iterations; i++) {
    const x = tf.sigmoid(w).mul(2).sub(1).mul(epsilon).add(input)

    const pred = model.predict(x.expandDims(0))
    const predData = await pred.data()

    const targetLogit = predData[originalClass]
    const maxOtherLogit = Math.max(...predData.filter((_, i) => i !== originalClass))

    const loss = tf.scalar(0.01).mul(tf.sum(tf.square(w)))
      .add(tf.maximum(tf.scalar(maxOtherLogit - targetLogit + 50), 0))

    const grad = tf.grad(() => loss)(w)

    w = w.sub(grad.mul(learningRate))

    loss.dispose()
    grad.dispose()
    pred.dispose()
  }

  const adversarial = tf.sigmoid(w).mul(2).sub(1).mul(epsilon).add(input).clipByValue(0, 1)
  const advLogits = model.predict(adversarial)
  const advProbs = await advLogits.data()

  input.dispose()
  w.dispose()
  adversarial.dispose()
  advLogits.dispose()

  const advPredictions = Array.from(advProbs)
    .map((p, i) => ({ label: IMAGENET_CLASSES[i] || `Class ${i}`, confidence: p * 100 }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)

  const newTop = advPredictions[0]
  const originalTop = originalPred.topPrediction

  const success = newTop.label !== originalTop.label

  return {
    originalPrediction: originalTop.label,
    originalConfidence: originalTop.confidence,
    adversarialPrediction: newTop.label,
    adversarialConfidence: newTop.confidence,
    predictions: advPredictions,
    perturbationNorm: epsilon * 255 * 0.5,
    epsilon,
    attackType: 'cw',
    success,
    timestamp: Date.now()
  }
}

async function executeAttack(attackType, epsilon, imageElement = null, seed = null) {
  switch (attackType) {
    case 'fgsm':
      return fgsmAttack(imageElement, epsilon, seed)
    case 'pgd':
      return pgdAttack(imageElement, epsilon, 10, seed)
    case 'cw':
      return cwAttack(imageElement, epsilon, seed)
    case 'deepfool':
      return deepfoolAttack(imageElement, epsilon, seed)
    default:
      return fgsmAttack(imageElement, epsilon, seed)
  }
}

export default {
  loadModel,
  predictImage,
  executeAttack,
  generateRandomImage
}

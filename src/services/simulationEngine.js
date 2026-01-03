/**
 * Unified AdversarialX Simulation Engine
 *
 * Comprehensive simulation where all components work together logically:
 * - Attack methods have distinct characteristics
 * - Defense mechanisms reduce attack effectiveness
 * - Epsilon affects perturbation magnitude
 * - Confidence degrades realistically based on attacks
 * - Neural network visualization reflects attack state
 */

const IMAGENET_CLASSES = [
  'tench', 'goldfish', 'great white shark', 'hammerhead', 'electric ray', 'stingray',
  'cock', 'hen', 'ostrich', 'brambling', 'goldfinch', 'house finch', 'junco',
  'indigo bunting', 'robin', 'bulbul', 'jay', 'magpie', 'chickadee', 'water ouzel',
  'kite', 'bald eagle', 'vulture', 'great grey owl'
]

const ATTACK_CONFIGS = {
  fgsm: {
    name: 'FGSM',
    fullName: 'Fast Gradient Sign Method',
    description: 'Single-step gradient-based attack',
    baseSuccessRate: 0.75,
    baseConfidenceDrop: 25,
    perturbationMultiplier: 1.0,
    iterations: 1,
    speed: 'fast'
  },
  pgd: {
    name: 'PGD',
    fullName: 'Projected Gradient Descent',
    description: 'Iterative attack with projection',
    baseSuccessRate: 0.88,
    baseConfidenceDrop: 35,
    perturbationMultiplier: 1.2,
    iterations: 10,
    speed: 'medium'
  },
  cw: {
    name: 'C&W',
    fullName: 'Carlini & Wagner L2',
    description: 'Optimization-based attack',
    baseSuccessRate: 0.92,
    baseConfidenceDrop: 40,
    perturbationMultiplier: 0.8,
    iterations: 20,
    speed: 'slow'
  },
  deepfool: {
    name: 'DeepFool',
    fullName: 'DeepFool',
    description: 'Minimal perturbation attack',
    baseSuccessRate: 0.68,
    baseConfidenceDrop: 18,
    perturbationMultiplier: 0.5,
    iterations: 1,
    speed: 'fast'
  }
}

const DEFENSE_CONFIGS = {
  adversarialTraining: {
    name: 'Adversarial Training',
    description: 'Trains on adversarial examples',
    baseEffectiveness: 0.78,
    overhead: 2.3,
    color: '#6366f1'
  },
  inputPreprocessing: {
    name: 'Input Preprocessing',
    description: 'Filters and transforms input',
    baseEffectiveness: 0.45,
    overhead: 0.5,
    color: '#22c55e'
  },
  defensiveDistillation: {
    name: 'Defensive Distillation',
    description: 'Reduces model sensitivity',
    baseEffectiveness: 0.62,
    overhead: 1.8,
    color: '#f59e0b'
  },
  featureSqueezing: {
    name: 'Feature Squeezing',
    description: 'Reduces input complexity',
    baseEffectiveness: 0.55,
    overhead: 0.8,
    color: '#06b6d4'
  }
}

let state = {
  currentConfidence: 97.2,
  baseConfidence: 97.2,
  confidenceHistory: [],
  attackCount: 0,
  successCount: 0,
  perturbationLevel: 0.03,
  currentAttack: 'fgsm',
  isRunning: false,
  defenses: {
    adversarialTraining: false,
    inputPreprocessing: true,
    defensiveDistillation: false,
    featureSqueezing: true
  },
  currentPrediction: null,
  adversarialPrediction: null,
  predictions: [],
  attackedNodes: new Set(),
  attackLog: [],
  seed: 42
}

function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function generatePrediction(seed, isAdversarial = false) {
  const r = seededRandom(seed)
  const baseIdx = Math.floor(r * IMAGENET_CLASSES.length)
  const confidence = isAdversarial
    ? 20 + seededRandom(seed + 1) * 50
    : 85 + seededRandom(seed + 1) * 14

  const alternatives = IMAGENET_CLASSES.filter((_, i) => i !== baseIdx)
    .sort(() => seededRandom(seed + i + 2) - 0.5)
    .slice(0, 4)
    .map((label, i) => ({
      label,
      confidence: Math.max(1, (confidence - 15 - i * 8) + seededRandom(seed + i + 10) * 5)
    }))

  return {
    top: { label: IMAGENET_CLASSES[baseIdx], confidence },
    alternatives,
    all: [{ label: IMAGENET_CLASSES[baseIdx], confidence }, ...alternatives]
  }
}

function getDefenseMultiplier() {
  let multiplier = 1.0
  const defenseKeys = Object.keys(state.defenses)

  defenseKeys.forEach(key => {
    if (state.defenses[key]) {
      const config = DEFENSE_CONFIGS[key] || Object.values(DEFENSE_CONFIGS).find(d => d.name.toLowerCase().includes(key.replace(/([A-Z])/g, ' $1').toLowerCase().split(' ')[0]))
      if (config) {
        multiplier *= (1 - config.baseEffectiveness * 0.4)
      }
    }
  })

  return Math.max(0.1, multiplier)
}

function calculateAttackEffectiveness() {
  const attackConfig = ATTACK_CONFIGS[state.currentAttack] || ATTACK_CONFIGS.fgsm
  const defenseMultiplier = getDefenseMultiplier()
  const epsilonMultiplier = Math.min(state.perturbationLevel / 0.03, 3)

  const effectiveness = attackConfig.baseSuccessRate * defenseMultiplier * Math.min(epsilonMultiplier, 2)
  return Math.min(0.98, effectiveness)
}

function calculateConfidenceDrop() {
  const attackConfig = ATTACK_CONFIGS[state.currentAttack] || ATTACK_CONFIGS.fgsm
  const defenseMultiplier = getDefenseMultiplier()
  const epsilonMultiplier = Math.min(state.perturbationLevel / 0.03, 2)

  const drop = attackConfig.baseConfidenceDrop * defenseMultiplier * epsilonMultiplier
  return Math.min(state.currentConfidence - 10, drop)
}

function updateAttackedNodes() {
  const effectiveness = calculateAttackEffectiveness()
  const threshold = 1 - effectiveness

  if (state.currentConfidence > 80) {
    state.attackedNodes = new Set()
    return
  }

  const numAttacked = Math.floor((1 - state.currentConfidence / 100) * 25 + 5)
  const layers = [4, 8, 8, 6, 3]
  const newAttacked = new Set()

  for (let i = 0; i < numAttacked; i++) {
    const li = Math.floor(seededRandom(state.seed + i) * 5)
    const nodeCount = layers[li]
    const ni = Math.floor(seededRandom(state.seed + i + 10) * nodeCount)
    newAttacked.add(`${li}-${ni}`)
  }

  state.attackedNodes = newAttacked
}

function runAttack() {
  state.seed++
  state.attackCount++

  const attackConfig = ATTACK_CONFIGS[state.currentAttack] || ATTACK_CONFIGS.fgsm
  const effectiveness = calculateAttackEffectiveness()
  const confidenceDrop = calculateConfidenceDrop()

  const success = seededRandom(state.seed) < effectiveness
  const oldConfidence = state.currentConfidence

  if (success) {
    state.currentConfidence = Math.max(15, state.currentConfidence - confidenceDrop)
    state.successCount++
  } else {
    state.currentConfidence = Math.min(99, state.currentConfidence - confidenceDrop * 0.3)
  }

  state.confidenceHistory.push({
    time: state.attackCount,
    value: Math.min(100, state.currentConfidence),
    attack: state.currentAttack,
    success
  })

  if (state.confidenceHistory.length > 60) {
    state.confidenceHistory.shift()
  }

  const predSeed = state.seed
  state.currentPrediction = generatePrediction(predSeed, false)
  state.adversarialPrediction = generatePrediction(predSeed + 1000, true)
  state.predictions = state.adversarialPrediction.all

  updateAttackedNodes()

  const log = {
    type: success ? 'danger' : 'info',
    message: `${attackConfig.name}: ${state.currentPrediction.top.label} → ${state.adversarialPrediction.top.label} (${state.currentConfidence.toFixed(1)}%)`,
    time: Date.now()
  }

  state.attackLog = [log, ...state.attackLog].slice(0, 15)

  return {
    success,
    confidenceDrop: state.currentConfidence - oldConfidence,
    newConfidence: state.currentConfidence,
    predictions: state.predictions,
    originalPrediction: state.currentPrediction.top,
    adversarialPrediction: state.adversarialPrediction.top,
    attackType: state.currentAttack,
    perturbationLevel: state.perturbationLevel,
    attackConfig
  }
}

function getStatistics() {
  const effectiveness = calculateAttackEffectiveness()
  const successRate = state.attackCount > 0
    ? Math.round((state.successCount / state.attackCount) * 100)
    : 0

  const defenseEffectiveness = Math.round((1 - getDefenseMultiplier()) * 100)

  return {
    successRate,
    attackCount: state.attackCount,
    successCount: state.successCount,
    perturbation: Math.round(state.perturbationLevel * 255),
    maxPerturbation: 25.5,
    defenseEffectiveness,
    currentEpsilon: state.perturbationLevel
  }
}

function getDefenseMetrics() {
  return [
    {
      name: 'Adversarial Training',
      effectiveness: 78,
      overhead: 2.3,
      enabled: state.defenses.adversarialTraining
    },
    {
      name: 'Input Preprocessing',
      effectiveness: 45,
      overhead: 0.5,
      enabled: state.defenses.inputPreprocessing
    },
    {
      name: 'Defensive Distillation',
      effectiveness: 62,
      overhead: 1.8,
      enabled: state.defenses.defensiveDistillation
    },
    {
      name: 'Feature Squeezing',
      effectiveness: 55,
      overhead: 0.8,
      enabled: state.defenses.featureSqueezing
    }
  ]
}

function toggleDefense(name) {
  const keyMap = {
    'Adversarial Training': 'adversarialTraining',
    'Input Preprocessing': 'inputPreprocessing',
    'Defensive Distillation': 'defensiveDistillation',
    'Feature Squeezing': 'featureSqueezing'
  }

  const key = keyMap[name]
  if (key) {
    state.defenses[key] = !state.defenses[key]
    return state.defenses[key]
  }
  return false
}

function setAttackType(attackType) {
  if (ATTACK_CONFIGS[attackType]) {
    state.currentAttack = attackType
  }
}

function setEpsilon(epsilon) {
  state.perturbationLevel = Math.max(0.001, Math.min(0.1, epsilon))
}

function resetSimulation() {
  state.currentConfidence = 97.2
  state.confidenceHistory = []
  state.attackCount = 0
  state.successCount = 0
  state.seed = 42
  state.attackedNodes = new Set()
  state.attackLog = []

  const initial = generatePrediction(42, false)
  state.currentPrediction = initial
  state.adversarialPrediction = generatePrediction(142, true)
  state.predictions = initial.all
}

function getNeuralNetworkState() {
  const layers = [4, 8, 8, 6, 3]
  const layerSpacing = 600 / (layers.length + 1)

  return layers.map((nodeCount, layerIndex) => {
    const x = layerSpacing * (layerIndex + 1)
    return Array.from({ length: nodeCount }, (_, i) => ({
      x,
      y: (300 / (nodeCount + 1)) * (i + 1),
      isAttacked: state.attackedNodes.has(`${layerIndex}-${i}`)
    }))
  })
}

function initialize() {
  resetSimulation()
  return {
    confidence: state.currentConfidence,
    predictions: state.predictions,
    originalPrediction: state.currentPrediction.top,
    statistics: getStatistics(),
    defenses: getDefenseMetrics(),
    neuralNetwork: getNeuralNetworkState()
  }
}

function getConfidenceHistory() {
  return state.confidenceHistory
}

function getAttackLog() {
  return state.attackLog
}

function getCurrentState() {
  return {
    confidence: state.currentConfidence,
    attack: state.currentAttack,
    epsilon: state.perturbationLevel,
    defenses: state.defenses,
    isRunning: state.isRunning
  }
}

export {
  initialize,
  runAttack,
  getStatistics,
  getDefenseMetrics,
  toggleDefense,
  setAttackType,
  setEpsilon,
  resetSimulation,
  getNeuralNetworkState,
  getConfidenceHistory,
  getAttackLog,
  getCurrentState
}

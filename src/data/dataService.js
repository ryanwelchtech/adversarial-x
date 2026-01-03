/**
 * Data Service Layer for AdversarialX
 *
 * This module provides a unified interface for data fetching.
 * Replace mock implementations with real API calls for production.
 *
 * REAL DATA INTEGRATION OPTIONS:
 *
 * 1. REST API Backend (FastAPI/Express)
 *    - Set API_BASE_URL to your backend
 *    - Implement JWT authentication
 *    - Use WebSocket for real-time updates
 *
 * 2. ML Model APIs
 *    - TensorFlow Serving: https://www.tensorflow.org/tfx/serving/api_rest
 *    - TorchServe: https://pytorch.org/serve/
 *    - Hugging Face Inference API
 *
 * 3. Cloud ML Services
 *    - AWS SageMaker endpoints
 *    - Google Cloud AI Platform
 *    - Azure ML
 *
 * 4. Research Datasets
 *    - Adversarial Robustness Toolbox (ART)
 *    - CleverHans library
 *    - RobustBench leaderboard data
 */

// Configuration
const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
  USE_MOCK: import.meta.env.VITE_USE_MOCK !== 'false', // Default to mock data
  CACHE_TTL: 30000, // 30 seconds
}

// Simple in-memory cache for API responses
const cache = new Map()

const getCached = (key) => {
  const item = cache.get(key)
  if (item && Date.now() - item.timestamp < CONFIG.CACHE_TTL) {
    return item.data
  }
  return null
}

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() })
}

// ============================================
// MOCK DATA GENERATORS (Replace with real APIs)
// ============================================

const generateMockConfidence = (epsilon) => {
  const baseConfidence = 97.2
  const degradation = epsilon * 800
  const noise = (Math.random() - 0.5) * 10
  return Math.max(5, Math.min(100, baseConfidence - degradation + noise))
}

const generateMockAttackResult = (attackType, epsilon) => {
  const successRates = { fgsm: 0.85, pgd: 0.92, cw: 0.96, deepfool: 0.89 }
  const baseRate = successRates[attackType] || 0.85
  return {
    success: Math.random() < baseRate + epsilon * 2,
    confidence: generateMockConfidence(epsilon),
    perturbationNorm: epsilon * 255,
    iterations: attackType === 'pgd' ? Math.floor(10 + Math.random() * 30) : 1,
    timestamp: Date.now(),
  }
}

// ============================================
// API METHODS
// ============================================

/**
 * Fetch model prediction with optional adversarial attack
 *
 * REAL IMPLEMENTATION:
 * POST /api/predict
 * Body: { image: base64, attack_type: string, epsilon: float }
 * Response: { predictions: [], confidence: float, is_adversarial: bool }
 */
export const fetchPrediction = async (imageData, attackConfig = null) => {
  if (CONFIG.USE_MOCK) {
    await new Promise(r => setTimeout(r, 50)) // Simulate network latency
    return {
      predictions: [
        { label: 'panda', confidence: attackConfig ? generateMockConfidence(attackConfig.epsilon) : 97.2 },
        { label: 'gibbon', confidence: attackConfig ? 100 - generateMockConfidence(attackConfig.epsilon) : 2.1 },
        { label: 'macaque', confidence: Math.random() * 5 },
      ],
      isAdversarial: !!attackConfig,
      timestamp: Date.now(),
    }
  }

  // Real API call
  const response = await fetch(`${CONFIG.API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageData, attack: attackConfig }),
  })
  return response.json()
}

/**
 * Execute adversarial attack on model
 *
 * REAL IMPLEMENTATION:
 * POST /api/attack
 * Body: { image: base64, attack_type: 'fgsm'|'pgd'|'cw'|'deepfool', epsilon: float, iterations: int }
 * Response: { adversarial_image: base64, original_pred: {}, adversarial_pred: {}, perturbation: {} }
 */
export const executeAttack = async (attackType, epsilon, imageData = null) => {
  if (CONFIG.USE_MOCK) {
    await new Promise(r => setTimeout(r, 100))
    return generateMockAttackResult(attackType, epsilon)
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}/attack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attack_type: attackType, epsilon, image: imageData }),
  })
  return response.json()
}

/**
 * Get defense effectiveness metrics
 *
 * REAL IMPLEMENTATION:
 * GET /api/defenses
 * Response: { defenses: [{ name: string, effectiveness: float, overhead: float }] }
 */
export const fetchDefenseMetrics = async () => {
  const cacheKey = 'defenses'
  const cached = getCached(cacheKey)
  if (cached) return cached

  if (CONFIG.USE_MOCK) {
    const data = {
      defenses: [
        { name: 'Adversarial Training', effectiveness: 78, overhead: 2.3, enabled: false },
        { name: 'Input Preprocessing', effectiveness: 45, overhead: 0.5, enabled: true },
        { name: 'Defensive Distillation', effectiveness: 62, overhead: 1.8, enabled: false },
        { name: 'Feature Squeezing', effectiveness: 55, overhead: 0.8, enabled: true },
      ],
    }
    setCache(cacheKey, data)
    return data
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}/defenses`)
  const data = await response.json()
  setCache(cacheKey, data)
  return data
}

/**
 * Stream real-time attack metrics via WebSocket
 *
 * REAL IMPLEMENTATION:
 * WebSocket connection to /ws/attacks
 * Messages: { type: 'confidence'|'attack_result', data: {} }
 */
export const createAttackStream = (onMessage, onError) => {
  if (CONFIG.USE_MOCK) {
    // Mock streaming with intervals
    const interval = setInterval(() => {
      onMessage({
        type: 'confidence',
        data: { value: generateMockConfidence(0.03), timestamp: Date.now() },
      })
    }, 100)

    return {
      close: () => clearInterval(interval),
      send: () => {},
    }
  }

  // Real WebSocket connection
  const ws = new WebSocket(`${CONFIG.WS_URL}/attacks`)
  ws.onmessage = (event) => onMessage(JSON.parse(event.data))
  ws.onerror = onError
  return ws
}

/**
 * Fetch model architecture for visualization
 *
 * REAL IMPLEMENTATION:
 * GET /api/model/architecture
 * Response: { layers: [{ type: string, units: int, activation: string }] }
 */
export const fetchModelArchitecture = async () => {
  if (CONFIG.USE_MOCK) {
    return {
      layers: [
        { type: 'input', units: 784, activation: null },
        { type: 'dense', units: 256, activation: 'relu' },
        { type: 'dense', units: 128, activation: 'relu' },
        { type: 'dense', units: 64, activation: 'relu' },
        { type: 'output', units: 10, activation: 'softmax' },
      ],
    }
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}/model/architecture`)
  return response.json()
}

// ============================================
// REAL DATA INTEGRATION EXAMPLES
// ============================================

/**
 * Example: Connect to TensorFlow Serving
 *
 * const TFSERVING_URL = 'http://localhost:8501/v1/models/adversarial:predict'
 *
 * export const predictWithTFServing = async (imageData) => {
 *   const response = await fetch(TFSERVING_URL, {
 *     method: 'POST',
 *     body: JSON.stringify({
 *       signature_name: 'serving_default',
 *       instances: [{ input: imageData }]
 *     })
 *   })
 *   return response.json()
 * }
 */

/**
 * Example: Connect to Hugging Face Inference API
 *
 * const HF_API_URL = 'https://api-inference.huggingface.co/models/your-model'
 * const HF_TOKEN = import.meta.env.VITE_HF_TOKEN
 *
 * export const predictWithHuggingFace = async (imageData) => {
 *   const response = await fetch(HF_API_URL, {
 *     method: 'POST',
 *     headers: { Authorization: `Bearer ${HF_TOKEN}` },
 *     body: imageData
 *   })
 *   return response.json()
 * }
 */

/**
 * Example: Connect to custom FastAPI backend
 *
 * // backend/main.py
 * from fastapi import FastAPI
 * from art.attacks.evasion import FastGradientMethod
 *
 * @app.post("/api/attack")
 * async def attack(request: AttackRequest):
 *     classifier = load_model()
 *     attack = FastGradientMethod(estimator=classifier, eps=request.epsilon)
 *     adversarial = attack.generate(x=request.image)
 *     return {"adversarial": adversarial, "prediction": classifier.predict(adversarial)}
 */

export default {
  fetchPrediction,
  executeAttack,
  fetchDefenseMetrics,
  createAttackStream,
  fetchModelArchitecture,
  CONFIG,
}

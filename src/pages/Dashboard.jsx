import React, { useState, useEffect, useCallback, useMemo, Component, useRef } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine } from 'recharts'

const ATTACK_METHODS = [
  { id: 'fgsm', name: 'FGSM', description: 'Fast Gradient Sign Method', color: '#ef4444', speed: 'Fast' },
  { id: 'pgd', name: 'PGD', description: 'Projected Gradient Descent', color: '#f59e0b', speed: 'Medium' },
  { id: 'cw', name: 'C&W', description: 'Carlini & Wagner L2', color: '#8b5cf6', speed: 'Slow' },
  { id: 'deepfool', name: 'DeepFool', description: 'Minimal Perturbation', color: '#06b6d4', speed: 'Fast' }
]

const DEFENSE_METHODS = [
  { id: 'adversarialTraining', name: 'Adversarial Training', effectiveness: 78, color: '#6366f1' },
  { id: 'inputPreprocessing', name: 'Input Preprocessing', effectiveness: 45, color: '#22c55e' },
  { id: 'defensiveDistillation', name: 'Defensive Distillation', effectiveness: 62, color: '#f59e0b' },
  { id: 'featureSqueezing', name: 'Feature Squeezing', effectiveness: 55, color: '#06b6d4' }
]

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="glass-panel p-8 max-w-md text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
            <p className="text-white/50 mb-4">{this.state.error?.message || 'Error'}</p>
            <button onClick={() => window.location.reload()} className="glass-button">Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const Dashboard = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [currentAttack, setCurrentAttack] = useState('fgsm')
  const [epsilon, setEpsilon] = useState(0.03)
  const [currentConfidence, setCurrentConfidence] = useState(97.2)
  const [confidenceHistory, setConfidenceHistory] = useState([])
  const [attackCount, setAttackCount] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [originalPrediction, setOriginalPrediction] = useState({ label: 'tench', confidence: 97.2 })
  const [predictions, setPredictions] = useState([])
  const [defenses, setDefenses] = useState({
    adversarialTraining: false,
    inputPreprocessing: true,
    defensiveDistillation: false,
    featureSqueezing: true
  })
  const [attackLog, setAttackLog] = useState([])
  const [neuralNetwork, setNeuralNetwork] = useState([])
  const [simulationEngine, setSimulationEngine] = useState(null)

  const intervalRef = useRef(null)
  const attackCounterRef = useRef(0)

  const IMAGENET_CLASSES = [
    'tench', 'goldfish', 'great white shark', 'hammerhead', 'electric ray', 'stingray',
    'cock', 'hen', 'ostrich', 'brambling', 'goldfinch', 'house finch', 'junco',
    'indigo bunting', 'robin', 'bulbul', 'jay', 'magpie', 'chickadee', 'water ouzel',
    'kite', 'bald eagle', 'vulture', 'great grey owl'
  ]

  const seededRandom = (seed) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
  }

  const generatePrediction = (seed, isAdversarial = false) => {
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

  const getDefenseMultiplier = useCallback(() => {
    let multiplier = 1.0
    if (defenses.adversarialTraining) multiplier *= (1 - 0.78 * 0.4)
    if (defenses.inputPreprocessing) multiplier *= (1 - 0.45 * 0.4)
    if (defenses.defensiveDistillation) multiplier *= (1 - 0.62 * 0.4)
    if (defenses.featureSqueezing) multiplier *= (1 - 0.55 * 0.4)
    return Math.max(0.1, multiplier)
  }, [defenses])

  const ATTACK_CONFIGS = {
    fgsm: { baseSuccessRate: 0.75, baseConfidenceDrop: 25 },
    pgd: { baseSuccessRate: 0.88, baseConfidenceDrop: 35 },
    cw: { baseSuccessRate: 0.92, baseConfidenceDrop: 40 },
    deepfool: { baseSuccessRate: 0.68, baseConfidenceDrop: 18 }
  }

  const initSimulation = useCallback(async () => {
    try {
      const engine = await import('../services/simulationEngine')
      const init = engine.initialize()
      setSimulationEngine(engine)

      setCurrentConfidence(init.confidence)
      setOriginalPrediction(init.originalPrediction)
      setPredictions(init.predictions)
      setConfidenceHistory([{ time: 0, value: Math.min(100, init.confidence), attack: 'init', success: false }])
      setAttackLog([{ type: 'info', message: 'Simulation initialized. Click Start to begin.', time: Date.now() }])
      setNeuralNetwork(engine.getNeuralNetworkState())

      setIsLoading(false)
    } catch (err) {
      console.error('Init error:', err)
      const initPred = generatePrediction(42, false)
      const layers = [4, 8, 8, 6, 3]
      const layerSpacing = 600 / (layers.length + 1)
      const fallbackNetwork = layers.map((nodeCount, layerIndex) => {
        const x = layerSpacing * (layerIndex + 1)
        return Array.from({ length: nodeCount }, (_, i) => ({
          x,
          y: (300 / (nodeCount + 1)) * (i + 1),
          isAttacked: false
        }))
      })

      setOriginalPrediction(initPred.top)
      setPredictions(initPred.all)
      setConfidenceHistory([{ time: 0, value: 97.2, attack: 'init', success: false }])
      setNeuralNetwork(fallbackNetwork)
      setAttackLog([{ type: 'info', message: 'Simulation initialized. Click Start to begin.', time: Date.now() }])
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    initSimulation()
  }, [initSimulation])

  const addToLog = useCallback((message, type = 'info') => {
    setAttackLog(prev => [{ message, type, time: Date.now() }, ...prev].slice(0, 12))
  }, [])

  const runAttack = useCallback(() => {
    attackCounterRef.current++

    const attackConfig = ATTACK_CONFIGS[currentAttack]
    const defenseMultiplier = getDefenseMultiplier()
    const epsilonMultiplier = Math.min(epsilon / 0.03, 3)

    const effectiveness = attackConfig.baseSuccessRate * defenseMultiplier * Math.min(epsilonMultiplier, 2)
    const success = seededRandom(attackCounterRef.current) < effectiveness

    const confidenceDrop = attackConfig.baseConfidenceDrop * defenseMultiplier * epsilonMultiplier
    const oldConfidence = currentConfidence

    if (success) {
      const newConf = Math.max(15, currentConfidence - confidenceDrop)
      setCurrentConfidence(newConf)
      setSuccessCount(prev => prev + 1)
    } else {
      setCurrentConfidence(Math.min(99, currentConfidence - confidenceDrop * 0.3))
    }
    setAttackCount(attackCounterRef.current)

    const predSeed = attackCounterRef.current
    const originalPred = generatePrediction(predSeed, false)
    const adversarialPred = generatePrediction(predSeed + 1000, true)

    setOriginalPrediction(originalPred.top)
    setPredictions(adversarialPred.all)

    const numAttacked = currentConfidence < 50
      ? Math.floor((1 - currentConfidence / 100) * 25 + 5)
      : currentConfidence < 80
        ? Math.floor((1 - currentConfidence / 100) * 15)
        : 0

    const newAttacked = new Set()
    const layers = [4, 8, 8, 6, 3]
    for (let i = 0; i < numAttacked; i++) {
      const li = Math.floor(seededRandom(attackCounterRef.current + i) * 5)
      const nodeCount = layers[li]
      const ni = Math.floor(seededRandom(attackCounterRef.current + i + 10) * nodeCount)
      newAttacked.add(`${li}-${ni}`)
    }
    setNeuralNetwork(layers.map((nodeCount, layerIndex) => {
      const x = 120 * (layerIndex + 1)
      return Array.from({ length: nodeCount }, (_, i) => ({
        x,
        y: (300 / (nodeCount + 1)) * (i + 1),
        isAttacked: newAttacked.has(`${layerIndex}-${i}`)
      })
    )}))

    const logMessage = `${currentAttack.toUpperCase()}: ${originalPred.top.label} → ${adversarialPred.top.label} (${currentConfidence.toFixed(1)}%)`
    addToLog(logMessage, success ? 'danger' : 'info')

    setConfidenceHistory(prev => {
      const newHistory = [...prev, {
        time: attackCounterRef.current,
        value: Math.min(100, Math.max(5, success ? Math.max(15, oldConfidence - confidenceDrop) : Math.min(99, oldConfidence - confidenceDrop * 0.3))),
        attack: currentAttack,
        success
      }]
      return newHistory.slice(-60)
    })
  }, [currentAttack, epsilon, currentConfidence, defenses, getDefenseMultiplier, addToLog])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(runAttack, 1500)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, runAttack])

  const toggleDefense = useCallback((defenseId) => {
    setDefenses(prev => {
      const newDefenses = { ...prev, [defenseId]: !prev[defenseId] }
      return newDefenses
    })

    const def = DEFENSE_METHODS.find(d => d.id === defenseId)
    if (def) {
      addToLog(`${def.name} ${!defenses[defenseId] ? 'enabled' : 'disabled'}`, 'info')
    }
  }, [defenses, addToLog])

  const statistics = useMemo(() => {
    const successRate = attackCount > 0 ? Math.round((successCount / attackCount) * 100) : 0
    const defenseEffectiveness = Object.keys(defenses).reduce((acc, key) => {
      const def = DEFENSE_METHODS.find(d => d.id === key)
      if (def && defenses[key]) {
        return acc + def.effectiveness * 0.25
      }
      return acc
    }, 0)

    return {
      successRate,
      attackCount,
      successCount,
      perturbation: Math.round(epsilon * 255),
      defenseEffectiveness: Math.round(defenseEffectiveness)
    }
  }, [attackCount, successCount, epsilon, defenses])

  const chartData = useMemo(() => {
    return confidenceHistory.map((point, i) => ({
      time: i,
      value: Math.min(100, Math.max(0, point.value)),
      success: point.success ? 1 : 0
    }))
  }, [confidenceHistory])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black neural-grid flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-neural-primary/30 border-t-neural-primary animate-spin mx-auto mb-4" />
          <p className="text-white/50">Initializing simulation...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <motion.div
        className="min-h-screen bg-black neural-grid p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ minHeight: '100vh' }}
      >
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="gradient-text">AdversarialX</span>
              </h1>
              <p className="text-sm text-white/50">Interactive Attack Simulation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => {
                setIsRunning(!isRunning)
                if (!isRunning) addToLog('Simulation started', 'success')
                else addToLog('Simulation paused', 'info')
              }}
              className={`glass-button flex items-center gap-2 ${isRunning ? 'border-neural-danger/50' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-neural-danger animate-pulse' : 'bg-neural-success'}`} />
              {isRunning ? 'Stop' : 'Start'}
            </motion.button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Attack Method</h3>
              <div className="space-y-2">
                {ATTACK_METHODS.map((attack) => (
                  <motion.button
                    key={attack.id}
                    onClick={() => {
                      setCurrentAttack(attack.id)
                      addToLog(`${attack.name} selected`, 'info')
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      currentAttack === attack.id
                        ? 'bg-white/10 border-neural-primary/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white">{attack.name}</span>
                        <p className="text-xs text-white/50 mt-1">{attack.description}</p>
                      </div>
                      <span className="text-xs text-white/40">{attack.speed}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Perturbation (ε)</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-white/50">Epsilon</span>
                  <span className="text-lg font-mono text-neural-primary">{epsilon.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.1"
                  step="0.001"
                  value={epsilon}
                  onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-neural-primary [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-white/30">
                  <span>Subtle (0.001)</span>
                  <span>Aggressive (0.1)</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Defense Mechanisms</h3>
              <div className="space-y-3">
                {DEFENSE_METHODS.map((defense) => (
                  <div key={defense.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex-1">
                      <span className="text-sm text-white">{defense.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${defense.effectiveness}%`,
                              backgroundColor: defenses[defense.id] ? defense.color : 'rgba(255,255,255,0.2)'
                            }}
                          />
                        </div>
                        <span className="text-xs text-white/40">{defense.effectiveness}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleDefense(defense.id)}
                      className={`w-10 h-6 rounded-full p-1 transition-colors ${defenses[defense.id] ? 'bg-neural-success' : 'bg-white/20'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${defenses[defense.id] ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-6 space-y-6">
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Neural Network State</h3>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-neural-danger animate-pulse' : 'bg-neural-success'}`} />
                  <span className="text-xs text-white/50">{isRunning ? 'Under Attack' : 'Stable'}</span>
                </div>
              </div>
              <div className="w-full h-[300px] flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
                <svg className="w-full h-full" viewBox="0 0 600 300">
                  <defs>
                    <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </radialGradient>
                    <radialGradient id="attackedGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#991b1b" />
                    </radialGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  {neuralNetwork.map((layer, li) =>
                    layer.map((node, ni) => (
                      <React.Fragment key={`${li}-${ni}`}>
                        {li < neuralNetwork.length - 1 && neuralNetwork[li + 1].map((nextNode, pni) => (
                          <line
                            key={`conn-${li}-${ni}-${pni}`}
                            x1={node.x} y1={node.y}
                            x2={nextNode.x} y2={nextNode.y}
                            stroke={node.isAttacked || nextNode.isAttacked ? 'rgba(239, 68, 68, 0.5)' : 'rgba(99, 102, 241, 0.15)'}
                            strokeWidth={node.isAttacked || nextNode.isAttacked ? 1.5 : 0.5}
                          />
                        ))}
                        <circle
                          cx={node.x} cy={node.y}
                          r={node.isAttacked ? 12 : 8}
                          fill={node.isAttacked ? 'url(#attackedGrad)' : 'url(#nodeGrad)'}
                          stroke={node.isAttacked ? '#ef4444' : 'rgba(255,255,255,0.2)'}
                          strokeWidth={node.isAttacked ? 2 : 1}
                          filter={node.isAttacked ? 'url(#glow)' : ''}
                        />
                        {node.isAttacked && (
                          <circle
                            cx={node.x} cy={node.y} r={20}
                            fill="none" stroke="#ef4444" strokeWidth="1.5"
                            opacity="0.6" className="animate-ping"
                          />
                        )}
                      </React.Fragment>
                    ))
                  )}
                </svg>
              </div>
              <div className="flex justify-around mt-4 text-xs text-white/40">
                <span>Input</span>
                <span>Hidden 1</span>
                <span>Hidden 2</span>
                <span>Hidden 3</span>
                <span>Output</span>
              </div>
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Model Confidence Over Time</h3>
                <span className={`text-2xl font-bold ${
                  currentConfidence < 50 ? 'text-neural-danger' :
                  currentConfidence < 70 ? 'text-neural-warning' : 'text-neural-success'
                }`}>
                  {Math.min(100, Math.max(0, currentConfidence)).toFixed(1)}%
                </span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <ReferenceLine y={50} stroke="rgba(239, 68, 68, 0.3)" strokeDasharray="5 5" />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#confGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-span-3 space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Attack Statistics</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/50 mb-1">Attack Success Rate</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-neural-danger">{statistics.successRate}%</span>
                    <span className="text-sm text-white/40 mb-1">({statistics.successCount}/{statistics.attackCount})</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/50 mb-1">Perturbation Level</p>
                  <span className="text-3xl font-bold text-neural-primary">{statistics.perturbation}</span>
                  <span className="text-sm text-white/40"> / 25.5</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/50 mb-1">Defense Effectiveness</p>
                  <span className="text-3xl font-bold text-neural-success">{statistics.defenseEffectiveness}%</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Classification Output</h3>
              <div className="space-y-3">
                {predictions.length > 0 ? predictions.slice(0, 5).map((pred, index) => (
                  <div
                    key={pred.label + index}
                    className={`p-3 rounded-xl ${index === 0 ? 'bg-white/10 border border-white/20' : 'bg-white/5'}`}
                  >
                    <div className="flex justify-between mb-2">
                      <span className={`text-sm ${index === 0 ? 'text-white font-medium' : 'text-white/60'}`}>
                        {pred.label}
                        {index === 0 && <span className="ml-2 text-xs text-neural-warning">Adversarial</span>}
                      </span>
                      <span className={`text-sm font-mono ${index === 0 ? 'text-neural-primary' : 'text-white/40'}`}>
                        {Math.min(100, Math.max(0, pred.confidence)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${index === 0 ? 'bg-neural-primary' : 'bg-white/30'}`}
                        animate={{ width: `${Math.min(100, Math.max(0, pred.confidence))}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="p-3 rounded-xl bg-white/5 text-white/40 text-sm">Loading predictions...</div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Attack Log</h3>
              <div className="space-y-2 max-h-[120px] overflow-y-auto font-mono text-xs">
                {attackLog.length === 0 ? (
                  <div className="p-2 rounded bg-white/5 text-white/40">[SYS] Ready for simulation</div>
                ) : (
                  attackLog.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded ${
                        log.type === 'danger' ? 'bg-neural-danger/10 text-neural-danger' :
                        log.type === 'success' ? 'bg-neural-success/10 text-neural-success' :
                        'bg-white/5 text-white/60'
                      }`}
                    >
                      [{log.type.toUpperCase()}] {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </ErrorBoundary>
  )
}

export default Dashboard

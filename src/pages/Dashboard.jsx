import React, { useState, useEffect, useRef, useCallback, useMemo, Component } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts'
import dataService from '../data/dataService'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="glass-panel p-8 max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-neural-danger/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neural-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Visualization Error</h2>
            <p className="text-white/50 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className="glass-button"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const Dashboard = ({ onBack }) => {
  console.log('[Dashboard] Component rendering')

  const [isLoading, setIsLoading] = useState(true)
  const [modelInfo, setModelInfo] = useState(null)
  const [error, setError] = useState(null)

  const [activeAttack, setActiveAttack] = useState('fgsm')
  const [epsilon, setEpsilon] = useState(0.03)
  const [isRunning, setIsRunning] = useState(false)
  const [currentConfidence, setCurrentConfidence] = useState(97.2)
  const [confidenceHistory, setConfidenceHistory] = useState([])
  const [attackSuccess, setAttackSuccess] = useState(0)
  const [predictions, setPredictions] = useState([])
  const [attackedNodes, setAttackedNodes] = useState(new Set())
  const [defenses, setDefenses] = useState([
    { name: 'Adversarial Training', effectiveness: 78, enabled: false },
    { name: 'Input Preprocessing', effectiveness: 45, enabled: true },
    { name: 'Defensive Distillation', effectiveness: 62, enabled: false },
    { name: 'Feature Squeezing', effectiveness: 55, enabled: true },
  ])
  const [attackLog, setAttackLog] = useState([])

  const intervalRef = useRef(null)
  const streamRef = useRef(null)

  const attacks = useMemo(() => [
    { id: 'fgsm', name: 'FGSM', description: 'Fast Gradient Sign Method', color: '#ef4444' },
    { id: 'pgd', name: 'PGD', description: 'Projected Gradient Descent', color: '#f59e0b' },
    { id: 'cw', name: 'C&W', description: 'Carlini & Wagner L2', color: '#8b5cf6' },
    { id: 'deepfool', name: 'DeepFool', description: 'Minimal Perturbation', color: '#06b6d4' },
  ], [])

  const addToLog = useCallback((message, type = 'info') => {
    setAttackLog(prev => [
      { message, type, time: Date.now() },
      ...prev
    ].slice(0, 10))
  }, [])

  const runAttack = useCallback(async () => {
    try {
      console.log(`[Dashboard] Running ${activeAttack} attack with epsilon=${epsilon}`)
      addToLog(`${activeAttack.toUpperCase()} attack started (ε=${epsilon.toFixed(3)})`, 'attack')

      const result = await dataService.executeAttack(activeAttack, epsilon, null)

      console.log('[Dashboard] Attack result:', result)

      const newConfidence = result.predictions?.[0]?.confidence || 97.2
      setCurrentConfidence(newConfidence)

      setConfidenceHistory(prev => {
        const newPoint = { time: prev.length, value: newConfidence }
        return [...prev, newPoint].slice(-50)
      })

      if (result.predictions) {
        setPredictions(result.predictions)
      }

      if (newConfidence < 50) {
        setAttackSuccess(prev => Math.min(100, prev + 5))
        addToLog(`Confidence dropped to ${newConfidence.toFixed(1)}%`, 'danger')

        const newAttacked = new Set()
        const layers = [4, 8, 8, 6, 3]
        layers.forEach((_, li) => {
          layers[li].forEach((_, ni) => {
            if (Math.random() > 0.3) newAttacked.add(`${li}-${ni}`)
          })
        })
        setAttackedNodes(newAttacked)
      } else if (newConfidence < 70) {
        const newAttacked = new Set()
        const numAttacked = Math.floor((newConfidence / 100) * 10)
        for (let i = 0; i < numAttacked; i++) {
          const li = Math.floor(Math.random() * 5)
          const ni = Math.floor(Math.random() * (li === 0 ? 4 : li === 1 || li === 2 ? 8 : li === 3 ? 6 : 3))
          newAttacked.add(`${li}-${ni}`)
        }
        setAttackedNodes(newAttacked)
      } else {
        setAttackedNodes(new Set())
      }

      if (result.success) {
        addToLog(`SUCCESS: ${result.predictions?.[0]?.label || 'unknown'} confidence at ${newConfidence.toFixed(1)}%`, 'danger')
      } else {
        addToLog(`Confidence: ${newConfidence.toFixed(1)}%`, 'info')
      }

    } catch (err) {
      console.error('[Dashboard] Attack error:', err)
      addToLog(`Error: ${err.message}`, 'danger')
    }
  }, [activeAttack, epsilon, addToLog])

  const toggleDefense = useCallback((index) => {
    setDefenses(prev => {
      const newDefenses = [...prev]
      newDefenses[index] = { ...newDefenses[index], enabled: !newDefenses[index].enabled }
      return newDefenses
    })
    addToLog(`${defenses[index].name} ${defenses[index].enabled ? 'disabled' : 'enabled'}`, 'info')
  }, [defenses, addToLog])

  useEffect(() => {
    console.log('[Dashboard] Mounting...')
    
    const initDashboard = async () => {
      try {
        addToLog('Initializing TensorFlow.js model...', 'info')

        const defenseData = await dataService.fetchDefenseMetrics()
        if (defenseData.defenses) {
          setDefenses(defenseData.defenses)
        }

        const initialPrediction = await dataService.fetchPrediction(null, null)
        if (initialPrediction.predictions) {
          setPredictions(initialPrediction.predictions)
          setCurrentConfidence(initialPrediction.predictions[0]?.confidence || 97.2)
        }

        addToLog('Model loaded. Ready to simulate attacks.', 'success')
        setIsLoading(false)
        console.log('[Dashboard] Initialization complete')
      } catch (err) {
        console.error('[Dashboard] Init error:', err)
        addToLog(`Init error: ${err.message}`, 'danger')
        setIsLoading(false)
      }
    }

    initDashboard()

    return () => {
      console.log('[Dashboard] Unmounting...')
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) streamRef.current.close()
    }
  }, [addToLog])

  useEffect(() => {
    if (isRunning) {
      console.log('[Dashboard] Starting attack simulation')
      addToLog('Attack simulation started', 'info')

      intervalRef.current = setInterval(async () => {
        await runAttack()
      }, 2000)
    } else {
      console.log('[Dashboard] Stopping attack simulation')
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      addToLog('Attack simulation paused', 'info')
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, runAttack, addToLog])

  if (isLoading) {
    console.log('[Dashboard] Showing loading state')
    return (
      <div className="min-h-screen bg-black neural-grid flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-neural-primary/30 border-t-neural-primary animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading TensorFlow.js model...</p>
          <p className="text-white/30 text-sm mt-2">Downloading MobileNet (~10MB)</p>
        </div>
      </div>
    )
  }

  console.log('[Dashboard] Rendering main content')
  return (
    <ErrorBoundary>
      <motion.div
        className="min-h-screen bg-black neural-grid p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ minHeight: '100vh' }}
      >
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="gradient-text">AdversarialX</span> Dashboard
              </h1>
              <p className="text-sm text-white/50">TensorFlow.js Real-time Attack Simulation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => setIsRunning(!isRunning)}
              className={`glass-button flex items-center gap-2 ${isRunning ? 'border-neural-danger/50' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-neural-danger animate-pulse"></span>
                  Stop Attack
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-neural-success"></span>
                  Start Attack
                </>
              )}
            </motion.button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Attack Method</h3>
              <div className="space-y-2">
                {attacks.map((attack) => (
                  <motion.button
                    key={attack.id}
                    onClick={() => setActiveAttack(attack.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      activeAttack === attack.id
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
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: attack.color }}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Perturbation Strength</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-white/50">Epsilon (ε)</span>
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
                  <span>Subtle</span>
                  <span>Aggressive</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Defense Mechanisms</h3>
              <div className="space-y-3">
                {defenses.map((defense, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex-1">
                      <span className="text-sm text-white">{defense.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neural-success rounded-full transition-all duration-300"
                            style={{ width: `${defense.effectiveness}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/40">{defense.effectiveness}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleDefense(index)}
                      className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                        defense.enabled ? 'bg-neural-success' : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        defense.enabled ? 'translate-x-4' : ''
                      }`} />
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
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-neural-danger animate-pulse' : 'bg-neural-success'}`}></span>
                  <span className="text-xs text-white/50">{isRunning ? 'Under Attack' : 'Stable'}</span>
                </div>
              </div>
              <div className="w-full h-[300px] flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
                <svg className="w-full h-full" viewBox="0 0 600 300">
                  <defs>
                    <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </radialGradient>
                    <radialGradient id="attackedGradient" cx="50%" cy="50%" r="50%">
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
                  {(() => {
                    const layers = [4, 8, 8, 6, 3]
                    const layerSpacing = 600 / (layers.length + 1)
                    const nodePositions = layers.map((nodeCount, layerIndex) => {
                      const x = layerSpacing * (layerIndex + 1)
                      return Array.from({ length: nodeCount }, (_, i) => ({
                        x,
                        y: (300 / (nodeCount + 1)) * (i + 1),
                        isAttacked: attackedNodes.has(`${layerIndex}-${i}`) || (isRunning && Math.random() > 0.9)
                      }))
                    })
                    return (
                      <>
                        {nodePositions.map((layer, li) =>
                          layer.map((node, ni) => (
                            <g key={`${li}-${ni}`}>
                              {li < layers.length - 1 && nodePositions[li + 1].map((nextNode, pni) => (
                                <line
                                  key={`conn-${li}-${ni}-${pni}`}
                                  x1={node.x}
                                  y1={node.y}
                                  x2={nextNode.x}
                                  y2={nextNode.y}
                                  stroke={node.isAttacked || nextNode.isAttacked ? 'rgba(239, 68, 68, 0.4)' : 'rgba(99, 102, 241, 0.15)'}
                                  strokeWidth={node.isAttacked || nextNode.isAttacked ? '1.5' : '0.5'}
                                />
                              ))}
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.isAttacked ? 12 : 8}
                                fill={node.isAttacked ? 'url(#attackedGradient)' : 'url(#nodeGradient)'}
                                stroke={node.isAttacked ? '#ef4444' : 'rgba(255,255,255,0.2)'}
                                strokeWidth={node.isAttacked ? 2 : 1}
                                filter={node.isAttacked ? 'url(#glow)' : ''}
                                className={node.isAttacked ? 'animate-pulse' : ''}
                              />
                              {node.isAttacked && (
                                <circle
                                  cx={node.x}
                                  cy={node.y}
                                  r={20}
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="1.5"
                                  opacity="0.6"
                                  className="animate-ping"
                                />
                              )}
                            </g>
                          ))
                        )}
                      </>
                    )
                  })()}
                </svg>
              </div>
              <div className="flex justify-around mt-4 text-xs text-white/40">
                <span>Input Layer</span>
                <span>Hidden Layers</span>
                <span>Output Layer</span>
              </div>
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Model Confidence Over Time</h3>
                <span className={`text-2xl font-bold ${currentConfidence < 50 ? 'text-neural-danger' : 'text-neural-success'}`}>
                  {currentConfidence.toFixed(1)}%
                </span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={confidenceHistory}>
                    <defs>
                      <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#confidenceGradient)"
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
                    <span className="text-3xl font-bold text-neural-danger">{attackSuccess.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/50 mb-1">Perturbation Magnitude</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-neural-primary">{(epsilon * 255).toFixed(1)}</span>
                    <span className="text-sm text-white/40 mb-1">/ 255</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/50 mb-1">Iterations</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-neural-cyan">{confidenceHistory.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Classification Output</h3>
              <div className="space-y-3">
                {(predictions.length > 0 ? predictions : [
                  { label: 'tench', confidence: 97.2, original: true },
                  { label: '-', confidence: 0, original: false },
                  { label: '-', confidence: 0, original: false }
                ]).slice(0, 5).map((item, index) => (
                  <div key={item.label + index} className={`p-3 rounded-xl ${index === 0 ? 'bg-white/10 border border-white/20' : 'bg-white/5'}`}>
                    <div className="flex justify-between mb-2">
                      <span className={`text-sm ${index === 0 ? 'text-white font-medium' : 'text-white/60'}`}>
                        {item.label}
                        {item.original && index === 0 && <span className="ml-2 text-xs text-neural-success">✓ Original</span>}
                        {index === 0 && !item.original && <span className="ml-2 text-xs text-neural-warning">New Top</span>}
                      </span>
                      <span className={`text-sm font-mono ${index === 0 ? 'text-neural-primary' : 'text-white/40'}`}>
                        {item.confidence > 0 ? `${item.confidence.toFixed(1)}%` : '-'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${index === 0 ? 'bg-neural-primary' : 'bg-white/30'}`}
                        animate={{ width: `${item.confidence || 0}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Attack Log</h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto font-mono text-xs">
                {attackLog.length === 0 ? (
                  <div className="p-2 rounded bg-white/5 text-white/40">
                    [SYS] Ready for attack simulation
                  </div>
                ) : (
                  attackLog.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded ${
                        log.type === 'danger' ? 'bg-neural-danger/10 text-neural-danger' :
                        log.type === 'success' ? 'bg-neural-success/10 text-neural-success' :
                        log.type === 'attack' ? 'bg-neural-warning/10 text-neural-warning' :
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

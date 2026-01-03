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
  const [error, setError] = useState(null)

  const [activeAttack, setActiveAttack] = useState('fgsm')
  const [epsilon, setEpsilon] = useState(0.03)
  const [isRunning, setIsRunning] = useState(true)
  const [currentConfidence, setCurrentConfidence] = useState(97.2)
  const [confidenceHistory, setConfidenceHistory] = useState([])
  const [attackSuccess, setAttackSuccess] = useState(0)
  const [defenses, setDefenses] = useState([
    { name: 'Adversarial Training', effectiveness: 78, enabled: false },
    { name: 'Input Preprocessing', effectiveness: 45, enabled: true },
    { name: 'Defensive Distillation', effectiveness: 62, enabled: false },
    { name: 'Feature Squeezing', effectiveness: 55, enabled: true },
  ])

  const intervalRef = useRef(null)

  const attacks = useMemo(() => [
    { id: 'fgsm', name: 'FGSM', description: 'Fast Gradient Sign Method', color: '#ef4444' },
    { id: 'pgd', name: 'PGD', description: 'Projected Gradient Descent', color: '#f59e0b' },
    { id: 'cw', name: 'C&W', description: 'Carlini & Wagner L2', color: '#8b5cf6' },
    { id: 'deepfool', name: 'DeepFool', description: 'Minimal Perturbation', color: '#06b6d4' },
  ], [])

  useEffect(() => {
    console.log('[Dashboard] Mounting...')
    const timer = setTimeout(() => {
      console.log('[Dashboard] Loading complete')
      setIsLoading(false)
    }, 1000)
    return () => {
      console.log('[Dashboard] Unmounting...')
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!isRunning || isLoading) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      const degradation = epsilon * 800
      const noise = (Math.random() - 0.5) * 10
      const defenseBoost = defenses.filter(d => d.enabled).reduce((acc, d) => acc + d.effectiveness * 0.1, 0)
      const newConfidence = Math.max(5, Math.min(100, 97.2 - degradation + noise + defenseBoost))
      
      setCurrentConfidence(newConfidence)
      setConfidenceHistory(prev => {
        const newPoint = { time: prev.length, value: newConfidence }
        return [...prev, newPoint].slice(-50)
      })
      
      if (newConfidence < 50) {
        setAttackSuccess(prev => Math.min(100, prev + 0.5))
      }
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, epsilon, defenses, isLoading])

  const mockPredictions = useMemo(() => [
    { label: 'Panda', confidence: currentConfidence, original: true },
    { label: 'Gibbon', confidence: Math.min(90, 100 - currentConfidence + Math.random() * 10), original: false },
    { label: 'Macaque', confidence: Math.random() * 15, original: false },
  ].sort((a, b) => b.confidence - a.confidence), [currentConfidence])

  if (isLoading) {
    console.log('[Dashboard] Showing loading state')
    return (
      <div className="min-h-screen bg-black neural-grid flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-neural-primary/30 border-t-neural-primary animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading visualization...</p>
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
              <p className="text-sm text-white/50">Real-time attack simulation and analysis</p>
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
                            className="h-full bg-neural-success rounded-full"
                            style={{ width: `${defense.effectiveness}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/40">{defense.effectiveness}%</span>
                      </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                      defense.enabled ? 'bg-neural-success' : 'bg-white/20'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        defense.enabled ? 'translate-x-4' : ''
                      }`} />
                    </div>
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
                  </defs>
                  {[[4, 8, 8, 6, 3]].map((layers, layerIndex) => {
                    const layerSpacing = 600 / (layers.length + 1)
                    return layers.map((nodeCount, li) => {
                      const x = layerSpacing * (li + 1)
                      return Array.from({ length: nodeCount }).map((_, ni) => {
                        const y = (300 / (nodeCount + 1)) * (ni + 1)
                        const isAttacked = isRunning && Math.random() > 0.7
                        return (
                          <g key={`${li}-${ni}`}>
                            {Array.from({ length: nodeCount }).map((_, pni) => {
                              const px = layerSpacing * (li + 1)
                              const py = (300 / (nodeCount + 1)) * (pni + 1)
                              if (li === layers.length - 1) return null
                              return (
                                <line
                                  key={`conn-${li}-${ni}-${pni}`}
                                  x1={x}
                                  y1={y}
                                  x2={px}
                                  y2={py}
                                  stroke="rgba(99, 102, 241, 0.15)"
                                  strokeWidth="0.5"
                                />
                              )
                            })}
                            <circle
                              cx={x}
                              cy={y}
                              r={isAttacked ? 10 : 8}
                              fill={isAttacked ? 'url(#attackedGradient)' : 'url(#nodeGradient)'}
                              stroke={isAttacked ? '#ef4444' : 'rgba(255,255,255,0.2)'}
                              strokeWidth={isAttacked ? 2 : 1}
                            />
                            {isAttacked && (
                              <circle
                                cx={x}
                                cy={y}
                                r={15}
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="1"
                                opacity="0.5"
                              />
                            )}
                          </g>
                        )
                      })
                    })
                  })}
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
                {mockPredictions.map((item, index) => (
                  <div key={item.label} className={`p-3 rounded-xl ${index === 0 ? 'bg-white/10 border border-white/20' : 'bg-white/5'}`}>
                    <div className="flex justify-between mb-2">
                      <span className={`text-sm ${index === 0 ? 'text-white font-medium' : 'text-white/60'}`}>
                        {item.label}
                        {item.original && index === 0 && <span className="ml-2 text-xs text-neural-success">✓</span>}
                      </span>
                      <span className={`text-sm font-mono ${index === 0 ? 'text-neural-primary' : 'text-white/40'}`}>
                        {item.confidence.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${index === 0 ? 'bg-neural-primary' : 'bg-white/30'}`}
                        animate={{ width: `${item.confidence}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Attack Log</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto font-mono text-xs">
                {isRunning && (
                  <>
                    <div className="p-2 rounded bg-neural-danger/10 text-neural-danger">
                      [ATTACK] {activeAttack.toUpperCase()} perturbation applied (ε={epsilon.toFixed(3)})
                    </div>
                    <div className="p-2 rounded bg-white/5 text-white/60">
                      [INFO] Confidence dropped to {currentConfidence.toFixed(1)}%
                    </div>
                    <div className="p-2 rounded bg-neural-warning/10 text-neural-warning">
                      [WARN] Classification boundary approached
                    </div>
                  </>
                )}
                <div className="p-2 rounded bg-white/5 text-white/40">
                  [SYS] Attack simulation initialized
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </ErrorBoundary>
  )
}

export default Dashboard

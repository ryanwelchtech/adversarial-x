import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'

const LandingPage = ({ onEnterDashboard }) => {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isReady, setIsReady] = useState(false)

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50])

  // Defer animations until after first paint
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReady(true)
      })
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  useEffect(() => {
    if (!isReady) return
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isReady])

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
      title: 'Neural Network Visualization',
      description: 'Explore deep learning architectures layer by layer with interactive 3D visualization.'
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      ),
      title: 'Real-time Attacks',
      description: 'Watch adversarial perturbations manipulate model predictions in real-time.'
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      title: 'Defense Mechanisms',
      description: 'Compare adversarial training, input preprocessing, and certified defenses.'
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      ),
      title: 'Confidence Analysis',
      description: 'Monitor model confidence degradation as epsilon values increase.'
    },
  ]

  const attackTypes = [
    { name: 'FGSM', epsilon: '0.03', successRate: 94 },
    { name: 'PGD', epsilon: '0.01', successRate: 98 },
    { name: 'C&W', epsilon: 'L2', successRate: 99 },
    { name: 'DeepFool', epsilon: 'Min', successRate: 97 },
  ]

  // Loading skeleton component
  if (!isReady) {
    return (
      <div className="min-h-screen bg-black neural-grid flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-neural-primary to-neural-accent flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"/>
              <circle cx="6" cy="16" r="3"/>
              <circle cx="18" cy="16" r="3"/>
              <line x1="12" y1="12" x2="8" y2="14"/>
              <line x1="12" y1="12" x2="16" y2="14"/>
            </svg>
          </div>
          <div className="h-6 w-48 mx-auto bg-white/5 rounded-lg animate-pulse mb-3"></div>
          <div className="h-4 w-32 mx-auto bg-white/5 rounded-lg animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      ref={containerRef}
      className="min-h-screen bg-black neural-grid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Floating Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="hero-glow bg-neural-primary"
          style={{
            left: '10%',
            top: '20%',
            x: mousePosition.x * 0.5,
            y: mousePosition.y * 0.5,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="hero-glow bg-neural-accent"
          style={{
            right: '10%',
            top: '40%',
            x: mousePosition.x * -0.3,
            y: mousePosition.y * -0.3,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="hero-glow bg-pink-500"
          style={{
            left: '50%',
            bottom: '10%',
            x: mousePosition.x * 0.2,
            y: mousePosition.y * 0.2,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="glass-panel px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neural-primary to-neural-accent flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/>
                  <circle cx="6" cy="16" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                  <line x1="12" y1="12" x2="8" y2="14"/>
                  <line x1="12" y1="12" x2="16" y2="14"/>
                </svg>
              </div>
              <span className="text-xl font-semibold tracking-tight">AdversarialX</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">Features</a>
              <a href="#attacks" className="text-sm text-white/60 hover:text-white transition-colors">Attack Types</a>
              <a href="#demo" className="text-sm text-white/60 hover:text-white transition-colors">Live Demo</a>
            </div>
            <motion.button
              onClick={onEnterDashboard}
              className="glass-button text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Launch Platform
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        className="min-h-screen flex items-center justify-center px-6 pt-24"
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
      >
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-8">
              <span className="w-2 h-2 rounded-full bg-neural-primary animate-pulse"></span>
              AI Security Research Platform
            </span>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-8xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <span className="gradient-text">Adversarial</span>
            <span className="text-white">X</span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Explore the vulnerabilities of neural networks through interactive adversarial attack simulations.
            <span className="text-white/70"> Visualize perturbations, defense mechanisms, and model robustness in real-time.</span>
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <motion.button
              onClick={onEnterDashboard}
              className="glass-button flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Start Simulation</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </motion.button>
            <motion.button
              className="glass-button glass-button-secondary flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10,8 16,12 10,16" fill="currentColor"/>
              </svg>
              <span>Watch Demo</span>
            </motion.button>
          </motion.div>

          {/* Floating Neural Network Visualization */}
          <motion.div
            className="mt-20 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <div className="glass-panel p-8 max-w-4xl mx-auto">
              <NeuralNetworkViz />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="gradient-text-cyan">Powerful</span> Analysis Tools
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Everything you need to understand and visualize adversarial machine learning attacks.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="glass-card p-6"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neural-primary/20 to-neural-accent/20 flex items-center justify-center text-neural-primary mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Attack Types Section */}
      <section id="attacks" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="gradient-text">Attack</span> Methodologies
              </h2>
              <p className="text-lg text-white/50 mb-8">
                Simulate industry-standard adversarial attacks and observe their effects on model predictions.
              </p>

              <div className="space-y-4">
                {attackTypes.map((attack, index) => (
                  <motion.div
                    key={attack.name}
                    className="glass-card p-5"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neural-danger/20 to-neural-warning/20 flex items-center justify-center">
                          <span className="text-neural-danger font-bold text-sm">{attack.name}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{attack.name} Attack</h4>
                          <p className="text-xs text-white/50">ε = {attack.epsilon}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-neural-danger">{attack.successRate}%</span>
                        <p className="text-xs text-white/40">Success Rate</p>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-neural-danger to-neural-warning rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${attack.successRate}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="glass-panel p-8"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <PerturbationDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="demo" className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="glass-panel p-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to <span className="gradient-text">Explore?</span>
            </h2>
            <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto">
              Launch the interactive platform and start simulating adversarial attacks on neural networks.
            </p>
            <motion.button
              onClick={onEnterDashboard}
              className="glass-button text-lg px-10 py-5"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Launch AdversarialX Platform
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neural-primary to-neural-accent flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/>
                <circle cx="6" cy="16" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <span className="text-sm text-white/50">AdversarialX</span>
          </div>
          <p className="text-sm text-white/30">
            Built by <a href="https://ryanwelchtech.com" className="text-white/50 hover:text-white transition-colors">Ryan Welch</a>
          </p>
        </div>
      </footer>
    </motion.div>
  )
}

// Neural Network Visualization Component
const NeuralNetworkViz = () => {
  const [activeLayer, setActiveLayer] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLayer((prev) => (prev + 1) % 4)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const layers = [
    { nodes: 4, label: 'Input' },
    { nodes: 6, label: 'Hidden 1' },
    { nodes: 6, label: 'Hidden 2' },
    { nodes: 3, label: 'Output' },
  ]

  return (
    <div className="relative h-64">
      <svg className="w-full h-full" viewBox="0 0 600 200">
        {/* Connections */}
        {layers.slice(0, -1).map((layer, layerIndex) => {
          const nextLayer = layers[layerIndex + 1]
          const x1 = 80 + layerIndex * 160
          const x2 = 80 + (layerIndex + 1) * 160

          return layer.nodes > 0 && nextLayer.nodes > 0 ? (
            <g key={`connections-${layerIndex}`}>
              {Array.from({ length: layer.nodes }).map((_, i) => {
                const y1 = 100 - ((layer.nodes - 1) * 25) / 2 + i * 25
                return Array.from({ length: nextLayer.nodes }).map((_, j) => {
                  const y2 = 100 - ((nextLayer.nodes - 1) * 25) / 2 + j * 25
                  const isActive = activeLayer === layerIndex || activeLayer === layerIndex + 1
                  return (
                    <motion.line
                      key={`${layerIndex}-${i}-${j}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isActive ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)'}
                      strokeWidth={isActive ? 1.5 : 0.5}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: layerIndex * 0.2 }}
                    />
                  )
                })
              })}
            </g>
          ) : null
        })}

        {/* Nodes */}
        {layers.map((layer, layerIndex) => {
          const x = 80 + layerIndex * 160
          return (
            <g key={`layer-${layerIndex}`}>
              {Array.from({ length: layer.nodes }).map((_, i) => {
                const y = 100 - ((layer.nodes - 1) * 25) / 2 + i * 25
                const isActive = activeLayer === layerIndex
                return (
                  <motion.circle
                    key={`${layerIndex}-${i}`}
                    cx={x}
                    cy={y}
                    r={isActive ? 10 : 8}
                    fill={isActive ? 'url(#nodeGradient)' : 'rgba(255, 255, 255, 0.1)'}
                    stroke={isActive ? '#6366f1' : 'rgba(255, 255, 255, 0.2)'}
                    strokeWidth={2}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: layerIndex * 0.1 + i * 0.05 }}
                  />
                )
              })}
              <text
                x={x}
                y={185}
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="11"
                fontFamily="system-ui"
              >
                {layer.label}
              </text>
            </g>
          )
        })}

        {/* Gradient Definition */}
        <defs>
          <radialGradient id="nodeGradient">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </radialGradient>
        </defs>
      </svg>

      {/* Attack Indicator */}
      <motion.div
        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-neural-danger/20 border border-neural-danger/30"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="w-2 h-2 rounded-full bg-neural-danger animate-pulse"></span>
        <span className="text-xs text-neural-danger font-medium">Attack Active</span>
      </motion.div>
    </div>
  )
}

// Perturbation Demo Component
const PerturbationDemo = () => {
  const [epsilon, setEpsilon] = useState(0)
  const [confidence, setConfidence] = useState(98.7)

  useEffect(() => {
    const interval = setInterval(() => {
      setEpsilon((prev) => {
        const next = prev + 0.5
        if (next > 10) return 0
        return next
      })
    }, 200)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const baseConfidence = 98.7
    const degradation = epsilon * 8
    setConfidence(Math.max(5, baseConfidence - degradation + Math.random() * 5))
  }, [epsilon])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Perturbation Effect</h3>
        <span className="text-xs text-white/40">Live Simulation</span>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-white/50 mb-3">Original Image</p>
          <div className="aspect-square bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center">
            <svg className="w-20 h-20 text-white/20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
            </svg>
          </div>
          <div className="mt-3 text-center">
            <span className="text-sm text-neural-success font-medium">Panda</span>
            <span className="text-xs text-white/40 ml-2">98.7%</span>
          </div>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-white/50 mb-3">Adversarial Image</p>
          <div
            className="aspect-square bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{
              filter: `contrast(${1 + epsilon * 0.02}) saturate(${1 - epsilon * 0.05})`,
            }}
          >
            <svg className="w-20 h-20 text-white/20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
            </svg>
            {/* Noise Overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${0.5 + epsilon * 0.1}' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
          <div className="mt-3 text-center">
            <span className={`text-sm font-medium ${confidence < 50 ? 'text-neural-danger' : 'text-neural-warning'}`}>
              {confidence < 30 ? 'Gibbon' : confidence < 60 ? 'Uncertain' : 'Panda'}
            </span>
            <span className="text-xs text-white/40 ml-2">{confidence.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Epsilon Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Perturbation Epsilon</span>
          <span className="text-neural-primary font-mono">{(epsilon / 100).toFixed(3)}</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-neural-primary to-neural-danger rounded-full"
            style={{ width: `${epsilon * 10}%` }}
          />
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Model Confidence</span>
          <span className={`font-mono ${confidence < 50 ? 'text-neural-danger' : 'text-neural-success'}`}>
            {confidence.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${confidence < 50 ? 'bg-neural-danger' : 'bg-neural-success'}`}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}

export default LandingPage

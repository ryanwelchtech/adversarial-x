import { motion } from 'framer-motion'

// Apple-style skeleton loading states
export const SkeletonPulse = ({ className = '' }) => (
  <motion.div
    className={`bg-white/5 rounded-xl ${className}`}
    animate={{ opacity: [0.5, 0.8, 0.5] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
  />
)

export const SkeletonCard = () => (
  <div className="glass-card p-6 space-y-4">
    <div className="flex items-center gap-4">
      <SkeletonPulse className="w-14 h-14" />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="h-4 w-3/4" />
        <SkeletonPulse className="h-3 w-1/2" />
      </div>
    </div>
    <SkeletonPulse className="h-20 w-full" />
  </div>
)

export const SkeletonChart = () => (
  <div className="glass-panel p-6">
    <div className="flex justify-between mb-4">
      <SkeletonPulse className="h-4 w-32" />
      <SkeletonPulse className="h-6 w-16" />
    </div>
    <SkeletonPulse className="h-48 w-full" />
  </div>
)

export const SkeletonNetwork = () => (
  <div className="glass-panel p-6">
    <SkeletonPulse className="h-4 w-40 mb-4" />
    <div className="flex justify-center items-center h-64 gap-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex flex-col items-center gap-2">
          {[1, 2, 3].map(j => (
            <SkeletonPulse key={j} className="w-4 h-4 rounded-full" />
          ))}
        </div>
      ))}
    </div>
  </div>
)

export default { SkeletonPulse, SkeletonCard, SkeletonChart, SkeletonNetwork }

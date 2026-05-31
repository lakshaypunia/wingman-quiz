'use client'

import { motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'

export default function AdvanceCountdown({ winnerId }: { winnerId: string }) {
  const players = useGameStore((s) => s.players)
  const winnerName = players[winnerId]?.username ?? winnerId

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="mt-4 overflow-hidden rounded-2xl border"
      style={{
        background: 'rgba(22,163,74,0.08)',
        borderColor: 'rgba(22,163,74,0.3)',
      }}
    >
      {/* Winner banner */}
      <div className="flex items-center gap-3 px-5 py-3">
        <motion.span
          animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-2xl"
        >
          🏆
        </motion.span>
        <div>
          <p className="font-heading text-base font-semibold" style={{ color: '#16a34a' }}>
            {winnerName} got it first!
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Next question loading…
          </p>
        </div>
      </div>

      {/* 3-second depleting bar */}
      <div className="h-1.5 w-full" style={{ background: 'rgba(22,163,74,0.15)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #16a34a, #86efac)', transformOrigin: 'left' }}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 3, ease: 'linear' }}
        />
      </div>
    </motion.div>
  )
}

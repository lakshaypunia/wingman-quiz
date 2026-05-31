'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'

const COLORS = ['#e91e8c', '#7c3aed', '#0891b2', '#65a30d', '#ea580c']
function pColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function ScoreStrip() {
  const players        = useGameStore((s) => s.players)
  const playerProgress = useGameStore((s) => s.playerProgress)
  const currentIdx     = useGameStore((s) => s.currentGlobalQuestion)
  const questions      = useGameStore((s) => s.questions)
  const hostIdentity   = useGameStore((s) => s.hostIdentity)

  const entries = Object.entries(players)

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(124,58,237,0.12)',
      }}
    >
      {/* Scores */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {entries.map(([id, info]) => {
          const score  = playerProgress[id]?.score ?? 0
          const color  = pColor(id)
          const isHost = id === hostIdentity

          return (
            <div key={id} className="flex items-center gap-1.5">
              {/* Avatar */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
              >
                {info.username.slice(0, 1).toUpperCase()}
              </div>

              <div>
                <span className="font-heading text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {info.username}
                </span>
                {isHost && (
                  <span className="ml-1 text-xs" style={{ color: 'var(--pink)' }}>👑</span>
                )}
              </div>

              {/* Animated score */}
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={score}
                  initial={{ scale: 0.7, opacity: 0, y: -6 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  className="font-heading text-sm font-bold"
                  style={{ color, minWidth: '3ch', display: 'inline-block' }}
                >
                  {score.toLocaleString()}
                </motion.span>
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Question counter */}
      <div
        className="shrink-0 rounded-full px-3 py-1 font-heading text-xs font-semibold"
        style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--purple)' }}
      >
        Q {Math.min(currentIdx + 1, questions.length)} / {questions.length}
      </div>
    </div>
  )
}

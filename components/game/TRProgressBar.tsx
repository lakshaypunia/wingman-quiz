'use client'

import { motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'

const COLORS = ['#e91e8c', '#7c3aed', '#0891b2', '#65a30d', '#ea580c']
function pColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function TRProgressBar({ localIdx }: { localIdx: number }) {
  const players   = useGameStore((s) => s.players)
  const progress  = useGameStore((s) => s.playerProgress)
  const questions = useGameStore((s) => s.questions)
  const session   = useGameStore((s) => s.session)
  const total     = questions.length || 1

  const entries = Object.entries(players)

  return (
    <div
      className="mx-4 mb-4 rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(124,58,237,0.12)',
        boxShadow: '0 2px 16px rgba(124,58,237,0.06)',
      }}
    >
      <p className="font-heading text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
        🏁 Race Progress
      </p>

      <div className="space-y-3">
        {entries.map(([id, info]) => {
          const isMe = id === session?.username
          // Use local idx for the current player (more accurate than broadcast)
          const qIdx  = isMe ? localIdx : (progress[id]?.currentQuestionIndex ?? 0)
          const done  = isMe ? localIdx >= total : (progress[id]?.done ?? false)
          const pct   = Math.min(1, qIdx / total)
          const color = pColor(id)

          return (
            <div key={id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full font-heading text-xs font-bold text-white"
                    style={{ background: color }}
                  >
                    {info.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-heading text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {info.username}
                    {isMe && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>(you)</span>}
                  </span>
                </div>
                <span className="font-heading text-xs" style={{ color: 'var(--text-muted)' }}>
                  {done ? '✅ Done' : `Q ${Math.min(qIdx + 1, total)} / ${total}`}
                </span>
              </div>

              {/* Progress track */}
              <div
                className="relative h-2.5 w-full overflow-hidden rounded-full"
                style={{ background: `${color}18` }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
                  animate={{ width: `${pct * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
                {/* Avatar dot */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white shadow-md"
                  style={{ background: color }}
                  animate={{ left: `calc(${pct * 100}% - 8px)` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

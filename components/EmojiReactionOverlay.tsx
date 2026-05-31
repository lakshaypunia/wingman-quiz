'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'

export default function EmojiReactionOverlay() {
  const reactions = useGameStore((s) => s.activeEmojiReactions)

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 200 }}
      aria-hidden
    >
      <AnimatePresence>
        {reactions.map((r) => {
          const fromLeft = r.side === 'left'

          return (
            <motion.div
              key={r.id}
              initial={{
                opacity: 0,
                scale: 0.2,
                x: fromLeft ? -80 : 80,
                y: 0,
                rotate: fromLeft ? -30 : 30,
              }}
              animate={{
                opacity:  [0,   1,    1,    1,    0],
                scale:    [0.2, 1.5,  1.25, 1.0,  0.6],
                x:        fromLeft
                  ? [-80,  30,   55,   70,   80]
                  : [ 80, -30,  -55,  -70,  -80],
                y:        [0,  -80, -170, -260, -330],
                rotate:   fromLeft
                  ? [-30,  12,  -8,    5,   -2]
                  : [ 30, -12,   8,   -5,    2],
              }}
              transition={{
                duration: 2.5,
                ease: 'easeOut',
                times: [0, 0.18, 0.45, 0.75, 1],
              }}
              style={{
                position:   'fixed',
                [fromLeft ? 'left' : 'right']: '14px',
                bottom:     `${r.bottomPercent}%`,
                fontSize:   `${r.size}px`,
                lineHeight: 1,
                userSelect: 'none',
                willChange: 'transform, opacity',
                filter:     'drop-shadow(0 3px 10px rgba(0,0,0,0.18))',
              }}
            >
              {r.emoji}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

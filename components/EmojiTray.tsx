'use client'

import { useDataChannel } from '@livekit/components-react'
import { useLocalParticipant } from '@livekit/components-react'
import { motion } from 'framer-motion'
import type { GameMessage } from '@/types/game'

const EMOJIS: { emoji: string; label: string; color: string }[] = [
  { emoji: '🔥', label: 'Fire',   color: '#ea580c' },
  { emoji: '🎯', label: 'Target', color: '#e91e8c' },
  { emoji: '🧠', label: 'Brain',  color: '#7c3aed' },
  { emoji: '😂', label: 'Laugh',  color: '#0891b2' },
]

export default function EmojiTray({ targetId }: { targetId: string }) {
  const { localParticipant } = useLocalParticipant()
  const { send } = useDataChannel('game')

  const fire = async (emoji: string) => {
    const msg: GameMessage = {
      type: 'EMOJI',
      senderId: localParticipant?.identity ?? 'unknown',
      targetId,
      emoji,
    }
    await send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
  }

  return (
    <div className="flex items-center gap-1">
      {EMOJIS.map(({ emoji, label, color }) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.3, y: -2 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          onClick={() => fire(emoji)}
          aria-label={`Send ${label} reaction`}
          title={label}
          className="flex h-6 w-6 items-center justify-center rounded-full text-sm transition-shadow"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}30`,
          }}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  )
}

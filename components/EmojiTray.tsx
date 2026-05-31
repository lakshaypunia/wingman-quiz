'use client'

import { useDataChannel, useLocalParticipant } from '@livekit/components-react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import type { GameMessage } from '@/types/game'

const enc = new TextEncoder()

const EMOJIS: { emoji: string; label: string; color: string }[] = [
  { emoji: '🔥', label: 'Fire',   color: '#ea580c' },
  { emoji: '🎯', label: 'Target', color: '#e91e8c' },
  { emoji: '🧠', label: 'Brain',  color: '#7c3aed' },
  { emoji: '😂', label: 'Laugh',  color: '#0891b2' },
]

const BOUNCE = { type: 'spring', stiffness: 600, damping: 14 } as const

export default function EmojiTray({ targetId }: { targetId: string }) {
  const { localParticipant } = useLocalParticipant()
  const { send } = useDataChannel('game')
  const handleMessage = useGameStore((s) => s.handleMessage)

  const fire = async (emoji: string) => {
    const msg: GameMessage = {
      type: 'EMOJI',
      senderId: localParticipant?.identity ?? 'unknown',
      targetId,
      emoji,
    }
    // Broadcast to all other participants
    await send(enc.encode(JSON.stringify(msg)), { reliable: true })
    // Apply locally — LiveKit doesn't echo messages back to the sender
    handleMessage(msg)
  }

  return (
    <div className="flex items-center gap-1">
      {EMOJIS.map(({ emoji, label, color }) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.35, y: -3 }}
          whileTap={{ scale: 0.8 }}
          transition={BOUNCE}
          onClick={() => fire(emoji)}
          aria-label={`Send ${label} reaction`}
          title={label}
          className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  )
}

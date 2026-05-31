'use client'

import { useDataChannel } from '@livekit/components-react'
import { useCallback } from 'react'
import type { GameMessage } from '@/types/game'

const TOPIC = 'game'
const enc = new TextEncoder()
const dec = new TextDecoder()

/**
 * Typed wrapper around LiveKit's `useDataChannel`.
 * Encodes/decodes GameMessage objects automatically.
 * Must be called inside a LiveKitRoom tree.
 */
export function useGameChannel(onMessage?: (msg: GameMessage) => void) {
  const { send } = useDataChannel(
    TOPIC,
    onMessage
      ? (raw) => {
          try {
            const msg = JSON.parse(dec.decode(raw.payload)) as GameMessage
            onMessage(msg)
          } catch {
            /* skip malformed / non-game packets */
          }
        }
      : undefined,
  )

  const sendMessage = useCallback(
    async (msg: GameMessage) => {
      await send(enc.encode(JSON.stringify(msg)), { reliable: true })
    },
    [send],
  )

  return { sendMessage }
}

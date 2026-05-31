'use client'

import { useGameChannel } from './useDataChannel'
import { useGameStore } from '@/store/gameStore'

/**
 * Bridges LiveKit data channel → Zustand store.
 * Call this once inside the LiveKitRoom tree (via GameSync component).
 * Every incoming GameMessage is dispatched to handleMessage.
 */
export function useGameSync() {
  const handleMessage = useGameStore((s) => s.handleMessage)
  useGameChannel(handleMessage)
}

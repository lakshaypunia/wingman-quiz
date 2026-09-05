'use server'

import { connectDB } from '@/lib/mongodb'
import Match from '@/models/Match'
import type { PlayerResult } from '@/types/game'

export async function finalizeMatch(
  roomCode: string,
  results: PlayerResult[],
): Promise<{ ok: boolean }> {
  try {
    await connectDB()

    await Match.updateOne(
      { roomCode: roomCode.toUpperCase(), isActive: true },
      {
        isActive: false,
        finalResults: results,
        endedAt: new Date(),
      },
    )

    return { ok: true }
  } catch (err) {
    console.error('[finalizeMatch]', err)
    return { ok: false }
  }
}

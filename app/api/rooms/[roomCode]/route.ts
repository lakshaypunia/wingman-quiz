import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Quiz from '@/models/Quiz'
import Match from '@/models/Match'
import type { GameMode } from '@/types/game'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await params

    await connectDB()

    const quiz = await Quiz.findOne({ roomCode: roomCode.toUpperCase() }).lean()
    if (!quiz) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    const match = await Match.findOne({
      roomCode: (quiz as { roomCode: string }).roomCode,
      isActive: true,
    }).lean()

    if (!match) {
      return Response.json({ error: 'No active session for this room' }, { status: 404 })
    }

    const q = quiz as {
      roomCode: string
      questions: unknown[]
      createdBy: unknown
    }
    const m = match as {
      _id: unknown
      gameMode: string
      participants: unknown[]
      isActive: boolean
    }

    return Response.json({
      roomCode: q.roomCode,
      questions: q.questions,
      gameMode: m.gameMode,
      participantCount: m.participants.length,
    })
  } catch (error) {
    console.error('[GET /api/rooms/[roomCode]]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Called by the host just before broadcasting GAME_START — persists the
// chosen gameMode so late-joiners can recover state via GET.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await params
    const { gameMode }: { gameMode: GameMode } = await req.json()

    if (!['FASTEST_FINGER', 'TRACK_AND_RACE'].includes(gameMode)) {
      return Response.json({ error: 'Invalid gameMode' }, { status: 400 })
    }

    await connectDB()
    await Match.updateOne(
      { roomCode: roomCode.toUpperCase(), isActive: true },
      { gameMode },
    )

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[PATCH /api/rooms/[roomCode]]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

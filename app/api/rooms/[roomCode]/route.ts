import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Quiz from '@/models/Quiz'
import Match from '@/models/Match'

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

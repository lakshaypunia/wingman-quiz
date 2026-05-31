import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { generateToken } from '@/lib/livekit'
import { generateRoomCode } from '@/lib/roomCode'
import { validateQuizJSON } from '@/lib/validateQuiz'
import User from '@/models/User'
import Quiz from '@/models/Quiz'
import Match from '@/models/Match'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password, questions: rawQuestions } = body

    if (!username?.trim() || !password || !rawQuestions) {
      return Response.json(
        { error: 'username, password, and questions are required' },
        { status: 400 }
      )
    }
    if (password.length < 4) {
      return Response.json(
        { error: 'Room password must be at least 4 characters' },
        { status: 400 }
      )
    }

    let questions
    try {
      questions = validateQuizJSON(rawQuestions)
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 })
    }

    await connectDB()

    let user = await User.findOne({ username: username.trim() })
    if (!user) {
      user = await User.create({ username: username.trim() })
    }

    const roomPasswordHash = await bcrypt.hash(password, 10)
    const roomCode = generateRoomCode()

    const quiz = await Quiz.create({
      roomCode,
      roomPasswordHash,
      createdBy: user._id,
      questions,
    })

    const userId = user._id.toString()

    const match = await Match.create({
      quizId: quiz._id,
      roomCode,
      participants: [user._id],
      liveState: {
        currentGlobalQuestion: 0,
        lockedQuestions: {},
        playerProgress: {
          [userId]: { currentQuestionIndex: 0, score: 0, done: false, answers: {} },
        },
      },
    })

    const token = await generateToken(roomCode, username.trim())

    return Response.json({
      roomCode,
      userId,
      matchId: match._id.toString(),
      token,
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      questionCount: questions.length,
    })
  } catch (error) {
    console.error('[POST /api/rooms/create]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { generateToken } from '@/lib/livekit'
import User from '@/models/User'
import Quiz from '@/models/Quiz'
import Match from '@/models/Match'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, roomCode, password } = body

    if (!username?.trim() || !roomCode?.trim() || !password) {
      return Response.json(
        { error: 'username, roomCode, and password are required' },
        { status: 400 }
      )
    }

    await connectDB()

    const quiz = await Quiz.findOne({ roomCode: roomCode.trim().toUpperCase() })
    if (!quiz) {
      return Response.json({ error: 'Room not found. Check the code and try again.' }, { status: 404 })
    }

    const passwordMatch = await bcrypt.compare(password, quiz.roomPasswordHash)
    if (!passwordMatch) {
      return Response.json({ error: 'Incorrect room password.' }, { status: 401 })
    }

    const match = await Match.findOne({ roomCode: quiz.roomCode, isActive: true })
    if (!match) {
      return Response.json({ error: 'This session has already ended.' }, { status: 404 })
    }
    if (match.participants.length >= 3) {
      return Response.json({ error: 'Room is full — maximum 3 players allowed.' }, { status: 403 })
    }

    let user = await User.findOne({ username: username.trim() })
    if (!user) {
      user = await User.create({ username: username.trim() })
    }

    const userId = user._id.toString()
    const alreadyIn = match.participants.map((p) => p.toString()).includes(userId)

    if (!alreadyIn) {
      match.participants.push(user._id)
      match.liveState.playerProgress[userId] = {
        currentQuestionIndex: 0,
        score: 0,
        done: false,
        answers: {},
      }
      match.markModified('liveState')
      await match.save()
    }

    const token = await generateToken(quiz.roomCode, username.trim())

    return Response.json({
      roomCode: quiz.roomCode,
      userId,
      matchId: match._id.toString(),
      token,
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      questionCount: quiz.questions.length,
    })
  } catch (error) {
    console.error('[POST /api/rooms/join]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

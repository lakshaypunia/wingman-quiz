'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useFFLogic } from '@/hooks/useFFLogic'
import ScoreStrip from '@/components/game/ScoreStrip'
import FFQuestion from '@/components/game/FFQuestion'

/* ─── FFF game wrapper ────────────────────────────────────── */
function FFGame() {
  useFFLogic()

  const questions  = useGameStore((s) => s.questions)
  const currentIdx = useGameStore((s) => s.currentGlobalQuestion)
  const question   = questions[currentIdx]

  if (!question) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-purple-300 border-t-purple-600"
        />
        <p className="font-heading text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading questions…
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8">
      <FFQuestion
        question={question}
        questionIndex={currentIdx}
        totalQuestions={questions.length}
      />
    </div>
  )
}

/* ─── Play page ───────────────────────────────────────────── */
export default function PlayPage() {
  const params   = useParams()
  const router   = useRouter()
  const roomCode = (params.roomCode as string).toUpperCase()

  const phase        = useGameStore((s) => s.phase)
  const gameMode     = useGameStore((s) => s.gameMode)
  const questions    = useGameStore((s) => s.questions)
  const session      = useGameStore((s) => s.session)
  const setQuestions = useGameStore((s) => s.setQuestions)
  const setGameMode  = useGameStore((s) => s.setGameMode)
  const setPhase     = useGameStore((s) => s.setPhase)

  // ── Recovery fetch ─────────────────────────────────────────────────
  // If questions or gameMode are missing (client missed GAME_START or
  // arrived before the initial GameSync fetch completed), pull them
  // from the API. The host PATCHes gameMode to MongoDB before sending
  // GAME_START, so the API always returns the correct value.
  useEffect(() => {
    const needsData = questions.length === 0 || !gameMode
    if (!needsData) return

    const code = session?.roomCode ?? roomCode
    fetch(`/api/rooms/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.questions?.length) setQuestions(data.questions)
        if (data.gameMode)          setGameMode(data.gameMode)
        // Ensure phase is 'playing' so the game renders
        setPhase('playing')
      })
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length, gameMode])

  // Navigate to results when match ends
  useEffect(() => {
    if (phase === 'results') router.push(`/room/${roomCode}/results`)
  }, [phase, roomCode, router])

  return (
    <div className="flex min-h-[calc(100vh-152px)] flex-col">
      <ScoreStrip />

      {gameMode === 'FASTEST_FINGER' && <FFGame />}

      {gameMode === 'TRACK_AND_RACE' && (
        <div className="flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lobby-section text-center max-w-md"
          >
            <p className="text-4xl mb-3">🏁</p>
            <p className="font-heading text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Track & Race
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Coming in Phase 8!
            </p>
          </motion.div>
        </div>
      )}

      {!gameMode && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="h-10 w-10 rounded-full border-4 border-purple-300 border-t-purple-600"
          />
          <p className="font-heading text-sm" style={{ color: 'var(--text-muted)' }}>
            Waiting for game to start…
          </p>
        </div>
      )}
    </div>
  )
}

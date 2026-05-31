'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useFFLogic } from '@/hooks/useFFLogic'
import { useTRLogic } from '@/hooks/useTRLogic'
import ScoreStrip from '@/components/game/ScoreStrip'
import FFQuestion from '@/components/game/FFQuestion'
import TRQuestion from '@/components/game/TRQuestion'
import TRProgressBar from '@/components/game/TRProgressBar'

/* ─── FFF wrapper ──────────────────────────────────────────── */
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

/* ─── Track & Race wrapper ─────────────────────────────────── */
function TRGame() {
  const { question, localIdx, timeLeft, answered, revealed, isDone, totalScore, submitAnswer } = useTRLogic()
  const questions = useGameStore((s) => s.questions)

  if (isDone) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="text-6xl"
        >
          🏁
        </motion.div>
        <p className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          You finished!
        </p>
        <p className="font-heading text-base" style={{ color: 'var(--text-muted)' }}>
          Score: <span className="font-bold" style={{ color: 'var(--purple)' }}>{totalScore.toLocaleString()}</span> pts
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Waiting for others to finish…
        </p>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="mt-2 h-6 w-6 rounded-full border-2 border-purple-300 border-t-purple-600"
        />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-purple-300 border-t-purple-600"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col pt-4 pb-8">
      <TRProgressBar localIdx={localIdx} />

      <div className="flex flex-1 flex-col items-center px-4">
        <AnimatePresence mode="wait">
          <TRQuestion
            key={question.questionId}
            question={question}
            localIdx={localIdx}
            totalQuestions={questions.length}
            timeLeft={timeLeft}
            answered={answered}
            revealed={revealed}
            onAnswer={submitAnswer}
          />
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── Play page router ─────────────────────────────────────── */
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

  // Recovery fetch: if questions or gameMode are missing (missed GAME_START
  // or arrived before GameSync's initial fetch completed)
  useEffect(() => {
    const needsData = questions.length === 0 || !gameMode
    if (!needsData) return

    const code = session?.roomCode ?? roomCode
    fetch(`/api/rooms/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.questions?.length) setQuestions(data.questions)
        if (data.gameMode)          setGameMode(data.gameMode)
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

      {gameMode === 'TRACK_AND_RACE' && <TRGame />}

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

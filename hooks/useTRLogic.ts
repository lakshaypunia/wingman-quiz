'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useGameChannel } from './useDataChannel'
import { calcTRScore } from '@/lib/scoring'

/* ─────────────────────────────────────────────────────────────
   useTRLogic
   Each player independently navigates questions at their own pace.
   State is local; PROGRESS_UPDATE broadcasts after every question
   so the progress bar and host's "all done" check stay in sync.
───────────────────────────────────────────────────────────── */
export function useTRLogic() {
  const { sendMessage } = useGameChannel()
  const handleMessage   = useGameStore((s) => s.handleMessage)
  const session         = useGameStore((s) => s.session)
  const hostIdentity    = useGameStore((s) => s.hostIdentity)
  const questions       = useGameStore((s) => s.questions)
  const players         = useGameStore((s) => s.players)
  const playerProgress  = useGameStore((s) => s.playerProgress)

  const isHost = !!session && session.username === hostIdentity

  // Per-player local state — NOT broadcast until question is answered/skipped
  const [localIdx,    setLocalIdx]    = useState(0)
  const [timeLeft,    setTimeLeft]    = useState(0)
  const [answered,    setAnswered]    = useState<string | null>(null)
  const [revealed,    setRevealed]    = useState(false)
  const [totalScore,  setTotalScore]  = useState(0)

  // Refs so timers/callbacks always read fresh values (avoid stale closures)
  const localIdxRef   = useRef(0)
  const scoreRef      = useRef(0)
  const advancingRef  = useRef(false)  // prevents double-advance
  const startedAtRef  = useRef(Date.now())

  const question = questions[localIdxRef.current]
  const isDone   = localIdxRef.current >= questions.length

  // Advance to the next question and broadcast PROGRESS_UPDATE
  const doAdvance = useCallback(async () => {
    if (!session) return
    const nextIdx = localIdxRef.current + 1
    const done    = nextIdx >= questions.length

    const msg = {
      type: 'PROGRESS_UPDATE' as const,
      playerId: session.username,
      questionIndex: nextIdx,
      score: scoreRef.current,
      done,
    }
    await sendMessage(msg)
    handleMessage(msg)

    localIdxRef.current = nextIdx
    setLocalIdx(nextIdx)
    setAnswered(null)
    setRevealed(false)
    advancingRef.current = false
  }, [session, questions.length, sendMessage, handleMessage])

  // Timer: reset and start countdown for each question
  useEffect(() => {
    if (isDone || !question) return

    const limit = question.timeLimitSeconds
    setTimeLeft(limit)
    startedAtRef.current = Date.now()
    setAnswered(null)
    setRevealed(false)
    advancingRef.current = false

    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)

    // Auto-skip when time runs out (0 points for unanswered question)
    const timeout = setTimeout(async () => {
      if (!advancingRef.current) {
        advancingRef.current = true
        await doAdvance()
      }
    }, (limit + 0.3) * 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  // Re-run when question changes (localIdx drives this)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localIdx, isDone])

  const submitAnswer = useCallback(async (option: string) => {
    if (answered || revealed || !question || advancingRef.current) return
    advancingRef.current = true

    setAnswered(option)
    setRevealed(true)

    const elapsed  = Date.now() - startedAtRef.current
    const correct  = option === question.correctAnswer
    const earned   = correct ? calcTRScore(question.timeLimitSeconds, elapsed) : 0
    scoreRef.current += earned
    setTotalScore(scoreRef.current)

    // Brief pause so the player sees correct/wrong before moving on
    await new Promise<void>((r) => setTimeout(r, 1400))
    await doAdvance()
  }, [answered, revealed, question, doAdvance])

  // Host only: when all players are done, broadcast MATCH_END
  useEffect(() => {
    if (!isHost) return
    const playerIds = Object.keys(players)
    if (playerIds.length === 0) return

    const allDone = playerIds.every((pid) => playerProgress[pid]?.done === true)
    if (allDone) {
      const msg = { type: 'MATCH_END' as const }
      sendMessage(msg).then(() => handleMessage(msg))
    }
  }, [playerProgress, players, isHost, sendMessage, handleMessage])

  return {
    question,
    localIdx,
    timeLeft,
    answered,
    revealed,
    isDone,
    totalScore,
    submitAnswer,
  }
}

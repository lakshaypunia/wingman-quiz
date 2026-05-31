'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useGameChannel } from './useDataChannel'
import { calcFFScore } from '@/lib/scoring'

/* ─────────────────────────────────────────────────────────────
   useFFLogic
   Call once inside the play page.
   The effective host drives all timing:
     • Question locked → 3 s countdown → ADVANCE_QUESTION
     • Time limit expires with no correct answer → immediate advance
   Non-hosts just render — they receive messages via useGameSync.
───────────────────────────────────────────────────────────── */
export function useFFLogic() {
  const { sendMessage }  = useGameChannel()
  const handleMessage    = useGameStore((s) => s.handleMessage)
  const session          = useGameStore((s) => s.session)
  const hostIdentity     = useGameStore((s) => s.hostIdentity)
  const questions        = useGameStore((s) => s.questions)
  const currentIdx       = useGameStore((s) => s.currentGlobalQuestion)
  const lockedQuestions  = useGameStore((s) => s.lockedQuestions)
  const players          = useGameStore((s) => s.players)
  const playerProgress   = useGameStore((s) => s.playerProgress)

  const isHost   = !!session && session.username === hostIdentity
  const question = questions[currentIdx]

  // Single pending-advance slot — prevents double-advancing a question
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelPending = () => {
    if (pendingRef.current) { clearTimeout(pendingRef.current); pendingRef.current = null }
  }

  const doAdvance = useCallback(async (qId: number) => {
    pendingRef.current = null
    const state   = useGameStore.getState()
    const nextIdx = state.currentGlobalQuestion + 1
    if (nextIdx >= state.questions.length) {
      const msg = { type: 'MATCH_END' as const }
      await sendMessage(msg)
      handleMessage(msg)
    } else {
      const msg = { type: 'ADVANCE_QUESTION' as const, questionId: qId }
      await sendMessage(msg)
      handleMessage(msg)
    }
  }, [sendMessage, handleMessage])

  // Clear pending timer when the question index advances
  useEffect(() => {
    cancelPending()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx])

  // Host: question locked → schedule 3-second advance
  useEffect(() => {
    if (!isHost || !question) return
    const qId = question.questionId
    if (!lockedQuestions[qId]) return   // not locked yet
    if (pendingRef.current) return      // already scheduled

    pendingRef.current = setTimeout(() => doAdvance(qId), 3000)
    return cancelPending
  }, [lockedQuestions, isHost, question, doAdvance])

  // Host: ALL players answered but ALL got it wrong → reveal answer for 2s
  // then advance. Cancels the full time-limit timeout if it hasn't fired.
  useEffect(() => {
    if (!isHost || !question) return
    const qId = question.questionId

    // Skip if already locked (someone got it right) or advance already pending
    if (lockedQuestions[qId] !== undefined) return
    if (pendingRef.current) return

    const playerIds = Object.keys(players)
    if (playerIds.length === 0) return

    const allAnswered = playerIds.every(
      (pid) => playerProgress[pid]?.answers?.[qId] !== undefined
    )

    if (allAnswered) {
      // 2 seconds to see the revealed correct answer, then move on
      pendingRef.current = setTimeout(() => doAdvance(qId), 2000)
    }
  }, [playerProgress, players, isHost, question, lockedQuestions, doAdvance])

  // Host: time limit expires with no correct answer → advance immediately
  useEffect(() => {
    if (!isHost || !question) return
    const qId = question.questionId

    const t = setTimeout(() => {
      const locked = useGameStore.getState().lockedQuestions[qId]
      if (!locked && !pendingRef.current) doAdvance(qId)
    }, (question.timeLimitSeconds + 1) * 1000)

    return () => clearTimeout(t)
  // currentIdx ensures a fresh timer starts for each new question
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, isHost, doAdvance])
}

/* ─────────────────────────────────────────────────────────────
   useSubmitFF
   Called from FFQuestion when the player taps an option.
   Sends ANSWER_SUBMITTED to all; if correct also sends
   QUESTION_LOCKED + PROGRESS_UPDATE and applies locally.
───────────────────────────────────────────────────────────── */
export function useSubmitFF() {
  const { sendMessage } = useGameChannel()
  const handleMessage   = useGameStore((s) => s.handleMessage)
  const session         = useGameStore((s) => s.session)
  const questions       = useGameStore((s) => s.questions)
  const currentIdx      = useGameStore((s) => s.currentGlobalQuestion)
  const lockedQuestions = useGameStore((s) => s.lockedQuestions)
  const playerProgress  = useGameStore((s) => s.playerProgress)

  const submit = useCallback(async (answer: string, questionStartedAt: number) => {
    const question = questions[currentIdx]
    if (!question || !session) return

    const qId = question.questionId
    if (lockedQuestions[qId] !== undefined) return   // already locked

    const now = Date.now()

    // Use session.username (= LiveKit identity) so playerId is consistent
    // with the keys in store.players, store.playerProgress, and ScoreStrip
    const pid = session.username

    const answerMsg = {
      type: 'ANSWER_SUBMITTED' as const,
      playerId: pid,
      questionId: qId,
      answer,
      timestamp: now,
    }
    await sendMessage(answerMsg)
    handleMessage(answerMsg)

    if (answer === question.correctAnswer) {
      const earned    = calcFFScore(question.timeLimitSeconds, now - questionStartedAt)
      const prevScore = playerProgress[pid]?.score ?? 0

      const lockMsg = { type: 'QUESTION_LOCKED' as const, questionId: qId, winnerId: pid }
      await sendMessage(lockMsg)
      handleMessage(lockMsg)

      const progressMsg = {
        type: 'PROGRESS_UPDATE' as const,
        playerId: pid,
        questionIndex: currentIdx,
        score: prevScore + earned,
      }
      await sendMessage(progressMsg)
      handleMessage(progressMsg)
    }
  }, [session, questions, currentIdx, lockedQuestions, playerProgress, sendMessage, handleMessage])

  return { submit }
}

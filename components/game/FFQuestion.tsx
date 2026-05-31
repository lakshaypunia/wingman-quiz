'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useSubmitFF } from '@/hooks/useFFLogic'
import AdvanceCountdown from './AdvanceCountdown'
import type { Question } from '@/types/game'

const OPTION_META = [
  { label: 'A', color: '#e91e8c' },
  { label: 'B', color: '#7c3aed' },
  { label: 'C', color: '#0891b2' },
  { label: 'D', color: '#65a30d' },
] as const

const SECTION_COLORS: Record<string, string> = {
  'Verbal Ability':    '#e91e8c',
  'Numerical Ability': '#7c3aed',
  'Spatial Ability':   '#0891b2',
  'General Awareness': '#65a30d',
}

export default function FFQuestion({
  question,
  questionIndex,
  totalQuestions,
}: {
  question: Question
  questionIndex: number
  totalQuestions: number
}) {
  const session         = useGameStore((s) => s.session)
  const lockedQuestions = useGameStore((s) => s.lockedQuestions)
  const playerProgress  = useGameStore((s) => s.playerProgress)
  const players         = useGameStore((s) => s.players)
  const { submit }      = useSubmitFF()

  const startedAtRef = useRef<number>(Date.now())
  const [myAnswer, setMyAnswer] = useState<string | null>(null)

  // Reset per question
  useEffect(() => {
    startedAtRef.current = Date.now()
    setMyAnswer(null)
  }, [question.questionId])

  const isLocked = lockedQuestions[question.questionId] !== undefined
  const winnerId = lockedQuestions[question.questionId] ?? null

  // What each player answered for this question
  const playerAnswers: Record<string, string> = {}
  Object.entries(playerProgress).forEach(([pid, prog]) => {
    const ans = prog.answers?.[question.questionId]?.answer
    if (ans) playerAnswers[pid] = ans
  })

  // Check if all players have answered (even if all wrong)
  const playerIds = Object.keys(players)
  const allAnswered = playerIds.length > 0 && playerIds.every(
    (pid) => playerProgress[pid]?.answers?.[question.questionId] !== undefined
  )
  // Reveal answer if locked OR all answered (even if no winner)
  const shouldRevealAnswer = isLocked || allAnswered

  const handleAnswer = async (option: string) => {
    if (isLocked || myAnswer) return
    setMyAnswer(option)
    await submit(option, startedAtRef.current)
  }

  const sectionColor = SECTION_COLORS[question.section] ?? '#7c3aed'

  return (
    <motion.div
      key={question.questionId}
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 340, damping: 24 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Card */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(124,58,237,0.15)',
          boxShadow: '0 8px 40px rgba(124,58,237,0.1), 0 1px 0 rgba(255,255,255,0.9) inset',
        }}
      >
        {/* Timer bar */}
        <div className="h-1.5" style={{ background: 'rgba(124,58,237,0.1)' }}>
          <motion.div
            key={question.questionId}
            className="h-full"
            style={{
              background: `linear-gradient(90deg, ${sectionColor}, ${sectionColor}88)`,
              transformOrigin: 'left',
            }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: isLocked ? undefined : 0 }}
            transition={isLocked ? {} : { duration: question.timeLimitSeconds, ease: 'linear' }}
          />
        </div>

        <div className="p-6 pb-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <span
              className="badge font-heading text-xs"
              style={{
                background: `${sectionColor}15`,
                color: sectionColor,
                border: `1px solid ${sectionColor}30`,
              }}
            >
              {question.section}
            </span>
            <span className="font-heading text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              {questionIndex + 1} / {totalQuestions}
            </span>
          </div>

          {/* Question text */}
          <p className="font-heading text-xl font-semibold leading-snug mb-6"
            style={{ color: 'var(--text-primary)' }}>
            {question.question}
          </p>

          {/* Options 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((option, i) => {
              const meta = OPTION_META[i]
              const isMyPick    = myAnswer === option
              const isCorrect   = option === question.correctAnswer
              const isWrong     = isLocked && !isCorrect
              const someoneChose = Object.values(playerAnswers).includes(option)

              // Who chose this option — pid is username (LiveKit identity)
              const choosers = Object.entries(playerAnswers)
                .filter(([, a]) => a === option)
                .map(([pid]) => players[pid]?.username ?? pid)

              let bg     = `${meta.color}10`
              let border = `${meta.color}30`
              let textC  = 'var(--text-primary)'

              // Show correct answer in green (whether locked by winner or all answered wrong)
              if (shouldRevealAnswer && isCorrect) {
                bg = 'rgba(22,163,74,0.12)'; border = 'rgba(22,163,74,0.5)'; textC = '#16a34a'
              }
              else if (shouldRevealAnswer && isWrong) {
                bg = 'rgba(0,0,0,0.04)'; border = 'rgba(0,0,0,0.1)'; textC = '#94a3b8'
              } else if (isMyPick) {
                bg = `${meta.color}22`; border = meta.color
              }

              return (
                <motion.button
                  key={option}
                  whileHover={!shouldRevealAnswer && !myAnswer ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!shouldRevealAnswer && !myAnswer ? { scale: 0.97 } : {}}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  onClick={() => handleAnswer(option)}
                  disabled={!!shouldRevealAnswer || !!myAnswer}
                  className="relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-shadow"
                  style={{ background: bg, borderColor: border }}
                >
                  {/* Label badge */}
                  <span
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full font-heading text-sm font-bold text-white"
                    style={{ background: (shouldRevealAnswer && isCorrect) ? '#16a34a' : shouldRevealAnswer ? '#cbd5e1' : meta.color }}
                  >
                    {shouldRevealAnswer && isCorrect ? '✓' : shouldRevealAnswer && isWrong && isMyPick ? '✗' : meta.label}
                  </span>

                  <span className="font-heading text-sm font-medium leading-snug" style={{ color: textC }}>
                    {option}
                  </span>

                  {/* Chooser names */}
                  <AnimatePresence>
                    {someoneChose && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-2 -right-2 flex flex-wrap gap-1"
                      >
                        {choosers.map((name) => (
                          <span
                            key={name}
                            className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                            style={{ background: meta.color, boxShadow: `0 2px 8px ${meta.color}55` }}
                          >
                            {name.slice(0, 6)}
                          </span>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Advance countdown shown when someone wins */}
      {isLocked && winnerId && <AdvanceCountdown winnerId={winnerId} />}

      {/* All answered but all wrong — show for 2s then advance */}
      {allAnswered && !winnerId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border px-5 py-3 text-center font-heading text-sm font-semibold"
          style={{ background: 'rgba(202,138,4,0.08)', borderColor: 'rgba(202,138,4,0.3)', color: 'var(--yellow)' }}
        >
          ⚠️ All answered incorrectly — moving to next question
        </motion.div>
      )}

      {/* Skipped (time expired, no one answered) */}
      {isLocked && !winnerId && !allAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border px-5 py-3 text-center font-heading text-sm font-semibold"
          style={{ background: 'rgba(202,138,4,0.08)', borderColor: 'rgba(202,138,4,0.3)', color: 'var(--yellow)' }}
        >
          ⏱ Time's up — no one answered!
        </motion.div>
      )}
    </motion.div>
  )
}

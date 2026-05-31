'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Question } from '@/types/game'
import { calcTRScore } from '@/lib/scoring'

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

interface TRQuestionProps {
  question: Question
  localIdx: number
  totalQuestions: number
  timeLeft: number
  answered: string | null
  revealed: boolean
  onAnswer: (option: string) => void
}

export default function TRQuestion({
  question,
  localIdx,
  totalQuestions,
  timeLeft,
  answered,
  revealed,
  onAnswer,
}: TRQuestionProps) {
  const sectionColor  = SECTION_COLORS[question.section] ?? '#7c3aed'
  const limit         = question.timeLimitSeconds
  const scorePreview  = answered ? null : calcTRScore(limit, (limit - timeLeft) * 1000)
  const timerFraction = timeLeft / limit
  const timerWarning  = timerFraction < 0.25

  return (
    <motion.div
      key={question.questionId}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(124,58,237,0.15)',
          boxShadow: '0 8px 40px rgba(124,58,237,0.10), 0 1px 0 rgba(255,255,255,0.9) inset',
        }}
      >
        {/* Timer bar */}
        <div className="h-2 w-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <motion.div
            key={question.questionId}
            className="h-full rounded-full"
            style={{
              background: timerWarning
                ? 'linear-gradient(90deg, #ef4444, #fca5a5)'
                : `linear-gradient(90deg, ${sectionColor}, ${sectionColor}88)`,
              transformOrigin: 'left',
            }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: revealed ? (answered ? timerFraction : 0) : 0 }}
            transition={revealed ? {} : { duration: limit, ease: 'linear' }}
          />
        </div>

        <div className="p-6 pb-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span
              className="badge font-heading text-xs"
              style={{ background: `${sectionColor}15`, color: sectionColor, border: `1px solid ${sectionColor}30` }}
            >
              {question.section}
            </span>

            <div className="flex items-center gap-3">
              {/* Score preview */}
              <AnimatePresence mode="wait">
                {scorePreview !== null && (
                  <motion.span
                    key={scorePreview}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="font-heading text-sm font-bold"
                    style={{ color: timerWarning ? '#ef4444' : sectionColor }}
                  >
                    +{scorePreview} pts
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Timer */}
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full font-heading text-sm font-bold"
                style={{
                  background: timerWarning ? 'rgba(239,68,68,0.12)' : `${sectionColor}15`,
                  color: timerWarning ? '#ef4444' : sectionColor,
                  border: `2px solid ${timerWarning ? 'rgba(239,68,68,0.4)' : sectionColor + '40'}`,
                }}
              >
                {timeLeft}
              </div>

              {/* Progress */}
              <span className="font-heading text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {localIdx + 1} / {totalQuestions}
              </span>
            </div>
          </div>

          {/* Question text */}
          <p className="font-heading text-xl font-semibold leading-snug mb-6" style={{ color: 'var(--text-primary)' }}>
            {question.question}
          </p>

          {/* Options 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((option, i) => {
              const meta      = OPTION_META[i]
              const isMyPick  = answered === option
              const isCorrect = option === question.correctAnswer
              const isWrong   = revealed && !isCorrect

              let bg     = `${meta.color}10`
              let border = `${meta.color}30`
              let textC  = 'var(--text-primary)'

              if (revealed && isCorrect) {
                bg = 'rgba(22,163,74,0.12)'; border = 'rgba(22,163,74,0.5)'; textC = '#16a34a'
              } else if (revealed && isWrong && isMyPick) {
                bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.4)'; textC = '#ef4444'
              } else if (revealed && isWrong) {
                bg = 'rgba(0,0,0,0.04)'; border = 'rgba(0,0,0,0.08)'; textC = '#94a3b8'
              } else if (isMyPick) {
                bg = `${meta.color}22`; border = meta.color
              }

              const badgeColor =
                revealed && isCorrect ? '#16a34a' :
                revealed && isMyPick  ? '#ef4444' :
                revealed              ? '#cbd5e1' :
                meta.color

              const badgeLabel =
                revealed && isCorrect           ? '✓' :
                revealed && isMyPick && !isCorrect ? '✗' :
                meta.label

              return (
                <motion.button
                  key={option}
                  whileHover={!revealed && !answered ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!revealed && !answered ? { scale: 0.97 } : {}}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  onClick={() => onAnswer(option)}
                  disabled={!!revealed || !!answered}
                  className="relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-shadow"
                  style={{ background: bg, borderColor: border }}
                >
                  <span
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full font-heading text-sm font-bold text-white"
                    style={{ background: badgeColor }}
                  >
                    {badgeLabel}
                  </span>
                  <span className="font-heading text-sm font-medium leading-snug" style={{ color: textC }}>
                    {option}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-2xl border px-5 py-3 text-center font-heading text-sm font-semibold"
            style={
              answered === question.correctAnswer
                ? { background: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.3)', color: '#16a34a' }
                : { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }
            }
          >
            {answered === question.correctAnswer ? '🎯 Correct! Next question loading…' : '❌ Wrong! Moving on…'}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

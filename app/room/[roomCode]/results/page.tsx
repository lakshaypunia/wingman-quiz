'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { aggregateResults } from '@/lib/aggregateResults'
import { finalizeMatch } from '@/app/actions/finalizeMatch'
import type { PlayerResult } from '@/types/game'

const SECTION_COLORS: Record<string, string> = {
  'Verbal Ability':    '#e91e8c',
  'Numerical Ability': '#7c3aed',
  'Spatial Ability':   '#0891b2',
  'General Awareness': '#65a30d',
}
const SECTIONS = ['Verbal Ability', 'Numerical Ability', 'Spatial Ability', 'General Awareness'] as const

const MEDAL = ['🥇', '🥈', '🥉']
const PODIUM_HEIGHT = ['h-36', 'h-24', 'h-16']
const PODIUM_ORDER = [1, 0, 2]  // display order: 2nd left, 1st center, 3rd right

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        color: ['#e91e8c', '#7c3aed', '#fbbf24', '#0891b2', '#65a30d', '#f97316'][i % 6],
        left:  `${Math.random() * 100}%`,
        delay: Math.random() * 2,
        size:  6 + Math.random() * 8,
        duration: 2.5 + Math.random() * 2,
      })),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{ left: p.left, width: p.size, height: p.size, background: p.color, borderRadius: 2 }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: [1, 1, 0], rotate: 360 * (Math.random() > 0.5 ? 1 : -1) * 3 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ results }: { results: PlayerResult[] }) {
  const top3 = results.slice(0, 3)
  // Pad to 3 slots for display
  while (top3.length < 3) top3.push(null as unknown as PlayerResult)

  return (
    <div className="flex items-end justify-center gap-3 px-4 mb-8">
      {PODIUM_ORDER.map((rank) => {
        const player = top3[rank]
        if (!player) return <div key={rank} className="w-28" />

        return (
          <motion.div
            key={rank}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: rank * 0.15 }}
            className="flex w-28 flex-col items-center"
          >
            {/* Avatar + medal */}
            <div className="relative mb-2">
              <motion.div
                animate={rank === 0 ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1 }}
                className="flex h-14 w-14 items-center justify-center rounded-full border-4 font-heading text-xl font-bold text-white"
                style={{
                  background: rank === 0
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : rank === 1
                    ? 'linear-gradient(135deg, #94a3b8, #cbd5e1)'
                    : 'linear-gradient(135deg, #c2773a, #d97706)',
                  borderColor: rank === 0 ? '#fbbf24' : rank === 1 ? '#94a3b8' : '#c2773a',
                  boxShadow: rank === 0 ? '0 0 24px rgba(251,191,36,0.5)' : 'none',
                }}
              >
                {player.username.slice(0, 1).toUpperCase()}
              </motion.div>
              <span className="absolute -top-1 -right-1 text-lg">{MEDAL[rank]}</span>
            </div>

            <p className="font-heading text-sm font-bold truncate w-full text-center mb-1" style={{ color: 'var(--text-primary)' }}>
              {player.username}
            </p>
            <p className="font-heading text-base font-bold mb-2" style={{ color: rank === 0 ? '#f59e0b' : 'var(--purple)' }}>
              {player.totalScore.toLocaleString()}
            </p>

            {/* Podium block */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.4 + rank * 0.1 }}
              style={{
                transformOrigin: 'bottom',
                background:
                  rank === 0
                    ? 'linear-gradient(180deg, #fbbf24, #f59e0b)'
                    : rank === 1
                    ? 'linear-gradient(180deg, #94a3b8, #cbd5e1)'
                    : 'linear-gradient(180deg, #c2773a, #d97706)',
              }}
              className={`${PODIUM_HEIGHT[rank]} w-full rounded-t-2xl flex items-center justify-center font-heading text-2xl font-bold text-white`}
            >
              {rank + 1}
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Player stat card ──────────────────────────────────────────────────────────
function PlayerCard({ result, rank }: { result: PlayerResult; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22, delay: rank * 0.08 }}
      className="rounded-2xl p-4 mb-3"
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${rank === 0 ? 'rgba(251,191,36,0.4)' : 'rgba(124,58,237,0.12)'}`,
        boxShadow: rank === 0 ? '0 4px 24px rgba(251,191,36,0.15)' : '0 2px 12px rgba(124,58,237,0.06)',
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{MEDAL[rank] ?? `${rank + 1}.`}</span>
          <div>
            <p className="font-heading text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {result.username}
            </p>
            <p className="font-heading text-xs" style={{ color: 'var(--text-muted)' }}>
              {result.accuracyRate}% accuracy
              {result.avgResponseTime > 0 && ` · ~${result.avgResponseTime}s avg`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-heading text-xl font-bold" style={{ color: 'var(--purple)' }}>
            {result.totalScore.toLocaleString()}
          </p>
          <p className="font-heading text-xs" style={{ color: 'var(--text-muted)' }}>points</p>
        </div>
      </div>

      {/* Section breakdown */}
      <div className="space-y-2">
        {SECTIONS.map((sec) => {
          const s     = result.sectionBreakdown[sec]
          const pct   = s && s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
          const color = SECTION_COLORS[sec]

          return (
            <div key={sec}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-heading text-xs" style={{ color: 'var(--text-muted)' }}>
                  {sec.split(' ')[0]}
                </span>
                <span className="font-heading text-xs font-semibold" style={{ color }}>
                  {s ? `${s.correct}/${s.total}` : '—'}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: `${color}18` }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + rank * 0.08 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── Speed comparison ──────────────────────────────────────────────────────────
function SpeedComparison({ results }: { results: PlayerResult[] }) {
  const maxScore = Math.max(...results.map((r) => r.totalScore), 1)

  return (
    <div
      className="rounded-2xl p-4 mb-6"
      style={{
        background: 'rgba(255,255,255,0.72)',
        border: '1.5px solid rgba(124,58,237,0.12)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="font-heading text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
        📊 Score Comparison
      </p>
      <div className="space-y-3">
        {results.map((r, i) => {
          const pct = (r.totalScore / maxScore) * 100
          const color = ['#fbbf24', '#94a3b8', '#c2773a', '#7c3aed'][i] ?? '#7c3aed'

          return (
            <div key={r.userId} className="flex items-center gap-3">
              <span className="font-heading text-xs w-20 truncate shrink-0" style={{ color: 'var(--text-primary)' }}>
                {r.username}
              </span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: `${color}18` }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 + i * 0.1 }}
                />
              </div>
              <span className="font-heading text-xs font-bold w-14 text-right shrink-0" style={{ color }}>
                {r.totalScore.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Results page ──────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const params   = useParams()
  const router   = useRouter()
  const roomCode = (params.roomCode as string).toUpperCase()

  const players        = useGameStore((s) => s.players)
  const playerProgress = useGameStore((s) => s.playerProgress)
  const questions      = useGameStore((s) => s.questions)
  const session        = useGameStore((s) => s.session)
  const hostIdentity   = useGameStore((s) => s.hostIdentity)

  const isHost    = !!session && session.username === hostIdentity
  const finalized = useRef(false)

  const results = useMemo(
    () => aggregateResults(players, playerProgress, questions),
    [players, playerProgress, questions],
  )

  // Host writes final results to MongoDB once
  useEffect(() => {
    if (!isHost || finalized.current || results.length === 0) return
    finalized.current = true
    finalizeMatch(roomCode, results).catch(console.error)
  }, [isHost, roomCode, results])

  const winner = results[0]

  return (
    <>
      <Confetti />

      <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="text-center mb-8"
        >
          <p className="text-5xl mb-2">🎉</p>
          <h1 className="font-heading text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Game Over!
          </h1>
          {winner && (
            <p className="font-heading text-base mt-1" style={{ color: 'var(--text-muted)' }}>
              🏆 {winner.username} wins with {winner.totalScore.toLocaleString()} pts!
            </p>
          )}
        </motion.div>

        {/* Podium */}
        {results.length > 0 && <Podium results={results} />}

        {/* Score comparison bar chart */}
        {results.length > 1 && <SpeedComparison results={results} />}

        {/* Per-player detailed cards */}
        <div className="space-y-0">
          {results.map((r, i) => (
            <PlayerCard key={r.userId} result={r} rank={i} />
          ))}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex gap-3 mt-8 pb-8"
        >
          <button
            onClick={() => router.push('/')}
            className="flex-1 rounded-2xl border-2 py-3 font-heading text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ borderColor: 'rgba(124,58,237,0.3)', color: 'var(--purple)', background: 'rgba(124,58,237,0.06)' }}
          >
            🏠 Leave Room
          </button>
        </motion.div>
      </div>
    </>
  )
}

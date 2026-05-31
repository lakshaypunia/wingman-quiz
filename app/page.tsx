'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { validateQuizJSON } from '@/lib/validateQuiz'
import type { Question } from '@/types/game'

type Mode = 'host' | 'join' | null

interface HostState {
  username: string
  password: string
  confirmPassword: string
  parsedQuestions: Question[] | null
  fileError: string | null
  fileName: string | null
}

interface JoinState {
  username: string
  roomCode: string
  password: string
}

/* ─── Bezier presets ─────────────────────────────────────── */
const SPRING: [number, number, number, number] = [0.16, 1, 0.3, 1]
const BOUNCY: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

/* ─── Variants ───────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.55, ease: SPRING },
  }),
}
const expandForm = {
  hidden: { opacity: 0, height: 0 },
  show:   { opacity: 1, height: 'auto', transition: { duration: 0.42, ease: SPRING } },
  exit:   { opacity: 0, height: 0,      transition: { duration: 0.22, ease: 'easeIn' as const } },
}
const staggerField = {
  hidden: { opacity: 0, x: -12 },
  show: (i = 0) => ({
    opacity: 1, x: 0,
    transition: { delay: 0.08 + i * 0.07, duration: 0.32, ease: 'easeOut' as const },
  }),
}

/* ─── Sparkle decorations ────────────────────────────────── */
const SPARKLES = [
  { top: '8%',  left: '5%',  color: '#ff2d87', size: 14, dur: '3.2s', delay: '0s'    },
  { top: '15%', left: '92%', color: '#00e5ff', size: 10, dur: '4s',   delay: '0.8s'  },
  { top: '45%', left: '2%',  color: '#a3ff47', size: 8,  dur: '3.8s', delay: '1.5s'  },
  { top: '70%', left: '96%', color: '#ffd60a', size: 12, dur: '3.5s', delay: '0.4s'  },
  { top: '88%', left: '8%',  color: '#a855f7', size: 9,  dur: '4.2s', delay: '2s'    },
  { top: '30%', left: '97%', color: '#ff7b2c', size: 11, dur: '3s',   delay: '1.2s'  },
]

/* ─── Background ─────────────────────────────────────────── */
function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="scanline" />
      <div className="bg-grid absolute inset-0" />

      {/* Orb: hot pink — top-left */}
      <div className="bg-orb-1 absolute -top-48 -left-48 h-[650px] w-[650px] rounded-full"
        style={{ background: 'radial-gradient(circle, #f9a8d4 0%, #c084fc 45%, transparent 70%)', opacity: 0.55 }} />
      {/* Orb: cyan — bottom-right */}
      <div className="bg-orb-2 absolute -bottom-48 -right-48 h-[700px] w-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, #67e8f9 0%, #818cf8 40%, transparent 70%)', opacity: 0.5 }} />
      {/* Orb: lime — mid-left */}
      <div className="bg-orb-3 absolute top-1/2 -left-24 h-[400px] w-[400px] -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, #bbf7d0 0%, transparent 65%)', opacity: 0.6 }} />
      {/* Orb: yellow — top-right */}
      <div className="bg-orb-4 absolute -top-20 right-1/4 h-[350px] w-[350px] rounded-full"
        style={{ background: 'radial-gradient(circle, #fde68a 0%, transparent 60%)', opacity: 0.55 }} />

      {/* Sparkles */}
      {SPARKLES.map((s, i) => (
        <div
          key={i}
          className="sparkle absolute font-heading"
          style={{
            top: s.top, left: s.left, color: s.color,
            fontSize: s.size, '--dur': s.dur, '--delay': s.delay,
          } as React.CSSProperties}
        >
          ✦
        </div>
      ))}

      {/* Soft light edge — keeps the page feeling contained without darkening */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 130% 90% at 50% 50%, transparent 55%, rgba(237,233,254,0.4) 100%)' }} />
    </div>
  )
}

/* ─── Input field ────────────────────────────────────────── */
function InputField({ label, type = 'text', value, onChange, placeholder, autoComplete, delay = 0 }: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder?: string
  autoComplete?: string; delay?: number
}) {
  return (
    <motion.div variants={staggerField} custom={delay} initial="hidden" animate="show">
      <label className="field-label">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        autoComplete={autoComplete} className="afcat-input"
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </motion.div>
  )
}

/* ─── Error banner ───────────────────────────────────────── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
      style={{ borderColor: 'rgba(255,77,109,0.3)', background: 'rgba(255,77,109,0.1)', color: '#ff4d6d' }}>
      <span>⚠</span> {message}
    </motion.div>
  )
}

/* ─── File upload ────────────────────────────────────────── */
function FileUploadZone({ onFile, fileName, fileError, questionCount }: {
  onFile: (f: File) => void; fileName: string | null
  fileError: string | null; questionCount: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) onFile(f)
  }, [onFile])

  const zone = ['upload-zone p-7 text-center select-none',
    dragging ? 'drag-over' : '',
    fileError ? 'has-error' : '',
    !fileError && fileName ? 'has-file' : '',
  ].filter(Boolean).join(' ')

  return (
    <motion.div variants={staggerField} custom={3} initial="hidden" animate="show">
      <label className="field-label">Upload Questions (JSON)</label>
      <div className={zone}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".json,application/json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />

        {!fileName && !fileError && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">📂</span>
            <p className="font-heading text-base font-semibold" style={{ color: 'var(--pink)' }}>
              Drop your JSON file here
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              or click to browse · accepts .json
            </p>
          </div>
        )}
        {fileName && !fileError && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-3xl">🎯</span>
            <p className="font-heading text-base font-semibold" style={{ color: 'var(--lime)' }}>
              {questionCount} questions loaded!
            </p>
            <p className="truncate max-w-xs text-xs" style={{ color: 'var(--text-muted)' }}>{fileName}</p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Click to replace</p>
          </div>
        )}
        {fileError && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-3xl">❌</span>
            <p className="font-heading text-sm font-semibold" style={{ color: 'var(--red)' }}>Invalid file</p>
            <p className="max-w-xs text-xs" style={{ color: 'rgba(255,77,109,0.7)' }}>{fileError}</p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Click to try again</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Host form ──────────────────────────────────────────── */
function HostForm({ state, setState, onSubmit, loading, error }: {
  state: HostState; setState: (s: HostState) => void
  onSubmit: () => void; loading: boolean; error: string | null
}) {
  const set = (k: keyof HostState) => (v: string) => setState({ ...state, [k]: v })

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        const qs = validateQuizJSON(raw)
        setState({ ...state, parsedQuestions: qs, fileError: null, fileName: file.name })
      } catch (err) {
        setState({ ...state, parsedQuestions: null, fileError: (err as Error).message, fileName: file.name })
      }
    }
    reader.readAsText(file)
  }, [state, setState])

  const canSubmit =
    state.username.trim().length >= 2 &&
    state.password.length >= 4 &&
    state.password === state.confirmPassword &&
    !!state.parsedQuestions && !state.fileError

  return (
    <div className="flex flex-col gap-4 pt-1">
      <AnimatePresence>{error && <ErrorBanner message={error} />}</AnimatePresence>
      <InputField label="Your Username" value={state.username} onChange={set('username')}
        placeholder="e.g. lakshay_punia" autoComplete="username" delay={0} />
      <InputField label="Room Password" type="password" value={state.password}
        onChange={set('password')} placeholder="Min 4 characters" autoComplete="new-password" delay={1} />
      <InputField label="Confirm Password" type="password" value={state.confirmPassword}
        onChange={set('confirmPassword')} placeholder="Re-enter password" delay={2} />
      {state.confirmPassword.length > 0 && state.password !== state.confirmPassword && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs font-semibold -mt-2" style={{ color: 'var(--red)' }}>
          Passwords do not match
        </motion.p>
      )}
      <FileUploadZone onFile={handleFile} fileName={state.fileName}
        fileError={state.fileError} questionCount={state.parsedQuestions?.length ?? 0} />
      <motion.button variants={staggerField} custom={4} initial="hidden" animate="show"
        whileHover={canSubmit && !loading ? { scale: 1.02 } : {}}
        whileTap={canSubmit && !loading ? { scale: 0.98 } : {}}
        onClick={onSubmit} disabled={!canSubmit || loading}
        className="btn-primary btn-host font-heading flex h-12 w-full items-center justify-center gap-3 text-base tracking-wide">
        {loading ? <><span className="spinner" /> Creating Room…</> : <>🚀 Create Room <span className="ml-auto text-lg">→</span></>}
      </motion.button>
    </div>
  )
}

/* ─── Join form ──────────────────────────────────────────── */
function JoinForm({ state, setState, onSubmit, loading, error }: {
  state: JoinState; setState: (s: JoinState) => void
  onSubmit: () => void; loading: boolean; error: string | null
}) {
  const set = (k: keyof JoinState) => (v: string) => setState({ ...state, [k]: v })
  const canSubmit = state.username.trim().length >= 2 && state.roomCode.trim().length >= 3 && state.password.length >= 1

  return (
    <div className="flex flex-col gap-4 pt-1">
      <AnimatePresence>{error && <ErrorBanner message={error} />}</AnimatePresence>
      <InputField label="Your Username" value={state.username} onChange={set('username')}
        placeholder="e.g. ace_pilot" autoComplete="username" delay={0} />
      <InputField label="Room Code" value={state.roomCode}
        onChange={(v) => set('roomCode')(v.toUpperCase())}
        placeholder="e.g. FLY-HIGH-423" delay={1} />
      <InputField label="Room Password" type="password" value={state.password}
        onChange={set('password')} placeholder="Enter the room password" autoComplete="current-password" delay={2} />
      <motion.button variants={staggerField} custom={3} initial="hidden" animate="show"
        whileHover={canSubmit && !loading ? { scale: 1.02 } : {}}
        whileTap={canSubmit && !loading ? { scale: 0.98 } : {}}
        onClick={onSubmit} disabled={!canSubmit || loading}
        className="btn-primary btn-join font-heading flex h-12 w-full items-center justify-center gap-3 text-base tracking-wide">
        {loading ? <><span className="spinner" /> Joining Room…</> : <>🎮 Join Room <span className="ml-auto text-lg">→</span></>}
      </motion.button>
    </div>
  )
}

/* ─── Mode card ──────────────────────────────────────────── */
function ModeCard({ id, icon, title, subtitle, accentColor, glowColor, selected, onSelect, children, tags, delay }: {
  id: Mode; icon: string; title: string; subtitle: string
  accentColor: string; glowColor: string; selected: boolean
  onSelect: () => void; children: React.ReactNode
  tags: string[]; delay: number
}) {
  return (
    <motion.div variants={fadeUp} custom={delay} initial="hidden" animate="show">
      <motion.div
        animate={{
          borderColor: selected ? accentColor + '70' : 'rgba(168,85,247,0.18)',
          boxShadow: selected
            ? `0 0 0 1px ${accentColor}25, 0 0 50px ${glowColor}20, inset 0 0 40px ${glowColor}06`
            : '0 4px 30px rgba(0,0,0,0.3)',
        }}
        transition={{ duration: 0.3 }}
        className="glass-card overflow-hidden"
      >
        {/* Header */}
        <button onClick={onSelect} className="w-full p-6 text-left transition-colors hover:bg-white/[0.02]">
          <div className="flex items-start gap-4">
            <motion.div
              animate={{ scale: selected ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.4 }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`, border: `1.5px solid ${accentColor}35` }}
            >
              {icon}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-heading text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                {selected && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}
                    className="dot-pulse inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
                )}
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
            </div>

            <motion.span animate={{ rotate: selected ? 90 : 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="mt-2 shrink-0 text-xl font-heading font-bold" style={{ color: accentColor + '90' }}>
              ›
            </motion.span>
          </div>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span key={tag} className="badge"
                style={{
                  background: [accentColor + '18', glowColor + '14', accentColor + '10'][i % 3],
                  color: [accentColor, glowColor, accentColor + 'cc'][i % 3],
                  border: `1px solid ${accentColor}28`,
                }}>
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* Expandable form */}
        <AnimatePresence>
          {selected && (
            <motion.div key="form" variants={expandForm} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
              <div className="mx-5 mb-5 border-t pt-5" style={{ borderColor: accentColor + '22' }}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hostState, setHostState] = useState<HostState>({
    username: '', password: '', confirmPassword: '',
    parsedQuestions: null, fileError: null, fileName: null,
  })
  const [joinState, setJoinState] = useState<JoinState>({ username: '', roomCode: '', password: '' })

  const selectMode = (m: Mode) => { setMode(p => p === m ? null : m); setError(null) }

  const handleCreate = async () => {
    if (!hostState.parsedQuestions) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: hostState.username.trim(), password: hostState.password, questions: hostState.parsedQuestions }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create room'); return }
      sessionStorage.setItem('afcat_session', JSON.stringify({
        userId: data.userId, username: hostState.username.trim(),
        roomCode: data.roomCode, matchId: data.matchId,
        token: data.token, livekitUrl: data.livekitUrl, isHost: true,
      }))
      router.push(`/room/${data.roomCode}`)
    } catch { setError('Network error — please try again') }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: joinState.username.trim(), roomCode: joinState.roomCode.trim(), password: joinState.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to join room'); return }
      sessionStorage.setItem('afcat_session', JSON.stringify({
        userId: data.userId, username: joinState.username.trim(),
        roomCode: data.roomCode, matchId: data.matchId,
        token: data.token, livekitUrl: data.livekitUrl, isHost: false,
      }))
      router.push(`/room/${data.roomCode}`)
    } catch { setError('Network error — please try again') }
    finally { setLoading(false) }
  }

  /* Stat colors cycled */
  const statColors = ['var(--pink)', 'var(--purple)', 'var(--cyan)', 'var(--lime)']

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Background />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-10">

        {/* ── Header ────────────────────────────────────── */}
        <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-14">
          <div className="flex items-center gap-2.5">
            <motion.span className="text-2xl" animate={{ rotate: [0, -15, 15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}>✈️</motion.span>
            <span className="font-heading text-xl font-bold" style={{
              background: 'linear-gradient(90deg, var(--pink), var(--purple), var(--cyan))',
              backgroundSize: '200%', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              AFCAT ARENA
            </span>
          </div>
          <motion.div whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5"
            style={{ borderColor: 'rgba(0,255,136,0.25)', background: 'rgba(0,255,136,0.07)' }}>
            <span className="dot-pulse inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--green)' }} />
            <span className="font-heading text-xs font-semibold" style={{ color: 'var(--green)' }}>Live</span>
          </motion.div>
        </motion.header>

        {/* ── Hero ──────────────────────────────────────── */}
        <section className="mb-12 text-center">
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6"
            style={{ borderColor: 'rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)' }}>
            <span className="text-xs">✨</span>
            <span className="font-heading text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--purple)' }}>
              Real-time · 2–3 Players · Live Video
            </span>
            <span className="text-xs">✨</span>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="show"
            className="font-heading text-6xl font-bold leading-[1.1] md:text-7xl lg:text-8xl">
            <span className="grad-text-pink block">COMPETE.</span>
            <span className="grad-text-purple block">CONQUER.</span>
            <span className="grad-text-cyan block">QUALIFY.</span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show"
            className="mt-6 text-base font-medium leading-relaxed md:text-lg"
            style={{ color: 'var(--text-muted)' }}>
            Cooperative AFCAT exam preparation with live video,<br className="hidden md:block" />
            real-time scoring, and two competitive game modes.
          </motion.p>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show"
            className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: 'Players', value: '2–3', emoji: '👥' },
              { label: 'Game Modes', value: '2', emoji: '⚡' },
              { label: 'AFCAT Sections', value: '4', emoji: '📚' },
              { label: 'Max Questions', value: '150', emoji: '🎯' },
            ].map(({ label, value, emoji }, i) => (
              <motion.div key={label} whileHover={{ scale: 1.07, y: -3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="stat-card flex flex-col items-center min-w-[90px]">
                <span className="text-lg mb-0.5">{emoji}</span>
                <div className="font-heading text-2xl font-bold" style={{ color: statColors[i] }}>{value}</div>
                <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── Mode cards ────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ModeCard id="host" icon="🚀" title="Host a Session"
            subtitle="Upload questions, set a password, invite friends"
            accentColor="#ff2d87" glowColor="#ff2d87"
            tags={['Upload JSON', 'Set Password', 'Invite Friends']}
            selected={mode === 'host'} onSelect={() => selectMode('host')} delay={4}>
            <HostForm state={hostState} setState={setHostState}
              onSubmit={handleCreate} loading={loading && mode === 'host'}
              error={mode === 'host' ? error : null} />
          </ModeCard>

          <ModeCard id="join" icon="🎮" title="Join a Session"
            subtitle="Enter a room code and compete with friends"
            accentColor="#00e5ff" glowColor="#818cf8"
            tags={['Enter Room Code', 'Live Video', 'Compete Now']}
            selected={mode === 'join'} onSelect={() => selectMode('join')} delay={5}>
            <JoinForm state={joinState} setState={setJoinState}
              onSubmit={handleJoin} loading={loading && mode === 'join'}
              error={mode === 'join' ? error : null} />
          </ModeCard>
        </section>

        {/* ── Game mode preview ──────────────────────────── */}
        <motion.section variants={fadeUp} custom={6} initial="hidden" animate="show"
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              icon: '⚡', name: 'Fastest Finger First', tag: 'SPRINT',
              desc: 'Same question for all. First correct answer locks it — 3-second countdown, then next question.',
              border: 'rgba(255,214,10,0.25)', bg: 'rgba(255,214,10,0.05)',
              tagBg: 'rgba(255,214,10,0.15)', tagColor: '#ffd60a',
              shadow: 'rgba(255,214,10,0.12)',
            },
            {
              icon: '🏁', name: 'Track & Race', tag: 'MARATHON',
              desc: 'Your own pace. 45s timer per question. Points decay the longer you take. Real-time peer tracker.',
              border: 'rgba(163,255,71,0.25)', bg: 'rgba(163,255,71,0.05)',
              tagBg: 'rgba(163,255,71,0.15)', tagColor: 'var(--lime)',
              shadow: 'rgba(163,255,71,0.1)',
            },
          ].map(({ icon, name, tag, desc, border, bg, tagBg, tagColor, shadow }) => (
            <motion.div key={name} whileHover={{ y: -4, boxShadow: `0 12px 40px ${shadow}` }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="mode-preview-card" style={{ borderColor: border, background: bg }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <h3 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</h3>
                  <span className="badge text-xs mt-0.5" style={{ background: tagBg, color: tagColor, border: `1px solid ${tagColor}30` }}>
                    {tag}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* ── Footer ────────────────────────────────────── */}
        <motion.footer variants={fadeUp} custom={7} initial="hidden" animate="show"
          className="mt-auto pt-12 text-center">
          <p className="font-heading text-xs tracking-widest uppercase" style={{ color: 'rgba(168,85,247,0.35)' }}>
            AFCAT Arena · Built for IAF aspirants ·{' '}
            <span style={{ color: 'rgba(255,45,135,0.5)' }}>Alpha</span>
          </p>
        </motion.footer>
      </div>
    </main>
  )
}

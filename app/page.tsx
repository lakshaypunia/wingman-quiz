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

/* ─── Animation variants ──────────────────────────────────── */
const SPRING: [number, number, number, number] = [0.16, 1, 0.3, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: SPRING },
  }),
}

const expandForm = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.45, ease: SPRING },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.25, ease: 'easeIn' as const },
  },
}

const staggerField = {
  hidden: { opacity: 0, x: -10 },
  show: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.1 + i * 0.07, duration: 0.35, ease: 'easeOut' as const },
  }),
}

/* ─── Small reusable atoms ───────────────────────────────── */
function InputField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  delay = 0,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  delay?: number
}) {
  return (
    <motion.div variants={staggerField} custom={delay} initial="hidden" animate="show">
      <label className="field-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="afcat-input"
      />
    </motion.div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >
      <span className="text-base">⚠</span>
      {message}
    </motion.div>
  )
}

/* ─── Animated background ────────────────────────────────── */
function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="scanline" />
      {/* Grid */}
      <div className="bg-grid absolute inset-0" />
      {/* Orb 1 — blue, top-left */}
      <div
        className="bg-orb-1 absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #0ea5e9 0%, #1d4ed8 45%, transparent 70%)' }}
      />
      {/* Orb 2 — indigo, bottom-right */}
      <div
        className="bg-orb-2 absolute -bottom-40 -right-40 h-[700px] w-[700px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #818cf8 0%, #4f46e5 40%, transparent 70%)' }}
      />
      {/* Orb 3 — cyan, center */}
      <div
        className="bg-orb-3 absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 65%)' }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% 50%, transparent 40%, rgba(2,8,16,0.7) 100%)',
        }}
      />
    </div>
  )
}

/* ─── File upload zone ───────────────────────────────────── */
function FileUploadZone({
  onFile,
  fileName,
  fileError,
  questionCount,
}: {
  onFile: (file: File) => void
  fileName: string | null
  fileError: string | null
  questionCount: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile]
  )

  const zoneClass = [
    'upload-zone p-6 text-center select-none',
    dragging ? 'drag-over' : '',
    fileError ? 'has-error' : '',
    !fileError && fileName ? 'has-file' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.div variants={staggerField} custom={3} initial="hidden" animate="show">
      <label className="field-label">Upload Questions (JSON)</label>
      <div
        className={zoneClass}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />

        {!fileName && !fileError && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📂</span>
            <p className="text-sm font-medium" style={{ color: 'var(--sky)' }}>
              Drop your JSON file here
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              or click to browse · accepts .json
            </p>
          </div>
        )}

        {fileName && !fileError && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-semibold text-emerald-400">{questionCount} questions loaded</p>
            <p className="truncate max-w-xs text-xs" style={{ color: 'var(--text-muted)' }}>
              {fileName}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Click to replace</p>
          </div>
        )}

        {fileError && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-2xl">❌</span>
            <p className="text-sm font-semibold text-red-400">Invalid file</p>
            <p className="max-w-xs text-xs text-red-400/70">{fileError}</p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Click to try again</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Host form ──────────────────────────────────────────── */
function HostForm({
  state,
  setState,
  onSubmit,
  loading,
  error,
}: {
  state: HostState
  setState: (s: HostState) => void
  onSubmit: () => void
  loading: boolean
  error: string | null
}) {
  const set = (k: keyof HostState) => (v: string) => setState({ ...state, [k]: v })

  const handleFile = useCallback(
    (file: File) => {
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
    },
    [state, setState]
  )

  const canSubmit =
    state.username.trim().length >= 2 &&
    state.password.length >= 4 &&
    state.password === state.confirmPassword &&
    !!state.parsedQuestions &&
    !state.fileError

  return (
    <div className="flex flex-col gap-4 pt-2">
      <AnimatePresence>{error && <ErrorBanner message={error} />}</AnimatePresence>

      <InputField label="Your Username" value={state.username} onChange={set('username')}
        placeholder="e.g. lakshay_punia" autoComplete="username" delay={0} />

      <InputField label="Room Password" type="password" value={state.password}
        onChange={set('password')} placeholder="Min 4 characters" autoComplete="new-password" delay={1} />

      <InputField label="Confirm Password" type="password" value={state.confirmPassword}
        onChange={set('confirmPassword')} placeholder="Re-enter password" delay={2} />

      {state.confirmPassword.length > 0 && state.password !== state.confirmPassword && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-red-400 -mt-2">
          Passwords do not match
        </motion.p>
      )}

      <FileUploadZone
        onFile={handleFile}
        fileName={state.fileName}
        fileError={state.fileError}
        questionCount={state.parsedQuestions?.length ?? 0}
      />

      <motion.button
        variants={staggerField} custom={4} initial="hidden" animate="show"
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        className="btn-primary flex h-12 w-full items-center justify-center gap-3 text-sm tracking-wide"
      >
        {loading ? (
          <><span className="spinner" /> Creating Room…</>
        ) : (
          <>Create Room <span className="ml-auto">→</span></>
        )}
      </motion.button>
    </div>
  )
}

/* ─── Join form ──────────────────────────────────────────── */
function JoinForm({
  state,
  setState,
  onSubmit,
  loading,
  error,
}: {
  state: JoinState
  setState: (s: JoinState) => void
  onSubmit: () => void
  loading: boolean
  error: string | null
}) {
  const set = (k: keyof JoinState) => (v: string) => setState({ ...state, [k]: v })
  const canSubmit = state.username.trim().length >= 2 && state.roomCode.trim().length >= 3 && state.password.length >= 1

  return (
    <div className="flex flex-col gap-4 pt-2">
      <AnimatePresence>{error && <ErrorBanner message={error} />}</AnimatePresence>

      <InputField label="Your Username" value={state.username} onChange={set('username')}
        placeholder="e.g. ace_pilot" autoComplete="username" delay={0} />

      <InputField label="Room Code" value={state.roomCode}
        onChange={(v) => set('roomCode')(v.toUpperCase())}
        placeholder="e.g. FLY-HIGH-423" delay={1} />

      <InputField label="Room Password" type="password" value={state.password}
        onChange={set('password')} placeholder="Enter the room password" autoComplete="current-password" delay={2} />

      <motion.button
        variants={staggerField} custom={3} initial="hidden" animate="show"
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        className="btn-primary flex h-12 w-full items-center justify-center gap-3 text-sm tracking-wide"
      >
        {loading ? (
          <><span className="spinner" /> Joining Room…</>
        ) : (
          <>Join Room <span className="ml-auto">→</span></>
        )}
      </motion.button>
    </div>
  )
}

/* ─── Mode card ──────────────────────────────────────────── */
function ModeCard({
  id,
  icon,
  title,
  subtitle,
  accentColor,
  selected,
  onSelect,
  children,
  delay,
}: {
  id: Mode
  icon: string
  title: string
  subtitle: string
  accentColor: string
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
  delay: number
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate="show"
      className="relative"
    >
      <motion.div
        animate={{
          borderColor: selected ? accentColor + '80' : 'rgba(56,189,248,0.15)',
          boxShadow: selected
            ? `0 0 0 1px ${accentColor}30, 0 0 40px ${accentColor}18, inset 0 0 30px ${accentColor}06`
            : '0 0 0 0px transparent',
        }}
        transition={{ duration: 0.3 }}
        className="glass-card overflow-hidden"
      >
        {/* Card header — always visible */}
        <button
          onClick={onSelect}
          className="w-full p-6 text-left transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-start gap-4">
            {/* Icon bubble */}
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
              style={{ background: accentColor + '18', border: `1px solid ${accentColor}30` }}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight" style={{ color: '#f0f9ff' }}>
                  {title}
                </h2>
                {selected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="dot-pulse inline-block h-2 w-2 rounded-full"
                    style={{ background: accentColor }}
                  />
                )}
              </div>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            </div>
            {/* Chevron */}
            <motion.span
              animate={{ rotate: selected ? 90 : 0 }}
              transition={{ duration: 0.25 }}
              className="mt-1 shrink-0 text-lg"
              style={{ color: 'var(--text-dim)' }}
            >
              ›
            </motion.span>
          </div>

          {/* Divider badge row */}
          <div className="mt-4 flex flex-wrap gap-2">
            {id === 'host' && (
              <>
                {['Upload JSON', 'Set Password', 'Invite Friends'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: accentColor + '14', color: accentColor + 'cc', border: `1px solid ${accentColor}25` }}
                  >
                    {tag}
                  </span>
                ))}
              </>
            )}
            {id === 'join' && (
              <>
                {['Enter Room Code', 'Live Video', 'Compete'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: accentColor + '14', color: accentColor + 'cc', border: `1px solid ${accentColor}25` }}
                  >
                    {tag}
                  </span>
                ))}
              </>
            )}
          </div>
        </button>

        {/* Expandable form */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="form"
              variants={expandForm}
              initial="hidden"
              animate="show"
              exit="exit"
              className="overflow-hidden"
            >
              <div
                className="mx-5 mb-5 border-t pt-5"
                style={{ borderColor: accentColor + '25' }}
              >
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
  const [joinState, setJoinState] = useState<JoinState>({
    username: '', roomCode: '', password: '',
  })

  const selectMode = (m: Mode) => {
    setMode((prev) => (prev === m ? null : m))
    setError(null)
  }

  const handleCreate = async () => {
    if (!hostState.parsedQuestions) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: hostState.username.trim(),
          password: hostState.password,
          questions: hostState.parsedQuestions,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create room'); return }

      sessionStorage.setItem(
        'afcat_session',
        JSON.stringify({
          userId: data.userId,
          username: hostState.username.trim(),
          roomCode: data.roomCode,
          matchId: data.matchId,
          token: data.token,
          livekitUrl: data.livekitUrl,
          isHost: true,
        })
      )
      router.push(`/room/${data.roomCode}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: joinState.username.trim(),
          roomCode: joinState.roomCode.trim(),
          password: joinState.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to join room'); return }

      sessionStorage.setItem(
        'afcat_session',
        JSON.stringify({
          userId: data.userId,
          username: joinState.username.trim(),
          roomCode: data.roomCode,
          matchId: data.matchId,
          token: data.token,
          livekitUrl: data.livekitUrl,
          isHost: false,
        })
      )
      router.push(`/room/${data.roomCode}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Background />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-10">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-16"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✈</span>
            <span
              className="text-lg font-black tracking-[0.18em] uppercase"
              style={{ color: 'var(--sky)' }}
            >
              AFCAT ARENA
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5"
            style={{ borderColor: 'rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.06)' }}>
            <span className="dot-pulse inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        </motion.header>

        {/* ── Hero ── */}
        <section className="mb-14 text-center">
          <motion.div
            variants={fadeUp} custom={0} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6"
            style={{ borderColor: 'rgba(129,140,248,0.25)', background: 'rgba(129,140,248,0.08)' }}
          >
            <span className="text-xs font-semibold tracking-widest uppercase text-indigo-400">
              Real-time · 2–3 Players · Live Video
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp} custom={1} initial="hidden" animate="show"
            className="text-glow text-5xl font-black tracking-tight md:text-6xl lg:text-7xl"
            style={{ color: 'var(--sky)' }}
          >
            COMPETE.
            <br />
            <span className="text-glow-indigo" style={{ color: 'var(--indigo)' }}>
              CONQUER.
            </span>
            <br />
            QUALIFY.
          </motion.h1>

          <motion.p
            variants={fadeUp} custom={2} initial="hidden" animate="show"
            className="mt-6 text-base leading-relaxed md:text-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            Cooperative AFCAT exam preparation with live video,<br className="hidden md:block" />
            real-time scoring, and two competitive game modes.
          </motion.p>

          {/* Stats row */}
          <motion.div
            variants={fadeUp} custom={3} initial="hidden" animate="show"
            className="mt-8 flex flex-wrap items-center justify-center gap-6"
          >
            {[
              { label: 'Players', value: '2–3' },
              { label: 'Game Modes', value: '2' },
              { label: 'AFCAT Sections', value: '4' },
              { label: 'Max Questions', value: '150' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold" style={{ color: 'var(--sky)' }}>{value}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Mode cards ── */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ModeCard
            id="host"
            icon="🚀"
            title="Host a Session"
            subtitle="Upload questions, set a password, and invite up to 2 friends"
            accentColor="#38bdf8"
            selected={mode === 'host'}
            onSelect={() => selectMode('host')}
            delay={4}
          >
            <HostForm
              state={hostState}
              setState={setHostState}
              onSubmit={handleCreate}
              loading={loading && mode === 'host'}
              error={mode === 'host' ? error : null}
            />
          </ModeCard>

          <ModeCard
            id="join"
            icon="🎮"
            title="Join a Session"
            subtitle="Enter a room code and password to start competing"
            accentColor="#818cf8"
            selected={mode === 'join'}
            onSelect={() => selectMode('join')}
            delay={5}
          >
            <JoinForm
              state={joinState}
              setState={setJoinState}
              onSubmit={handleJoin}
              loading={loading && mode === 'join'}
              error={mode === 'join' ? error : null}
            />
          </ModeCard>
        </section>

        {/* ── Game mode preview ── */}
        <motion.section
          variants={fadeUp} custom={6} initial="hidden" animate="show"
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {[
            {
              icon: '⚡',
              name: 'Fastest Finger First',
              desc: 'Same question for all. First correct answer locks it. 3-second countdown, then next question.',
              color: '#fbbf24',
            },
            {
              icon: '🏁',
              name: 'Track & Race',
              desc: 'Your own pace. 45-second timer per question. Score decays with time. Real-time progress bar.',
              color: '#34d399',
            },
          ].map(({ icon, name, desc, color }) => (
            <div
              key={name}
              className="rounded-xl border p-5"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: color + '20' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{icon}</span>
                <h3 className="text-sm font-bold" style={{ color }}>{name}</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </motion.section>

        {/* ── Footer ── */}
        <motion.footer
          variants={fadeUp} custom={7} initial="hidden" animate="show"
          className="mt-auto pt-12 text-center"
        >
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>
            AFCAT Arena · Built for IAF aspirants ·{' '}
            <span style={{ color: 'rgba(56,189,248,0.4)' }}>Phase 3 Alpha</span>
          </p>
        </motion.footer>
      </div>
    </main>
  )
}

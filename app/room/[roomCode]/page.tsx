'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useGameChannel } from '@/hooks/useDataChannel'
import type { GameMode } from '@/types/game'

/* ─── Helpers ─────────────────────────────────────────────── */
const COLORS = ['#e91e8c', '#7c3aed', '#0891b2', '#65a30d', '#ea580c', '#ca8a04']
function pColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

const SPRING = { type: 'spring', stiffness: 420, damping: 22 } as const
const BOUNCE = { type: 'spring', stiffness: 600, damping: 14 } as const

/* ─── Waiting dots ────────────────────────────────────────── */
function WaitingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -7, 0] }}
          transition={{ delay: i * 0.18, duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--purple)' }}
        />
      ))}
    </div>
  )
}

/* ─── Room code card ──────────────────────────────────────── */
function RoomCodeCard({
  roomCode,
  copied,
  onCopy,
}: {
  roomCode: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.05 }}
      className="lobby-section text-center"
    >
      <p className="lobby-section-title justify-center">
        <span>🏠</span> Room Code — share with friends
      </p>

      <div className="room-code-text mb-4 select-all">{roomCode}</div>

      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={BOUNCE}
        onClick={onCopy}
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-heading text-sm font-semibold transition-colors"
        style={{
          background: copied ? 'rgba(22,163,74,0.12)' : 'rgba(124,58,237,0.1)',
          border: `1.5px solid ${copied ? 'rgba(22,163,74,0.4)' : 'rgba(124,58,237,0.25)'}`,
          color: copied ? 'var(--green)' : 'var(--purple)',
        }}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span key="check"
              initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
              transition={BOUNCE}>
              ✅
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={BOUNCE}>
              📋
            </motion.span>
          )}
        </AnimatePresence>
        {copied ? 'Copied!' : 'Copy code'}
      </motion.button>

      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Players will enter this code on the home screen to join
      </p>
    </motion.div>
  )
}

/* ─── Single player card ──────────────────────────────────── */
function PlayerCard({
  identity,
  isHostPlayer,
  isSelf,
  index,
}: {
  identity: string
  isHostPlayer: boolean
  isSelf: boolean
  index: number
}) {
  const color = pColor(identity)
  const initial = identity.slice(0, 1).toUpperCase()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -10 }}
      transition={{ ...BOUNCE, delay: index * 0.08 }}
      className="player-slot"
    >
      {/* Avatar */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={BOUNCE}
        className="player-avatar"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}aa)`,
          boxShadow: `0 0 0 3px white, 0 0 0 5px ${color}55, 0 6px 20px ${color}40`,
        }}
      >
        {initial}
      </motion.div>

      {/* Name */}
      <div className="text-center">
        <p className="font-heading text-sm font-semibold truncate max-w-[88px]"
          style={{ color: 'var(--text-primary)' }}>
          {isSelf ? `${identity}` : identity}
        </p>
        {isSelf && (
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>you</span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap justify-center gap-1">
        {isHostPlayer && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={BOUNCE}
            className="badge text-xs"
            style={{ background: 'rgba(233,30,140,0.12)', color: 'var(--pink)', border: '1px solid rgba(233,30,140,0.3)' }}
          >
            HOST
          </motion.span>
        )}
        <span className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
          style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)' }}>
          <span className="dot-pulse inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--green)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>Live</span>
        </span>
      </div>
    </motion.div>
  )
}

/* ─── Empty waiting slot ──────────────────────────────────── */
function EmptySlot({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      className="player-slot"
    >
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
        className="empty-slot"
      >
        <span className="text-2xl" style={{ opacity: 0.35 }}>👤</span>
      </motion.div>
      <p className="font-heading text-xs text-center" style={{ color: 'rgba(124,58,237,0.4)' }}>
        Waiting…
      </p>
    </motion.div>
  )
}

/* ─── Player grid ─────────────────────────────────────────── */
function PlayerGrid({
  players,
  selfUsername,
  hostIdentity,
}: {
  players: Record<string, { username: string; isHost: boolean }>
  selfUsername: string
  hostIdentity: string | null
}) {
  const entries = Object.entries(players)
  const emptySlots = Math.max(0, 3 - entries.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.12 }}
      className="lobby-section"
    >
      <p className="lobby-section-title">
        <span>👥</span>
        Players
        <motion.span
          key={entries.length}
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={BOUNCE}
          className="ml-auto badge font-heading text-xs"
          style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--purple)', border: '1px solid rgba(124,58,237,0.25)' }}
        >
          {entries.length} / 3
        </motion.span>
      </p>

      <div className="flex flex-wrap gap-5 justify-center sm:justify-start">
        <AnimatePresence>
          {entries.map(([id, info], i) => (
            <PlayerCard
              key={id}
              identity={info.username}
              isHostPlayer={id === hostIdentity}
              isSelf={info.username === selfUsername}
              index={i}
            />
          ))}
        </AnimatePresence>

        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} index={i} />
        ))}
      </div>

      {entries.length < 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 rounded-xl border px-4 py-2.5 text-sm font-medium text-center"
          style={{ borderColor: 'rgba(202,138,4,0.3)', background: 'rgba(202,138,4,0.08)', color: 'var(--yellow)' }}
        >
          ⚠️ Need at least 2 players to start
        </motion.p>
      )}
    </motion.div>
  )
}

/* ─── Game mode card ──────────────────────────────────────── */
function GameModeCard({
  mode,
  icon,
  title,
  tag,
  desc,
  features,
  color,
  selected,
  onSelect,
}: {
  mode: GameMode
  icon: string
  title: string
  tag: string
  desc: string
  features: string[]
  color: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      layout
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      animate={{
        borderColor: selected ? color : `${color}33`,
        boxShadow: selected
          ? `0 0 0 2px ${color}30, 0 8px 32px ${color}25`
          : `0 2px 12px rgba(0,0,0,0.06)`,
      }}
      transition={SPRING}
      onClick={onSelect}
      className="mode-card text-left"
      style={{ borderColor: selected ? color : `${color}33` }}
    >
      {/* Selected checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }} transition={BOUNCE}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-white text-sm font-bold"
            style={{ background: color }}
          >
            ✓
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon */}
      <motion.div
        animate={{ scale: selected ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.4 }}
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
        style={{ background: `${color}18`, border: `1.5px solid ${color}35` }}
      >
        {icon}
      </motion.div>

      {/* Title + tag */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <h3 className="font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <span className="badge text-xs" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
          {tag}
        </span>
      </div>

      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>{desc}</p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-1.5">
        {features.map((f) => (
          <span key={f}
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: `${color}12`, color: `${color}cc`, border: `1px solid ${color}22` }}>
            {f}
          </span>
        ))}
      </div>
    </motion.button>
  )
}

/* ─── Game mode selector ──────────────────────────────────── */
function GameModeSelector({
  selected,
  onSelect,
}: {
  selected: GameMode | null
  onSelect: (m: GameMode) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.2 }}
      className="lobby-section"
    >
      <p className="lobby-section-title">
        <span>⚡</span> Choose Game Mode
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <GameModeCard
          mode="FASTEST_FINGER"
          icon="⚡"
          title="Fastest Finger First"
          tag="SPRINT"
          desc="Same question for everyone. First correct answer locks it — 3-second countdown, then the next question."
          features={['Synchronized', 'Speed bonus', 'Instant lock']}
          color="#ca8a04"
          selected={selected === 'FASTEST_FINGER'}
          onSelect={() => onSelect('FASTEST_FINGER')}
        />
        <GameModeCard
          mode="TRACK_AND_RACE"
          icon="🏁"
          title="Track & Race"
          tag="MARATHON"
          desc="Answer at your own pace. 45-second timer per question. Score decays with time. See your peers on a live tracker."
          features={['Your own pace', '45s per question', 'Live progress bar']}
          color="#65a30d"
          selected={selected === 'TRACK_AND_RACE'}
          onSelect={() => onSelect('TRACK_AND_RACE')}
        />
      </div>
    </motion.div>
  )
}

/* ─── Action section ──────────────────────────────────────── */
function ActionSection({
  isHost,
  canStart,
  starting,
  selectedMode,
  playerCount,
  onStart,
}: {
  isHost: boolean
  canStart: boolean
  starting: boolean
  selectedMode: GameMode | null
  playerCount: number
  onStart: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.28 }}
    >
      {isHost ? (
        <div className="flex flex-col items-center gap-3">
          {!selectedMode && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              👆 Pick a game mode above to continue
            </motion.p>
          )}
          <motion.button
            whileHover={canStart ? { scale: 1.04, y: -2 } : {}}
            whileTap={canStart ? { scale: 0.96 } : {}}
            onClick={onStart}
            disabled={!canStart || starting}
            className={`btn-primary btn-host font-heading flex h-14 w-full max-w-sm items-center justify-center gap-3 text-lg ${canStart ? 'btn-ready' : ''}`}
          >
            {starting ? (
              <><span className="spinner" /> Launching…</>
            ) : (
              <>
                <motion.span
                  animate={canStart ? { rotate: [0, -15, 15, 0] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
                >
                  🚀
                </motion.span>
                Start Game
                <span className="ml-auto text-xl">→</span>
              </>
            )}
          </motion.button>

          {playerCount < 2 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Waiting for at least one more player to join
            </p>
          )}
        </div>
      ) : (
        <motion.div
          className="lobby-section flex flex-col items-center gap-4 py-8"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <WaitingDots />
          <p className="font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Waiting for the host to start…
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sit tight! The game will begin automatically
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

/* ─── Host-transfer banner ────────────────────────────────── */
function HostTransferBanner({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="lobby-section flex items-center gap-3"
          style={{ borderColor: 'rgba(233,30,140,0.35)', background: 'rgba(233,30,140,0.08)' }}
        >
          <span className="text-2xl">👑</span>
          <div>
            <p className="font-heading text-base font-semibold" style={{ color: 'var(--pink)' }}>
              You are now the host!
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              The previous host left. Pick a game mode and start when ready.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Main lobby page ─────────────────────────────────────── */
export default function LobbyPage() {
  const params  = useParams()
  const roomCode = (params.roomCode as string).toUpperCase()
  const router  = useRouter()

  const session      = useGameStore((s) => s.session)
  const players      = useGameStore((s) => s.players)
  const phase        = useGameStore((s) => s.phase)
  const hostIdentity = useGameStore((s) => s.hostIdentity)
  const handleMsg    = useGameStore((s) => s.handleMessage)

  const { sendMessage } = useGameChannel()

  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
  const [copied, setCopied]             = useState(false)
  const [starting, setStarting]         = useState(false)
  const [showTransferBanner, setShowTransferBanner] = useState(false)

  // Detect when this client becomes the new host (host transfer)
  const prevHostRef = useRef<string | null>(null)
  useEffect(() => {
    if (
      prevHostRef.current !== null &&               // not the initial assignment
      prevHostRef.current !== hostIdentity &&        // host actually changed
      hostIdentity === session?.username             // we became the new host
    ) {
      setShowTransferBanner(true)
      setTimeout(() => setShowTransferBanner(false), 5000)
    }
    prevHostRef.current = hostIdentity
  }, [hostIdentity, session?.username])

  const playerEntries = Object.entries(players)

  // Effective host check — uses joinedAt-ordered hostIdentity, not sessionStorage flag
  const iAmHost  = !!session && hostIdentity === session.username
  const canStart = iAmHost && selectedMode !== null && playerEntries.length >= 2

  // Navigate all clients when game starts
  useEffect(() => {
    if (phase === 'playing') router.push(`/room/${roomCode}/play`)
  }, [phase, roomCode, router])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const handleStart = async () => {
    if (!canStart || starting || !selectedMode) return
    setStarting(true)

    // Persist gameMode to MongoDB before broadcasting so any client that
    // misses the GAME_START data-channel message can recover via GET.
    await fetch(`/api/rooms/${roomCode}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameMode: selectedMode }),
    }).catch(console.error)

    const msg = { type: 'GAME_START' as const, gameMode: selectedMode }
    await sendMessage(msg)
    handleMsg(msg)  // sender doesn't receive own data channel message
  }

  if (!session) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-purple-300 border-t-purple-600"
        />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-152px)] px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">

        {/* ── Host-transfer notification ── */}
        <HostTransferBanner show={showTransferBanner} />

        {/* ── Room code ── */}
        <RoomCodeCard roomCode={roomCode} copied={copied} onCopy={handleCopy} />

        {/* ── Players ── */}
        <PlayerGrid
          players={players}
          selfUsername={session.username}
          hostIdentity={hostIdentity}
        />

        {/* ── Game mode selector (effective host only) ── */}
        {iAmHost && (
          <GameModeSelector selected={selectedMode} onSelect={setSelectedMode} />
        )}

        {/* ── Start / waiting ── */}
        <ActionSection
          isHost={iAmHost}
          canStart={canStart}
          starting={starting}
          selectedMode={selectedMode}
          playerCount={playerEntries.length}
          onStart={handleStart}
        />

      </div>
    </div>
  )
}

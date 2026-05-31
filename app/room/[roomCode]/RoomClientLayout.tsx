'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LiveKitRoom, RoomAudioRenderer, useParticipants } from '@livekit/components-react'
import '@livekit/components-styles'
import VideoOverlay from '@/components/VideoOverlay'
import { useGameSync } from '@/hooks/useGameSync'
import { useGameStore } from '@/store/gameStore'
import type { RoomSession } from '@/types/game'

interface SessionData {
  userId: string
  username: string
  roomCode: string
  matchId: string
  token: string
  livekitUrl: string
  isHost: boolean
}

/* ─── Inner component: must live inside <LiveKitRoom> ─────── */
function GameSync({ session }: { session: SessionData }) {
  const setSession  = useGameStore((s) => s.setSession)
  const setQuestions = useGameStore((s) => s.setQuestions)
  const addPlayer   = useGameStore((s) => s.addPlayer)
  const removePlayer = useGameStore((s) => s.removePlayer)

  // Wire LiveKit data channel → Zustand handleMessage
  useGameSync()

  // Sync LiveKit participants → store.players
  const participants = useParticipants()
  const prevIds = useRef(new Set<string>())

  useEffect(() => {
    const current = new Set(participants.map((p) => p.identity))

    // Joined
    participants.forEach((p) => {
      if (!prevIds.current.has(p.identity)) {
        addPlayer(p.identity, {
          username: p.identity,
          isHost: p.identity === session.username && session.isHost,
        })
      }
    })

    // Left
    prevIds.current.forEach((id) => {
      if (!current.has(id)) removePlayer(id)
    })

    prevIds.current = current
  }, [participants, session.username, session.isHost, addPlayer, removePlayer])

  // Seed session + fetch questions once on mount
  useEffect(() => {
    const roomSession: RoomSession = {
      userId: session.userId,
      username: session.username,
      roomCode: session.roomCode,
      isHost: session.isHost,
    }
    setSession(roomSession)

    fetch(`/api/rooms/${session.roomCode}`)
      .then((r) => r.json())
      .then((data) => { if (data.questions) setQuestions(data.questions) })
      .catch((e) => console.error('[GameSync] fetch questions', e))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

/* ─── Outer layout ────────────────────────────────────────── */
export default function RoomClientLayout({
  children,
  roomCode,
}: {
  children: React.ReactNode
  roomCode: string
}) {
  const router = useRouter()
  const [session, setSessionData] = useState<SessionData | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('afcat_session')
    if (!raw) { router.replace('/'); return }
    try {
      const parsed: SessionData = JSON.parse(raw)
      if (parsed.roomCode !== roomCode) { router.replace('/'); return }
      setSessionData(parsed)
    } catch {
      router.replace('/')
    } finally {
      setChecked(true)
    }
  }, [roomCode, router])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!session) return null

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.livekitUrl}
      connect={true}
      audio={true}
      video={true}
      onError={(err) => console.error('[LiveKit]', err)}
    >
      <RoomAudioRenderer />

      {/* Wires data channel + participants → Zustand store */}
      <GameSync session={session} />

      {/* Persistent video bar */}
      <VideoOverlay session={session} />

      {/* Page content below 152px video bar */}
      <div style={{ paddingTop: '152px' }}>
        {children}
      </div>
    </LiveKitRoom>
  )
}

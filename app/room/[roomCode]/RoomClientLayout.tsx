'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react'
import '@livekit/components-styles'
import VideoOverlay from '@/components/VideoOverlay'

interface SessionData {
  userId: string
  username: string
  roomCode: string
  matchId: string
  token: string
  livekitUrl: string
  isHost: boolean
}

export default function RoomClientLayout({
  children,
  roomCode,
}: {
  children: React.ReactNode
  roomCode: string
}) {
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('afcat_session')
    if (!raw) { router.replace('/'); return }
    try {
      const parsed: SessionData = JSON.parse(raw)
      if (parsed.roomCode !== roomCode) { router.replace('/'); return }
      setSession(parsed)
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
      {/* Renders audio for all remote participants automatically */}
      <RoomAudioRenderer />

      {/* Persistent video bar — never unmounts during game navigation */}
      <VideoOverlay session={session} />

      {/* Page content sits below the 152px video bar */}
      <div style={{ paddingTop: '152px' }}>
        {children}
      </div>
    </LiveKitRoom>
  )
}

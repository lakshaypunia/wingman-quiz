'use client'

import { useTracks, useLocalParticipant, isTrackReference } from '@livekit/components-react'
import { Track } from 'livekit-client'
import VideoTile from './VideoTile'
import { useGameStore } from '@/store/gameStore'

interface SessionData {
  userId: string
  username: string
  roomCode: string
  isHost: boolean
}

export default function VideoOverlay({ session }: { session: SessionData }) {
  const { localParticipant } = useLocalParticipant()
  const hostIdentity = useGameStore((s) => s.hostIdentity)

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1.5px solid rgba(124,58,237,0.15)',
        boxShadow: '0 4px 30px rgba(124,58,237,0.1)',
        height: '152px',
      }}
    >
      <div className="mx-auto flex h-full max-w-5xl items-start gap-3 px-4 pt-3 pb-2">

        {/* Room info — left side */}
        <div className="flex flex-col justify-between h-full mr-2 shrink-0">
          <div>
            <p className="font-heading text-xs font-bold tracking-widest uppercase"
              style={{ color: 'var(--purple)' }}>AFCAT ARENA</p>
            <p className="font-heading text-lg font-semibold leading-tight mt-0.5"
              style={{ color: 'var(--text-primary)' }}>{session.roomCode}</p>
          </div>
          {hostIdentity === session.username && (
            <span className="badge mb-1"
              style={{ background: 'rgba(233,30,140,0.12)', color: 'var(--pink)', border: '1px solid rgba(233,30,140,0.25)', fontSize: '0.65rem' }}>
              👑 HOST
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-full w-px shrink-0 self-stretch"
          style={{ background: 'rgba(124,58,237,0.15)' }} />

        {/* Video tiles */}
        <div className="flex flex-1 items-start gap-3 overflow-x-auto pb-1">
          {tracks.map((trackRef) => {
            const identity = trackRef.participant.identity
            const isLocal = identity === localParticipant?.identity
            return (
              <VideoTile
                key={identity}
                trackRef={trackRef}
                identity={identity}
                isLocal={isLocal}
                hasVideo={isTrackReference(trackRef) && !trackRef.publication?.isMuted}
              />
            )
          })}
        </div>

        {/* Mic / cam mute toggles would go here in Phase 10 */}

      </div>
    </div>
  )
}

'use client'

import { VideoTrack, isTrackReference } from '@livekit/components-react'
import type { TrackReferenceOrPlaceholder } from '@livekit/components-react'
import EmojiTray from './EmojiTray'

const TILE_COLORS = ['#e91e8c', '#7c3aed', '#0891b2', '#65a30d', '#ea580c']

function getColor(identity: string) {
  let hash = 0
  for (const ch of identity) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length]
}

export default function VideoTile({
  trackRef,
  identity,
  isLocal,
  hasVideo,
}: {
  trackRef: TrackReferenceOrPlaceholder
  identity: string
  isLocal: boolean
  hasVideo: boolean
}) {
  const color = getColor(identity)

  return (
    <div className="relative shrink-0 flex flex-col items-center gap-1.5" style={{ width: 120 }}>

      {/* Video frame */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          width: 120, height: 88,
          border: `2px solid ${color}40`,
          boxShadow: `0 0 14px ${color}22`,
          background: `${color}12`,
        }}
      >
        {isTrackReference(trackRef) && hasVideo ? (
          <VideoTrack
            trackRef={trackRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full font-heading text-xl font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
            >
              {identity.slice(0, 1).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Name badge */}
      <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <span className="dot-pulse inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span className="font-heading text-xs font-semibold truncate max-w-[80px]"
          style={{ color: 'var(--text-primary)' }}>
          {isLocal ? `${identity} (you)` : identity}
        </span>
      </div>

      {/* Emoji tray — only under other players' tiles */}
      {!isLocal && <EmojiTray targetId={identity} />}
    </div>
  )
}

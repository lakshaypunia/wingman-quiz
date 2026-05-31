import { AccessToken } from 'livekit-server-sdk'

// Server-only — never import this in a client component.
// LiveKit server SDK uses Node.js native modules.

export async function generateToken(roomName: string, participantName: string): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be defined')
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: '4h',
  })

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  return await token.toJwt()
}

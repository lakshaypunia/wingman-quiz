// SERVER-ONLY — imports from next/headers. Never import this in a client component.
import { cookies } from 'next/headers'
import type { RoomSession } from '@/types/game'

const SESSION_COOKIE = 'afcat_session'

export async function getSession(): Promise<RoomSession | null> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as RoomSession
  } catch {
    return null
  }
}

export async function setSession(session: RoomSession): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 4,
    path: '/',
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

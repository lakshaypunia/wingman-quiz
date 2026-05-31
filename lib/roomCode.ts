const WORDS_A = ['FLY', 'ACE', 'SKY', 'JET', 'AIR', 'TOP', 'WAR', 'OPS', 'TAC', 'MIG']
const WORDS_B = ['HIGH', 'RISE', 'BOLT', 'WING', 'BASE', 'ZONE', 'DECK', 'FAST', 'HAWK', 'FIRE']

export function generateRoomCode(): string {
  const a = WORDS_A[Math.floor(Math.random() * WORDS_A.length)]
  const b = WORDS_B[Math.floor(Math.random() * WORDS_B.length)]
  const n = Math.floor(Math.random() * 900) + 100
  return `${a}-${b}-${n}`
}

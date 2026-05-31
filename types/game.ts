export type AFCATSection =
  | 'Verbal Ability'
  | 'Numerical Ability'
  | 'Spatial Ability'
  | 'General Awareness'

export type GameMode = 'FASTEST_FINGER' | 'TRACK_AND_RACE'
export type MatchPhase = 'lobby' | 'playing' | 'results'

export interface Question {
  questionId: number
  section: AFCATSection
  question: string
  options: string[]
  correctAnswer: string
  timeLimitSeconds: number
}

export interface PlayerProgress {
  currentQuestionIndex: number
  score: number
  done: boolean
  answers: Record<number, { answer: string; timestamp: number; correct: boolean }>
}

export interface LiveState {
  currentGlobalQuestion: number
  lockedQuestions: Record<number, string>
  playerProgress: Record<string, PlayerProgress>
}

export interface SectionStats {
  correct: number
  total: number
  points: number
}

export interface PlayerResult {
  userId: string
  username: string
  totalScore: number
  accuracyRate: number
  avgResponseTime: number
  sectionBreakdown: Partial<Record<AFCATSection, SectionStats>>
}

// LiveKit data channel message protocol — all real-time game events flow through here.
// MongoDB is only written at room creation and match finalization, never mid-game.
export type GameMessage =
  | { type: 'ANSWER_SUBMITTED'; playerId: string; questionId: number; answer: string; timestamp: number }
  | { type: 'QUESTION_LOCKED'; questionId: number; winnerId: string }
  | { type: 'ADVANCE_QUESTION'; questionId: number }
  | { type: 'PROGRESS_UPDATE'; playerId: string; questionIndex: number; score: number; done?: boolean }
  | { type: 'EMOJI'; senderId: string; targetId: string; emoji: string }
  | { type: 'GAME_START'; gameMode: GameMode }
  | { type: 'MATCH_END' }

export interface RoomSession {
  userId: string
  username: string
  roomCode: string
  isHost: boolean
}

export interface EmojiReaction {
  id: string
  emoji: string
  side: 'left' | 'right'
  bottomPercent: number  // 25–70 vh
  size: number           // px font-size
}

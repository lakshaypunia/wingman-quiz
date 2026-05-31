import { create } from 'zustand'
import type {
  GameMode,
  MatchPhase,
  Question,
  PlayerProgress,
  PlayerResult,
  GameMessage,
  RoomSession,
  EmojiReaction,
} from '@/types/game'

export interface PlayerInfo {
  username: string
  isHost: boolean
}

interface GameState {
  /* ── Identity ─────────────────────────────────── */
  session: RoomSession | null

  /* ── Room participants ────────────────────────── */
  players: Record<string, PlayerInfo>

  /* ── Quiz content ─────────────────────────────── */
  questions: Question[]

  /* ── Game phase ───────────────────────────────── */
  phase: MatchPhase
  gameMode: GameMode | null

  /* ── Fastest Finger First state ───────────────── */
  currentGlobalQuestion: number
  lockedQuestions: Record<number, string>   // questionId → winnerId

  /* ── Per-player progress (both modes) ─────────── */
  playerProgress: Record<string, PlayerProgress>

  /* ── Final results ────────────────────────────── */
  finalResults: PlayerResult[]

  /* ── Emoji reactions (floating overlay) ──────── */
  activeEmojiReactions: EmojiReaction[]

  /* ── Effective host (recomputed live from participant join order) */
  hostIdentity: string | null

  /* ── Actions ──────────────────────────────────── */
  setSession: (s: RoomSession) => void
  setQuestions: (q: Question[]) => void
  setPhase: (p: MatchPhase) => void
  setGameMode: (m: GameMode) => void
  addPlayer: (id: string, info: PlayerInfo) => void
  removePlayer: (id: string) => void
  setFinalResults: (results: PlayerResult[]) => void
  removeEmojiReaction: (id: string) => void
  setHostIdentity: (id: string | null) => void
  handleMessage: (msg: GameMessage) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  session: null,
  players: {},
  questions: [],
  phase: 'lobby',
  gameMode: null,
  currentGlobalQuestion: 0,
  lockedQuestions: {},
  playerProgress: {},
  finalResults: [],
  activeEmojiReactions: [],
  hostIdentity: null,

  setSession: (s) => set({ session: s }),

  setQuestions: (q) => set({ questions: q }),

  setPhase: (p) => set({ phase: p }),

  setGameMode: (m) => set({ gameMode: m }),

  addPlayer: (id, info) =>
    set((state) => ({ players: { ...state.players, [id]: info } })),

  removePlayer: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.players
      return { players: rest }
    }),

  setFinalResults: (results) => set({ finalResults: results }),

  removeEmojiReaction: (id) =>
    set((state) => ({
      activeEmojiReactions: state.activeEmojiReactions.filter((r) => r.id !== id),
    })),

  setHostIdentity: (id) => set({ hostIdentity: id }),

  handleMessage: (msg) => {
    switch (msg.type) {

      case 'GAME_START':
        set({ phase: 'playing', gameMode: msg.gameMode })
        break

      case 'ANSWER_SUBMITTED': {
        const { playerId, questionId, answer, timestamp } = msg
        const question = get().questions.find((q) => q.questionId === questionId)
        const correct = question?.correctAnswer === answer

        set((state) => {
          const prev = state.playerProgress[playerId] ?? {
            currentQuestionIndex: 0, score: 0, done: false, answers: {},
          }
          return {
            playerProgress: {
              ...state.playerProgress,
              [playerId]: {
                ...prev,
                answers: {
                  ...prev.answers,
                  [questionId]: { answer, timestamp, correct: correct ?? false },
                },
              },
            },
          }
        })
        break
      }

      case 'QUESTION_LOCKED':
        // First-wins: ignore if this question is already locked
        set((state) => {
          if (state.lockedQuestions[msg.questionId] !== undefined) return state
          return {
            lockedQuestions: {
              ...state.lockedQuestions,
              [msg.questionId]: msg.winnerId,
            },
          }
        })
        break

      case 'ADVANCE_QUESTION':
        // Guard: only advance if this questionId matches the current question
        set((state) => {
          const current = state.questions[state.currentGlobalQuestion]
          if (current?.questionId !== msg.questionId) return state
          return { currentGlobalQuestion: state.currentGlobalQuestion + 1 }
        })
        break

      case 'PROGRESS_UPDATE':
        set((state) => {
          const prev = state.playerProgress[msg.playerId] ?? {
            currentQuestionIndex: 0, score: 0, done: false, answers: {},
          }
          return {
            playerProgress: {
              ...state.playerProgress,
              [msg.playerId]: {
                ...prev,
                currentQuestionIndex: msg.questionIndex,
                score: msg.score,
                done: msg.done ?? prev.done,
              },
            },
          }
        })
        break

      case 'MATCH_END':
        set({ phase: 'results' })
        break

      case 'EMOJI': {
        const id = Math.random().toString(36).slice(2)
        const reaction: EmojiReaction = {
          id,
          emoji: msg.emoji,
          side: Math.random() > 0.5 ? 'left' : 'right',
          bottomPercent: 25 + Math.random() * 45,
          size: 28 + Math.floor(Math.random() * 20),
        }
        set((state) => ({
          activeEmojiReactions: [...state.activeEmojiReactions, reaction],
        }))
        // Auto-remove after animation completes
        setTimeout(() => {
          set((state) => ({
            activeEmojiReactions: state.activeEmojiReactions.filter((r) => r.id !== id),
          }))
        }, 2800)
        break
      }
    }
  },
}))

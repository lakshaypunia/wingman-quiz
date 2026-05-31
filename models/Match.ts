import mongoose, { Document, Model, Schema, Types } from 'mongoose'
import type { GameMode, LiveState, PlayerResult, AFCATSection } from '@/types/game'

export interface IMatch extends Document {
  quizId: Types.ObjectId
  roomCode: string
  gameMode: GameMode
  isActive: boolean
  participants: Types.ObjectId[]
  liveState: LiveState
  finalResults: PlayerResult[]
  createdAt: Date
  endedAt?: Date
}

const SectionStatsSchema = new Schema(
  {
    correct: { type: Number, required: true },
    total: { type: Number, required: true },
    points: { type: Number, required: true },
  },
  { _id: false }
)

const PlayerResultSchema = new Schema<PlayerResult>(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    totalScore: { type: Number, required: true },
    accuracyRate: { type: Number, required: true },
    avgResponseTime: { type: Number, required: true },
    sectionBreakdown: {
      type: Map,
      of: SectionStatsSchema,
    },
  },
  { _id: false }
)

// liveState is mutated exclusively via LiveKit data channels during gameplay.
// It is only read/written by MongoDB at initialization and finalization.
const MatchSchema = new Schema<IMatch>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    roomCode: { type: String, required: true, index: true },
    gameMode: {
      type: String,
      enum: ['FASTEST_FINGER', 'TRACK_AND_RACE'] satisfies GameMode[],
      default: 'FASTEST_FINGER',
    },
    isActive: { type: Boolean, default: true, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    liveState: {
      type: Schema.Types.Mixed,
      default: (): LiveState => ({
        currentGlobalQuestion: 0,
        lockedQuestions: {},
        playerProgress: {},
      }),
    },
    finalResults: { type: [PlayerResultSchema], default: [] },
    endedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// Auto-expire rooms 4 hours after creation to prevent stale session accumulation.
// Completed matches persist their finalResults in the document before expiry.
MatchSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14400 })

const Match: Model<IMatch> =
  (mongoose.models.Match as Model<IMatch>) || mongoose.model<IMatch>('Match', MatchSchema)

export default Match

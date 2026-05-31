import mongoose, { Document, Model, Schema, Types } from 'mongoose'
import type { AFCATSection, Question } from '@/types/game'

export interface IQuiz extends Document {
  roomCode: string
  roomPasswordHash: string
  createdBy: Types.ObjectId
  questions: Question[]
  createdAt: Date
}

const QuestionSchema = new Schema<Question>(
  {
    questionId: { type: Number, required: true },
    section: {
      type: String,
      required: true,
      enum: ['Verbal Ability', 'Numerical Ability', 'Spatial Ability', 'General Awareness'] satisfies AFCATSection[],
    },
    question: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: (v: string[]) => v.length === 4,
    },
    correctAnswer: { type: String, required: true },
    timeLimitSeconds: { type: Number, required: true, default: 45 },
  },
  { _id: false }
)

const QuizSchema = new Schema<IQuiz>(
  {
    roomCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    roomPasswordHash: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questions: { type: [QuestionSchema], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const Quiz: Model<IQuiz> =
  (mongoose.models.Quiz as Model<IQuiz>) || mongoose.model<IQuiz>('Quiz', QuizSchema)

export default Quiz

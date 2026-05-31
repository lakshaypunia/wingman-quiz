import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IUser extends Document {
  username: string
  createdAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema)

export default User

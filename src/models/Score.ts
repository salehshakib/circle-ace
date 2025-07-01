import mongoose, { Schema, Document } from 'mongoose';

export interface IScore extends Document {
  username: string;
  score: number;
  time: number;
  createdAt: Date;
}

const ScoreSchema: Schema = new Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [0, 'Score cannot be negative']
  },
  time: {
    type: Number,
    required: [true, 'Time is required'],
    min: [0, 'Time cannot be negative']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ScoreSchema.index({ score: -1, time: 1 });

export default mongoose.models.Score || mongoose.model<IScore>('Score', ScoreSchema);
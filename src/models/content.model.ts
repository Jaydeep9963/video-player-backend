import mongoose from 'mongoose';

export interface IContent extends mongoose.Document {
  type: string;
  content: string;
}

const contentSchema = new mongoose.Schema<IContent>(
  {
    type: {
      type: String,
      required: true,
      enum: ['privacy-policy', 'terms-and-conditions', 'about-us'],
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Content = mongoose.model<IContent>('Content', contentSchema);

export default Content;
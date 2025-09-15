import mongoose from "mongoose";

export interface IFeedback extends mongoose.Document {
  name: string;
  mobile: string;
  description: string;
}

const feedbackSchema = new mongoose.Schema<IFeedback>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Feedback = mongoose.model<IFeedback>("Feedback", feedbackSchema);

export default Feedback;

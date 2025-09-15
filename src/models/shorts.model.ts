import mongoose from "mongoose";

export interface IShorts extends mongoose.Document {
  title: string;
  description: string;
  fileName?: string;
  filePath?: string;
  youtubeUrl?: string;
  platform: "upload" | "youtube";
  thumbnailPath: string;
  duration: number;
  views: number;
  isPublished: boolean;
}

const shortsSchema = new mongoose.Schema<IShorts>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    filePath: {
      type: String,
      trim: true,
    },
    youtubeUrl: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["upload", "youtube"],
      required: true,
      default: "upload",
    },
    thumbnailPath: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add text index for search functionality
shortsSchema.index({ title: "text", description: "text" });

const Shorts = mongoose.model<IShorts>("Shorts", shortsSchema);

export default Shorts;

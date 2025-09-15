import mongoose from "mongoose";

export interface IVideo extends mongoose.Document {
  title: string;
  description: string;
  fileName?: string;
  filePath?: string;
  youtubeUrl?: string;
  platform: "upload" | "youtube";
  thumbnailPath: string;
  duration: number;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  artist?: mongoose.Types.ObjectId;
  views: number;
  isPublished: boolean;
}

const videoSchema = new mongoose.Schema<IVideo>(
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
    category: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Subcategory",
    },
    artist: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Artist",
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
videoSchema.index({ title: "text", description: "text" });

const Video = mongoose.model<IVideo>("Video", videoSchema);

export default Video;

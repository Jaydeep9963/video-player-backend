import mongoose from 'mongoose';

export interface IArtist extends mongoose.Document {
  name: string;
  bio: string;
  image: string;
}

const artistSchema = new mongoose.Schema<IArtist>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Artist = mongoose.model<IArtist>('Artist', artistSchema);

export default Artist;
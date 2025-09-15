import mongoose from 'mongoose';

export interface ICategory extends mongoose.Document {
  name: string;
  description: string;
  image: string;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
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

const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category;
import mongoose from 'mongoose';

export interface ISubcategory extends mongoose.Document {
  name: string;
  description: string;
  category: mongoose.Types.ObjectId;
  image: string;
}

const subcategorySchema = new mongoose.Schema<ISubcategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Category',
      required: true,
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

// Compound index to ensure unique subcategory names within a category
subcategorySchema.index({ name: 1, category: 1 }, { unique: true });

const Subcategory = mongoose.model<ISubcategory>('Subcategory', subcategorySchema);

export default Subcategory;
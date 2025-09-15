import httpStatus from 'http-status';
import { Request, Response } from 'express';
import Category from '../models/category.model';
import Subcategory from '../models/subcategory.model';
import Video from '../models/video.model';
import Shorts from '../models/shorts.model';
import Feedback from '../models/feedback.model';


type ItemWithDate = {
  _id: string;
  title?: string;
  type: "video" | "short";
  updatedAt: Date;
  [key: string]: any; // for other fields
};

/**
 * Get overview statistics for admin dashboard
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    const categoryCount = await Category.countDocuments();
    const subcategoryCount = await Subcategory.countDocuments();
    const videoCount = await Video.countDocuments();
    const shortsCount = await Shorts.countDocuments();
    const feedbackCount = await Feedback.countDocuments();

    const [videosRaw, shortsRaw] = await Promise.all([
      Video.find()
        .populate("category", "name")
        .populate("subcategory", "name")
        .lean(),
      Shorts.find().lean(),
    ]);

    // Map to type-safe objects with updatedAt
    const videos: ItemWithDate[] = videosRaw.map((v) => ({
      ...(v as any),
      type: "video",
      updatedAt: (v as any).updatedAt || (v as any).createdAt,
    }));

    const shorts: ItemWithDate[] = shortsRaw.map((s) => ({
      ...(s as any),
      type: "short",
      updatedAt: (s as any).updatedAt || (s as any).createdAt,
    }));

    const combined = [...videos, ...shorts].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    const recentItems = combined.slice(0, 5);

    return res.status(httpStatus.OK).send({
      counts: {
        categories: categoryCount,
        subcategories: subcategoryCount,
        videos: videoCount,
        shorts: shortsCount,
        feedback: feedbackCount,
      },
      recentItems,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching overview data" });
  }
};

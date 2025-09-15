import httpStatus from "http-status";
import { Request, Response } from "express";
import Video from "../models/video.model";
import Shorts from "../models/shorts.model";

/**
 * Search for videos and shorts
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const searchContent = async (req: Request, res: Response) => {
  try {
    const { query, type } = req.query;

    if (!query) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: "Search query is required" });
    }

    const searchQuery = { $text: { $search: query as string } };
    let videos: (typeof Video)[] = [];
    let shorts: (typeof Shorts)[] = [];

    // Search based on type parameter or search both if not specified
    if (!type || type === "videos") {
      videos = await Video.find(searchQuery)
        .populate("category", "name")
        .populate("subcategory", "name");
    }

    if (!type || type === "shorts") {
      shorts = await Shorts.find(searchQuery);
    }

    return res.status(httpStatus.OK).send({
      videos,
      shorts,
    });
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error searching content" });
  }
};

import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import Shorts from "../models/shorts.model";
import { getVideoDuration } from "../utils/videoProcessor";
import {
  getYouTubeVideoInfo,
  isValidYouTubeUrl,
} from "../utils/youtubeProcessor";

/**
 * Upload and create a short video
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const uploadShorts = async (req: Request, res: Response) => {
  try {
    const { title, description, youtubeUrl, platform = "upload" } = req.body;

    let fileName: string | undefined;
    let filePath: string | undefined;
    let thumbnailPath: string;
    let duration = 0;

    if (platform === "youtube") {
      // For YouTube shorts
      if (!youtubeUrl) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "YouTube URL is required for YouTube platform" });
      }

      // Validate YouTube URL
      if (!isValidYouTubeUrl(youtubeUrl)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Invalid YouTube URL" });
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };
      const thumbnailFile = files?.thumbnail?.[0];

      if (!thumbnailFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Thumbnail file is required" });
      }

      thumbnailPath = thumbnailFile.path;

      // Get duration from YouTube API (or fallback to request body)
      try {
        const youtubeInfo = await getYouTubeVideoInfo(youtubeUrl);
        duration = youtubeInfo.duration;
        console.log(`YouTube shorts duration: ${duration} seconds`);

        // Optionally use YouTube title/description if not provided
        if (!title && youtubeInfo.title) {
          req.body.title = youtubeInfo.title;
        }
        if (!description && youtubeInfo.description) {
          req.body.description = youtubeInfo.description?.substring(0, 500); // Limit description length
        }
      } catch (error) {
        console.warn(
          "Could not get YouTube shorts info, using fallback:",
          error
        );
        // Fallback to request body duration or 0
        duration = req.body.duration ? Number(req.body.duration) : 0;
      }
    } else {
      // For uploaded shorts
      const shortsFile = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
      )?.shorts?.[0];
      const thumbnailFile = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
      )?.thumbnail?.[0];

      if (!shortsFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "No shorts file uploaded" });
      }

      fileName = shortsFile.filename;
      filePath = shortsFile.path;

      if (!thumbnailFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Thumbnail file is required" });
      }

      thumbnailPath = thumbnailFile.path;

      // Get actual video duration using ffprobe
      try {
        duration = await getVideoDuration(filePath);
      } catch (error) {
        console.warn("Could not get video duration:", error);
        // If ffprobe fails, use duration from request body or default to 0
        duration = req.body.duration ? Number(req.body.duration) : 0;
      }
    }

    // Create shorts record
    const shorts = await Shorts.create({
      title,
      description,
      fileName,
      filePath,
      youtubeUrl: platform === "youtube" ? youtubeUrl : undefined,
      platform,
      thumbnailPath,
      duration,
      views: 0,
      isPublished: true,
    });

    return res.status(httpStatus.CREATED).send(shorts);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error uploading shorts" });
  }
};

/**
 * Get all shorts with filtering and pagination
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getShorts = async (req: Request, res: Response) => {
  try {
    const { search, platform, sortBy = "createdAt" } = req.query;

    const filter: any = { isPublished: true };

    // Apply platform filter if provided
    if (platform) filter.platform = platform;

    // Text search if provided (Spotify-like search)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { $text: { $search: search as string } },
      ];
    }

    const options = {
      sort: { [sortBy as string]: -1 },
    };

    const shorts = await Shorts.find(filter, null, options);

    return res.status(httpStatus.OK).send(shorts);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching shorts" });
  }
};

/**
 * Get a short by ID
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getShortById = async (req: Request, res: Response) => {
  try {
    const { shortsId } = req.params;

    const shorts = await Shorts.findById(shortsId);
    if (!shorts) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Shorts not found" });
    }

    // Increment view count
    await Shorts.findByIdAndUpdate(shortsId, { $inc: { views: 1 } });

    return res.status(httpStatus.OK).send(shorts);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching shorts" });
  }
};

/**
 * Update a short by ID
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const updateShort = async (req: Request, res: Response) => {
  try {
    const { shortsId } = req.params;
    const { title, description, isPublished } = req.body;

    const shorts = await Shorts.findById(shortsId);
    if (!shorts) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Shorts not found" });
    }

    const updatedShorts = await Shorts.findByIdAndUpdate(
      shortsId,
      { title, description, isPublished },
      { new: true }
    );

    return res.status(httpStatus.OK).send(updatedShorts);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error updating shorts" });
  }
};

/**
 * Delete a short by ID
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteShort = async (req: Request, res: Response) => {
  try {
    const { shortsId } = req.params;

    const shorts = await Shorts.findById(shortsId);
    if (!shorts) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Shorts not found" });
    }

    // Only delete files for uploaded shorts, not YouTube shorts
    if (shorts.platform === "upload") {
      // Delete the file from storage
      if (shorts.filePath && fs.existsSync(shorts.filePath)) {
        fs.unlinkSync(shorts.filePath);
      }
    }

    // Delete the thumbnail if it exists (for both upload and YouTube)
    if (shorts.thumbnailPath && fs.existsSync(shorts.thumbnailPath)) {
      fs.unlinkSync(shorts.thumbnailPath);
    }

    await Shorts.findByIdAndDelete(shortsId);

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting shorts" });
  }
};

/**
 * Stream shorts video
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const streamShorts = async (req: Request, res: Response) => {
  try {
    const { shortsId } = req.params;
    const shorts = await Shorts.findById(shortsId);

    if (!shorts) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Shorts not found" });
    }

    // For YouTube shorts, return the YouTube URL for iframe embedding
    if (shorts.platform === "youtube") {
      return res.status(httpStatus.OK).send({
        platform: "youtube",
        youtubeUrl: shorts.youtubeUrl,
        embedUrl: shorts.youtubeUrl?.replace("watch?v=", "embed/"),
        message: "Use embedUrl for iframe embedding",
      });
    }

    // For uploaded shorts, stream the file
    if (!shorts.filePath) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: "Shorts file path not found" });
    }

    const videoPath = shorts.filePath;
    const videoStat = fs.statSync(videoPath);
    const fileSize = videoStat.size;
    const videoRange = req.headers.range;

    if (videoRange) {
      const parts = videoRange.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error streaming shorts" });
  }
};

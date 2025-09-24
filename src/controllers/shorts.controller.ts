import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import Shorts from "../models/shorts.model";
import { getVideoDuration } from "../utils/videoProcessor";
import {
  getYouTubeVideoInfo,
  isValidYouTubeUrl,
} from "../utils/youtubeProcessor";
import { formatDuration } from "../utils/formatDuration";
import { getWebPath, normalizeWebPath } from "../utils/path";
import { safeDeleteFile, getAbsolutePath } from "../utils/fileUtils";

/**
 * Normalize shorts object for response
 */
const normalizeShorts = (shorts: any) => {
  const obj = shorts.toObject ? shorts.toObject() : shorts;
  return {
    ...obj,
    filePath: obj.filePath ? normalizeWebPath(obj.filePath) : obj.filePath,
    thumbnailPath: obj.thumbnailPath ? normalizeWebPath(obj.thumbnailPath) : obj.thumbnailPath,
  };
};

/**
 * Upload and create a short video
 */
export const uploadShorts = async (req: Request, res: Response) => {
  try {
    const { title, description, youtubeUrl, platform = "upload" } = req.body;

    let fileName: string | undefined;
    let filePath: string | undefined;
    let thumbnailPath: string;
    let durationSeconds = 0;
    let durationFormatted = "00:00";

    if (platform === "youtube") {
      if (!youtubeUrl || !isValidYouTubeUrl(youtubeUrl)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Valid YouTube URL is required for YouTube platform" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const thumbnailFile = files?.thumbnail?.[0];
      if (!thumbnailFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Thumbnail file is required" });
      }
      thumbnailPath = getWebPath(thumbnailFile);

      try {
        const youtubeInfo = await getYouTubeVideoInfo(youtubeUrl);
        durationSeconds = youtubeInfo.duration;
        durationFormatted = formatDuration(durationSeconds);

        if (!title && youtubeInfo.title) req.body.title = youtubeInfo.title;
        if (!description && youtubeInfo.description) {
          req.body.description = youtubeInfo.description.substring(0, 500);
        }
      } catch (error) {
        console.warn("Could not get YouTube video info:", error);
      }
    } else {
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
      const originalFilePath = shortsFile.path; // fs path
      filePath = getWebPath(shortsFile); // saved in DB

      if (!thumbnailFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Thumbnail file is required" });
      }
      thumbnailPath = getWebPath(thumbnailFile);

      try {
        durationSeconds = await getVideoDuration(originalFilePath);
        durationFormatted = formatDuration(durationSeconds);
      } catch (error) {
        console.warn("Could not get uploaded shorts duration:", error);
      }
    }

    const shorts = await Shorts.create({
      title,
      description,
      fileName,
      filePath,
      youtubeUrl: platform === "youtube" ? youtubeUrl : undefined,
      platform,
      thumbnailPath,
      durationFormatted,
      views: 0,
      isPublished: true,
    });

    return res.status(httpStatus.CREATED).send(normalizeShorts(shorts));
  } catch (error) {
    console.error("Shorts upload error:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(httpStatus.BAD_REQUEST).send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error uploading shorts" });
  }
};

/**
 * Get all shorts with filtering and pagination
 */
export const getShorts = async (req: Request, res: Response) => {
  try {
    const { search, platform, sortBy = "createdAt" } = req.query;

    const filter: any = { isPublished: true };
    if (platform) filter.platform = platform;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const options = { sort: { [sortBy as string]: -1 } };
    const shorts = await Shorts.find(filter, null, options);

    const normalizedShorts = shorts.map((s) => normalizeShorts(s));
    return res.status(httpStatus.OK).send(normalizedShorts);
  } catch (error) {
    console.error("Error in getShorts:", error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching shorts" });
  }
};

/**
 * Get a short by ID
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

    await Shorts.findByIdAndUpdate(shortsId, { $inc: { views: 1 } });

    return res.status(httpStatus.OK).send(normalizeShorts(shorts));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching shorts" });
  }
};

/**
 * Update a short by ID
 */
export const updateShort = async (req: Request, res: Response) => {
  try {
    const { shortsId } = req.params;
    const { title, description, isPublished } = req.body as any;

    const existing = await Shorts.findById(shortsId);
    if (!existing) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Shorts not found" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const shortsFile = files?.shorts?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    if (shortsFile) {
      // Delete old file using cross-platform utility
      if (existing.filePath) {
        safeDeleteFile(existing.filePath);
      }
      existing.fileName = shortsFile.filename;
      existing.filePath = getWebPath(shortsFile);

      try {
        const seconds = await getVideoDuration(shortsFile.path);
        existing.durationFormatted = formatDuration(seconds);
      } catch (e) {
        console.warn("Could not get shorts duration:", e);
      }
    }

    if (thumbnailFile) {
      // Delete old thumbnail using cross-platform utility
      if (existing.thumbnailPath) {
        safeDeleteFile(existing.thumbnailPath);
      }
      existing.thumbnailPath = getWebPath(thumbnailFile);
    }

    if (typeof title !== "undefined") existing.title = title;
    if (typeof description !== "undefined") existing.description = description;
    if (typeof isPublished !== "undefined") existing.isPublished = isPublished;

    await existing.save();

    return res.status(httpStatus.OK).send(normalizeShorts(existing));
  } catch (error) {
    console.error("Error updating shorts:", error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error updating shorts" });
  }
};

/**
 * Delete a short by ID
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

    // Clean up files using cross-platform utilities
    if (shorts.filePath) {
      safeDeleteFile(shorts.filePath);
    }
    if (shorts.thumbnailPath) {
      safeDeleteFile(shorts.thumbnailPath);
    }

    await Shorts.findByIdAndDelete(shortsId);

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    console.error("Error deleting shorts:", error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting shorts" });
  }
};

/**
 * Stream shorts video
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

    if (shorts.platform === "youtube") {
      return res.status(httpStatus.OK).send({
        platform: "youtube",
        youtubeUrl: shorts.youtubeUrl,
        embedUrl: shorts.youtubeUrl?.replace("watch?v=", "embed/"),
        message: "Use embedUrl for iframe embedding",
      });
    }

    if (!shorts.filePath) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: "Shorts file path not found" });
    }

    // Convert web path to absolute filesystem path
    const videoPath = getAbsolutePath(shorts.filePath);

    if (!fs.existsSync(videoPath)) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video file not found on disk" });
    }

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
    console.error("Error streaming shorts:", error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error streaming shorts" });
  }
};
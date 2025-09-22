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
import { formatDuration } from "../utils/formatDuration";

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
    let durationSeconds = 0;
    let durationFormatted = "00:00";

    if (platform === "youtube") {
      // 🔹 Validate YouTube
      if (!youtubeUrl || !isValidYouTubeUrl(youtubeUrl)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({
            message: "Valid YouTube URL is required for YouTube platform",
          });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const thumbnailFile = files?.thumbnail?.[0];
      if (!thumbnailFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Thumbnail file is required" });
      }
      thumbnailPath = thumbnailFile.path;

      // 🔹 Get info from YouTube
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
      // 🔹 Upload shorts case
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

      try {
        durationSeconds = await getVideoDuration(filePath);
        durationFormatted = formatDuration(durationSeconds);
      } catch (error) {
        console.warn("Could not get uploaded shorts duration:", error);
      }
    }

    // 🔹 Create shorts record
    const shorts = await Shorts.create({
      title,
      description,
      fileName,
      filePath,
      youtubeUrl: platform === "youtube" ? youtubeUrl : undefined,
      platform,
      thumbnailPath,
      durationFormatted, // ✅ only formatted
      views: 0,
      isPublished: true,
    });

    return res.status(httpStatus.CREATED).send(shorts);
  } catch (error) {
    console.error("Shorts upload error:", error);
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

    if (platform) filter.platform = platform;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      sort: { [sortBy as string]: -1 },
    };

    const shorts = await Shorts.find(filter, null, options);

    const results = await Promise.all(
      shorts.map(async (short) => {
        const obj = short.toObject();

        // 🔹 Fix missing YouTube durationFormatted
        if (
          obj.platform === "youtube" &&
          obj.durationFormatted === "00:00" &&
          obj.youtubeUrl
        ) {
          try {
            const ytInfo = await getYouTubeVideoInfo(obj.youtubeUrl);
            const formatted = formatDuration(ytInfo.duration);

            if (ytInfo.duration > 0) {
              await Shorts.findByIdAndUpdate(obj._id, {
                durationFormatted: formatted,
              });
              obj.durationFormatted = formatted;
            }
          } catch (err) {
            console.warn(
              `[WARN] Could not fetch YouTube short duration for: ${obj.youtubeUrl}`,
              err
            );
          }
        }

        return obj;
      })
    );

    return res.status(httpStatus.OK).send(results);
  } catch (error) {
    console.error("Error in getShorts:", error);
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
    const { title, description, isPublished, platform, youtubeUrl } =
      req.body as any;

    const existing = await Shorts.findById(shortsId);
    if (!existing) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Shorts not found" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const shortsFile = files?.shorts?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    const targetPlatform: "upload" | "youtube" = (platform as any) || existing.platform;

    let newFileName = existing.fileName;
    let newFilePath = existing.filePath;
    let newYoutubeUrl = existing.youtubeUrl;
    let newThumbnailPath = existing.thumbnailPath;
    let newDurationFormatted = existing.durationFormatted || "00:00";

    if (targetPlatform === "youtube") {
      if (youtubeUrl && !isValidYouTubeUrl(youtubeUrl)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Valid YouTube URL is required" });
      }

      if (!existing.youtubeUrl && !youtubeUrl && existing.platform !== "youtube") {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "youtubeUrl is required when switching to YouTube" });
      }

      if (youtubeUrl) newYoutubeUrl = youtubeUrl;

      try {
        const info = await getYouTubeVideoInfo(newYoutubeUrl!);
        newDurationFormatted = formatDuration(info.duration);
        if (!title && info.title) req.body.title = info.title;
        if (!description && info.description) {
          req.body.description = info.description.substring(0, 500);
        }
      } catch (e) {
        console.warn("Could not get YouTube short info:", e);
      }

      if (existing.platform === "upload") {
        if (existing.filePath && fs.existsSync(existing.filePath)) {
          try {
            fs.unlinkSync(existing.filePath);
          } catch {}
        }
        newFileName = undefined;
        newFilePath = undefined;
      }
    } else {
      // targetPlatform === 'upload'
      if (existing.platform === "youtube" && !shortsFile) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Shorts file is required when switching from YouTube to upload",
        });
      }

      if (shortsFile) {
        if (existing.filePath && fs.existsSync(existing.filePath)) {
          try {
            fs.unlinkSync(existing.filePath);
          } catch {}
        }
        newFileName = shortsFile.filename;
        newFilePath = shortsFile.path;

        try {
          const seconds = await getVideoDuration(newFilePath);
          newDurationFormatted = formatDuration(seconds);
        } catch (e) {
          console.warn("Could not get shorts duration:", e);
        }
      }

      if (existing.platform === "youtube" || platform === "upload") {
        newYoutubeUrl = undefined;
      }
    }

    if (thumbnailFile) {
      if (existing.thumbnailPath && fs.existsSync(existing.thumbnailPath)) {
        try {
          fs.unlinkSync(existing.thumbnailPath);
        } catch {}
      }
      newThumbnailPath = thumbnailFile.path;
    }

    if (typeof title !== "undefined") existing.title = title;
    if (typeof description !== "undefined") existing.description = description;
    if (typeof isPublished !== "undefined") existing.isPublished = isPublished;

    existing.platform = targetPlatform;
    existing.youtubeUrl = newYoutubeUrl;
    existing.fileName = newFileName;
    existing.filePath = newFilePath;
    existing.thumbnailPath = newThumbnailPath;
    existing.durationFormatted = newDurationFormatted;

    await existing.save();

    return res.status(httpStatus.OK).send(existing);
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

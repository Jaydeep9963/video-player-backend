import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import Video from "../models/video.model";
import { getVideoDuration } from "../utils/videoProcessor";
import {
  getYouTubeVideoInfo,
  isValidYouTubeUrl,
} from "../utils/youtubeProcessor";
import Category from "../models/category.model";
import Subcategory from "../models/subcategory.model";

/**
 * Upload and create a video
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const uploadVideo = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      artist,
      youtubeUrl,
      platform = "upload",
    } = req.body;

    let fileName: string | undefined;
    let filePath: string | undefined;
    let thumbnailPath: string;
    let duration = 0;

    // ✅ Validate category and subcategory IDs before proceeding
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Invalid category ID" });
      }

      if (subcategory) {
        const subcategoryExists = await Subcategory.findById(subcategory);
        if (!subcategoryExists) {
          return res
            .status(httpStatus.BAD_REQUEST)
            .send({ message: "Invalid subcategory ID" });
        }

        // (Optional) check that subcategory belongs to the given category
        if (
          subcategoryExists.category.toString() !==
          categoryExists._id.toString()
        ) {
          return res.status(httpStatus.BAD_REQUEST).send({
            message: "Subcategory does not belong to the selected category",
          });
        }
      }
    }

    if (platform === "youtube") {
      // For YouTube videos
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
        console.log(`YouTube video duration: ${duration} seconds`);

        // Optionally use YouTube title/description if not provided
        if (!title && youtubeInfo.title) {
          req.body.title = youtubeInfo.title;
        }
        if (!description && youtubeInfo.description) {
          req.body.description = youtubeInfo.description?.substring(0, 500); // Limit description length
        }
      } catch (error) {
        console.warn(
          "Could not get YouTube video info, using fallback:",
          error
        );
        // Fallback to request body duration or 0
        duration = req.body.duration ? Number(req.body.duration) : 0;
      }
    } else {
      // For uploaded videos
      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (!files || !files.video || files.video.length === 0) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "No video file uploaded" });
      }

      const videoFile = files.video[0];
      const thumbnailFile = files?.thumbnail?.[0];

      fileName = videoFile.filename;
      filePath = videoFile.path;

      // Use uploaded thumbnail (required)
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

    const video = await Video.create({
      title,
      description,
      fileName,
      filePath,
      youtubeUrl: platform === "youtube" ? youtubeUrl : undefined,
      platform,
      thumbnailPath,
      duration,
      category,
      subcategory: subcategory || undefined,
      artist: artist || undefined,
      views: 0,
      isPublished: true,
    });

    return res.status(httpStatus.CREATED).send(video);
  } catch (error) {
    console.error("Video upload error:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error uploading video" });
  }
};

/**
 * Get all videos with filtering and pagination
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getVideos = async (req: Request, res: Response) => {
  try {
    const {
      category,
      subcategory,
      artist,
      platform,
      search,
      sortBy = "createdAt",
    } = req.query;

    const filter: any = { isPublished: true };

    // Apply filters if provided
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (artist) filter.artist = artist;
    if (platform) filter.platform = platform;

    // Spotify-like search functionality (optional)
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

    const videos = await Video.find(filter, null, options)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("artist", "name");

    return res.status(httpStatus.OK).send(videos);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching videos" });
  }
};

/**
 * Get video by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("artist", "name");

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    // Increment view count
    video.views += 1;
    await video.save();

    // Add to watch history if user is authenticated
    // const userId = (req.user as any)?.id;
    // if (userId) {
    //   try {
    //     await WatchHistory.findOneAndUpdate(
    //       { user: userId, video: video._id },
    //       {
    //         watchedAt: new Date(),
    //         $setOnInsert: {
    //           watchDuration: 0,
    //           completed: false,
    //         },
    //       },
    //       {
    //         upsert: true,
    //         new: true,
    //         setDefaultsOnInsert: true,
    //       }
    //     );
    //   } catch (watchHistoryError) {
    //     // Don't fail the request if watch history update fails
    //     console.warn("Failed to update watch history:", watchHistoryError);
    //   }
    // }

    return res.status(httpStatus.OK).send(video);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching video" });
  }
};

/**
 * Update video by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const updateVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.videoId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    return res.status(httpStatus.OK).send(video);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error updating video" });
  }
};

/**
 * Delete video by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    // Only delete files for uploaded videos, not YouTube videos
    if (video.platform === "upload") {
      // Delete video file
      if (video.filePath && fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
      }
    }

    // Delete thumbnail file (for both upload and YouTube)
    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      fs.unlinkSync(video.thumbnailPath);
    }

    await video.deleteOne();

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting video" });
  }
};

/**
 * Stream video
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const streamVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    // For YouTube videos, return the YouTube URL for iframe embedding
    if (video.platform === "youtube") {
      return res.status(httpStatus.OK).send({
        platform: "youtube",
        youtubeUrl: video.youtubeUrl,
        embedUrl: video.youtubeUrl?.replace("watch?v=", "embed/"),
        message: "Use embedUrl for iframe embedding",
      });
    }

    // For uploaded videos, stream the file
    if (!video.filePath) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: "Video file path not found" });
    }

    const videoPath = video.filePath;
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
      .send({ message: "Error streaming video" });
  }
};

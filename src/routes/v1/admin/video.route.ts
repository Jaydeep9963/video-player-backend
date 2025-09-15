import express from "express";
import multer from "multer";
import path from "path";
import { Request } from "express";
import validate from "../../../middleware/validate";
import * as videoValidation from "../../../validations/video.validation";
import {
  deleteVideo,
  getVideo,
  getVideos,
  streamVideo,
  updateVideo,
  uploadVideo,
} from "../../../controllers/video.controller";
import { auth } from "../../../middleware/auth";

const router = express.Router();

// Configure multer for video and thumbnail uploads
const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    if (file.fieldname === "video") {
      cb(null, "uploads/videos");
    } else if (file.fieldname === "thumbnail") {
      cb(null, "uploads/thumbnails/videos");
    }
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const prefix = file.fieldname === "video" ? "video" : "video-thumb";
    cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.fieldname === "video") {
    // Accept only video files
    const filetypes = /mp4|avi|mov|wmv|flv|mkv/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only video files are allowed for video field"));
  } else if (file.fieldname === "thumbnail") {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed for thumbnail field"));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Increased to 500MB limit for videos
  },
  fileFilter,
});

// Admin routes with authentication
router
  .route("/")
  .post(
    auth("manageVideos"),
    upload.fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    validate(videoValidation.createVideo),
    uploadVideo
  )
  .get(auth("getVideos"), validate(videoValidation.getVideos), getVideos);

router
  .route("/:videoId")
  .get(auth("getVideos"), validate(videoValidation.getVideo), getVideo)
  .patch(
    auth("manageVideos"),
    upload.fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    validate(videoValidation.updateVideo),
    updateVideo
  )
  .delete(
    auth("manageVideos"),
    validate(videoValidation.deleteVideo),
    deleteVideo
  );

router.route("/:videoId/stream").get(auth("getVideos"), streamVideo);

export default router;

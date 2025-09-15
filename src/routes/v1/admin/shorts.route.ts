import express from "express";
import multer from "multer";
import path from "path";
import { Request } from "express";
import validate from "../../../middleware/validate";
import * as shortsValidation from "../../../validations/shorts.validation";
import {
  deleteShort,
  getShortById,
  getShorts,
  streamShorts,
  updateShort,
  uploadShorts,
} from "../../../controllers/shorts.controller";
import { auth } from "../../../middleware/auth";

const router = express.Router();

// Configure multer for shorts and thumbnail uploads
const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    if (file.fieldname === "shorts") {
      cb(null, "uploads/shorts");
    } else if (file.fieldname === "thumbnail") {
      cb(null, "uploads/thumbnails/shorts");
    }
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const prefix = file.fieldname === "shorts" ? "short" : "short-thumb";
    cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.fieldname === "shorts") {
    // Accept only video files
    const filetypes = /mp4|avi|mov|wmv|flv|mkv/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only video files are allowed for shorts field"));
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
    fileSize: 50 * 1024 * 1024, // Default to 50MB limit for shorts
  },
  fileFilter,
});

// Admin routes with authentication
router
  .route("/")
  .post(
    auth("manageShorts"),
    upload.fields([
      { name: "shorts", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    validate(shortsValidation.createShorts),
    uploadShorts
  )
  .get(auth("getShorts"), validate(shortsValidation.getShorts), getShorts);

router
  .route("/:shortsId")
  .get(auth("getShorts"), validate(shortsValidation.getShortById), getShortById)
  .patch(
    auth("manageShorts"),
    upload.fields([
      { name: "shorts", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    validate(shortsValidation.updateShort),
    updateShort
  )
  .delete(
    auth("manageShorts"),
    validate(shortsValidation.deleteShort),
    deleteShort
  );

router.route("/:shortsId/stream").get(auth("getShorts"), streamShorts);

export default router;

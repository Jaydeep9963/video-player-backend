import express from "express";
import multer from "multer";
import path from "path";
import validate from "../../../middleware/validate";
import * as categoryValidation from "../../../validations/category.validation";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../../../controllers/category.controller";
import { auth } from "../../../middleware/auth";

const router = express.Router();

// Configure multer for category image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/categories");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `category-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

router
  .route("/")
  .post(
    auth("manageCategories"),
    upload.single("image"),
    validate(categoryValidation.createCategory),
    createCategory
  )
  .get(
    auth("getCategories"),
    validate(categoryValidation.getCategories),
    getCategories
  );

router
  .route("/:categoryId")
  .get(
    auth("getCategories"),
    validate(categoryValidation.getCategory),
    getCategory
  )
  .patch(
    auth("manageCategories"),
    upload.single("image"),
    validate(categoryValidation.updateCategory),
    updateCategory
  )
  .delete(
    auth("manageCategories"),
    validate(categoryValidation.deleteCategory),
    deleteCategory
  );

export default router;

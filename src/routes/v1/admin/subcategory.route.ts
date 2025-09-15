import express from "express";
import multer from "multer";
import path from "path";
import validate from "../../../middleware/validate";
import * as subcategoryValidation from "../../../validations/subcategory.validation";
import {
  createSubcategory,
  deleteSubcategory,
  getSubcategories,
  getSubcategoriesByCategory,
  getSubcategory,
  updateSubcategory,
} from "../../../controllers/subcategory.controller";
import { auth } from "../../../middleware/auth";

const router = express.Router();

// Configure multer for subcategory image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/subcategories");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `subcategory-${uniqueSuffix}${path.extname(file.originalname)}`);
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
    validate(subcategoryValidation.createSubcategory),
    createSubcategory
  )
  .get(
    auth("getSubcategories"),
    validate(subcategoryValidation.getSubcategories),
    getSubcategories
  );

router
  .route("/:subcategoryId")
  .get(
    auth("getSubcategories"),
    validate(subcategoryValidation.getSubcategory),
    getSubcategory
  )
  .patch(
    auth("manageCategories"),
    upload.single("image"),
    validate(subcategoryValidation.updateSubcategory),
    updateSubcategory
  )
  .delete(
    auth("manageCategories"),
    validate(subcategoryValidation.deleteSubcategory),
    deleteSubcategory
  );

router
  .route("/category/:categoryId")
  .get(
    auth("getSubcategories"),
    validate(subcategoryValidation.getSubcategoriesByCategory),
    getSubcategoriesByCategory
  );

export default router;

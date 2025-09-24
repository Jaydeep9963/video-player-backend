import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../models/category.model";
import Video from "../models/video.model";
import Subcategory from "../models/subcategory.model";
import { getWebPath, normalizeWebPath } from "../utils/path";
import { safeDeleteFile } from "../utils/fileUtils";

/**
 * Create a category
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const createCategory = async (req: Request, res: Response) => {
  try {
    // Add image path to request body if file was uploaded
    if (req.file) {
      req.body.image = getWebPath(req.file);
    }

    const category = await Category.create(req.body);
    
    // Normalize image path in response
    const categoryObj = category.toObject();
    const normalizedCategory = {
      ...categoryObj,
      image: categoryObj.image ? normalizeWebPath(categoryObj.image) : categoryObj.image,
    };

    return res.status(httpStatus.CREATED).send(normalizedCategory);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error creating category" });
  }
};

/**
 * Get all categories
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const { name, search, sortBy } = req.query;
    const filter: any = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // Spotify-like search functionality (optional)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      sort: sortBy ? { [sortBy as string]: 1 } : { createdAt: -1 },
    };

    const categories = await Category.find(filter, null, options);

    // Add video count for each category and normalize image paths
    const categoriesWithVideoCount = await Promise.all(
      categories.map(async (category) => {
        const [videoCount, subcategoryCount] = await Promise.all([
          Video.countDocuments({ category: category._id, isPublished: true }),
          Subcategory.countDocuments({ category: category._id }),
        ]);
        
        const categoryObj = category.toObject();
        return {
          ...categoryObj,
          image: categoryObj.image ? normalizeWebPath(categoryObj.image) : categoryObj.image,
          videoCount,
          subcategoryCount,
        };
      })
    );

    return res.status(httpStatus.OK).send(categoriesWithVideoCount);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching categories" });
  }
};

/**
 * Get category by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.findById(req.params.categoryId);

    if (!category) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Category not found" });
    }

    const categoryObj = category.toObject();
    // Normalize image path before sending response
    const normalizedCategory = {
      ...categoryObj,
      image: categoryObj.image ? normalizeWebPath(categoryObj.image) : categoryObj.image,
    };

    return res.status(httpStatus.OK).send(normalizedCategory);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching category" });
  }
};

/**
 * Update category by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    // Get existing category first to handle old image deletion
    const existingCategory = await Category.findById(req.params.categoryId);
    if (!existingCategory) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Category not found" });
    }

    // Add new image path to request body if file was uploaded
    if (req.file) {
      // Delete old image if it exists
      if (existingCategory.image) {
        safeDeleteFile(existingCategory.image);
      }
      req.body.image = getWebPath(req.file);
    }

    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    // Normalize image path in response
    const categoryObj = category!.toObject();
    const normalizedCategory = {
      ...categoryObj,
      image: categoryObj.image ? normalizeWebPath(categoryObj.image) : categoryObj.image,
    };

    return res.status(httpStatus.OK).send(normalizedCategory);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error updating category" });
  }
};

/**
 * Delete category by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.categoryId);

    if (!category) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Category not found" });
    }

    // Clean up associated image file
    if (category.image) {
      safeDeleteFile(category.image);
    }

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting category" });
  }
};
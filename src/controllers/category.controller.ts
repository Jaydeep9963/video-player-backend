import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../models/category.model";
import Video from "../models/video.model";
import Subcategory from "../models/subcategory.model";

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
      req.body.image = req.file.path;
    }

    const category = await Category.create(req.body);
    return res.status(httpStatus.CREATED).send(category);
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

    // Add video count for each category
    const categoriesWithVideoCount = await Promise.all(
      categories.map(async (category) => {
        const [videoCount, subcategoryCount] = await Promise.all([
          Video.countDocuments({ category: category._id, isPublished: true }),
          Subcategory.countDocuments({ category: category._id }),
        ]);
        return {
          ...category.toObject(),
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

    return res.status(httpStatus.OK).send(category);
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
    // Add image path to request body if file was uploaded
    if (req.file) {
      req.body.image = req.file.path;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Category not found" });
    }

    return res.status(httpStatus.OK).send(category);
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

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting category" });
  }
};

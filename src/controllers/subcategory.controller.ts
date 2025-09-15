import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Subcategory from "../models/subcategory.model";
import Video from "../models/video.model";

/**
 * Create a subcategory
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const createSubcategory = async (req: Request, res: Response) => {
  try {
    const payload: any = {
      ...req.body,
    };

    // If a file was uploaded, save its path
    if (req.file) {
      payload.image = req.file.path;
    }

    const subcategory = await Subcategory.create(payload);

    return res.status(httpStatus.CREATED).send(subcategory);
  } catch (error: any) {
    console.error("Subcategory creation error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }

    // Handle duplicate key error (unique constraint violation)
    if (error.code === 11000) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({
          message: "Subcategory with this name already exists in this category",
        });
    }

    // Handle cast error (invalid ObjectId)
    if (error instanceof mongoose.Error.CastError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: "Invalid category ID format" });
    }

    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error creating subcategory" });
  }
};

/**
 * Get all subcategories
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getSubcategories = async (req: Request, res: Response) => {
  try {
    const { name, category, search, sortBy } = req.query;
    const filter: any = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (category) {
      filter.category = category;
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

    const subcategories = await Subcategory.find(
      filter,
      null,
      options
    ).populate("category", "name");

    // Add video count for each subcategory
    const subcategoriesWithVideoCount = await Promise.all(
      subcategories.map(async (subcategory) => {
        const videoCount = await Video.countDocuments({
          subcategory: subcategory._id,
          isPublished: true,
        });
        return {
          ...subcategory.toObject(),
          videoCount,
        };
      })
    );

    return res.status(httpStatus.OK).send(subcategoriesWithVideoCount);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching subcategories" });
  }
};

/**
 * Get subcategory by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getSubcategory = async (req: Request, res: Response) => {
  try {
    const subcategory = await Subcategory.findById(
      req.params.subcategoryId
    ).populate("category", "name");

    if (!subcategory) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Subcategory not found" });
    }

    return res.status(httpStatus.OK).send(subcategory);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching subcategory" });
  }
};

/**
 * Update subcategory by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const updateSubcategory = async (req: Request, res: Response) => {
  try {
    // Add image path to request body if file was uploaded
    if (req.file) {
      req.body.image = req.file.path;
    }

    const subcategory = await Subcategory.findByIdAndUpdate(
      req.params.subcategoryId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("category", "name");

    if (!subcategory) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Subcategory not found" });
    }

    return res.status(httpStatus.OK).send(subcategory);
  } catch (error: any) {
    console.error("Subcategory update error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({
          message: "Subcategory with this name already exists in this category",
        });
    }

    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error updating subcategory" });
  }
};

/**
 * Delete subcategory by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteSubcategory = async (req: Request, res: Response) => {
  try {
    const subcategory = await Subcategory.findByIdAndDelete(
      req.params.subcategoryId
    );

    if (!subcategory) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Subcategory not found" });
    }

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting subcategory" });
  }
};

/**
 * Get subcategories by category id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getSubcategoriesByCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const filter = { category: req.params.categoryId };

    const options = {
      sort: { createdAt: -1 },
    };

    const subcategories = await Subcategory.find(filter, null, options);

    // Add video count for each subcategory
    const subcategoriesWithVideoCount = await Promise.all(
      subcategories.map(async (subcategory) => {
        const videoCount = await Video.countDocuments({
          subcategory: subcategory._id,
          isPublished: true,
        });
        return {
          ...subcategory.toObject(),
          videoCount,
        };
      })
    );

    return res.status(httpStatus.OK).send(subcategoriesWithVideoCount);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching subcategories by category" });
  }
};

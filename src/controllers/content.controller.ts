import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Content from "../models/content.model";

/**
 * Create or update content
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const createOrUpdateContent = async (req: Request, res: Response) => {
  try {
    const { type, content } = req.body;

    // Check if content of this type already exists
    const existingContent = await Content.findOne({ type });

    if (existingContent) {
      // Update existing content
      existingContent.content = content;
      await existingContent.save();
      return res.status(httpStatus.OK).send(existingContent);
    } else {
      // Create new content
      const newContent = await Content.create({
        type,
        content,
      });
      return res.status(httpStatus.CREATED).send(newContent);
    }
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error creating/updating content" });
  }
};

/**
 * Get content by type
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getContentByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const content = await Content.findOne({ type });

    if (!content) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: `${type} content not found` });
    }

    return res.status(httpStatus.OK).send(content);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching content" });
  }
};

/**
 * Get all content (only latest one per type)
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getAllContent = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    if (type) {
      // filter by type
      const content = await Content.findOne({ type }).sort({ updatedAt: -1 });
      if (!content) {
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: `${type} not found` });
      }
      return res.status(httpStatus.OK).send(content);
    }

    // otherwise return one per type
    const content = await Content.aggregate([
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: "$type",
          doc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);

    return res.status(httpStatus.OK).send(content);
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: "Error fetching content",
    });
  }
};


/**
 * Delete content by type
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteContent = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const content = await Content.findOneAndDelete({ type });

    if (!content) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: `${type} content not found` });
    }

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting content" });
  }
};

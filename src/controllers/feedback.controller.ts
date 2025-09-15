import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Feedback from "../models/feedback.model";

/**
 * Create feedback
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const createFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.create(req.body);
    return res.status(httpStatus.CREATED).send(feedback);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error creating feedback" });
  }
};

/**
 * Get all feedback
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const { name, mobile, search, sortBy } = req.query;
    const filter: any = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (mobile) {
      filter.mobile = mobile;
    }

    // Spotify-like search functionality (optional)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      sort: sortBy ? { [sortBy as string]: 1 } : { createdAt: -1 },
    };

    const feedback = await Feedback.find(filter, null, options);

    return res.status(httpStatus.OK).send(feedback);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching feedback" });
  }
};

/**
 * Get feedback by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findById(req.params.feedbackId);

    if (!feedback) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Feedback not found" });
    }

    return res.status(httpStatus.OK).send(feedback);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching feedback" });
  }
};

/**
 * Update feedback by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const updateFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.feedbackId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!feedback) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Feedback not found" });
    }

    return res.status(httpStatus.OK).send(feedback);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error updating feedback" });
  }
};

/**
 * Delete feedback by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.feedbackId);

    if (!feedback) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Feedback not found" });
    }

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting feedback" });
  }
};

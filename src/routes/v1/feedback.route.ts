import express from "express";
import validate from "../../middleware/validate";
import * as feedbackValidation from "../../validations/feedback.validation";
import {
  createFeedback,
  deleteFeedback,
  getAllFeedback,
  getFeedback,
  updateFeedback,
} from "../../controllers/feedback.controller";
import { auth } from "../../middleware/auth";

const router = express.Router();

router
  .route("/")
  .post(validate(feedbackValidation.createFeedback), createFeedback)
  .get(
    auth("manageFeedback"),
    validate(feedbackValidation.getFeedbacks),
    getAllFeedback
  );

router
  .route("/:feedbackId")
  .get(
    auth("manageFeedback"),
    validate(feedbackValidation.getFeedback),
    getFeedback
  )
  .patch(
    auth("manageFeedback"),
    validate(feedbackValidation.updateFeedback),
    updateFeedback
  )
  .delete(
    auth("manageFeedback"),
    validate(feedbackValidation.deleteFeedback),
    deleteFeedback
  );

export default router;

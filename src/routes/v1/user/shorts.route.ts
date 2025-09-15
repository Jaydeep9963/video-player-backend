import express from "express";
import validate from "../../../middleware/validate";
import * as shortsValidation from "../../../validations/shorts.validation";
import {
  getShortById,
  getShorts,
  streamShorts,
} from "../../../controllers/shorts.controller";

const router = express.Router();

// User routes without authentication (read-only access)
router.route("/").get(validate(shortsValidation.getShorts), getShorts);

router
  .route("/:shortsId")
  .get(validate(shortsValidation.getShortById), getShortById);

router.route("/:shortsId/stream").get(streamShorts);

export default router;

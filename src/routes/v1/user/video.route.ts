import express from "express";
import validate from "../../../middleware/validate";
import * as videoValidation from "../../../validations/video.validation";
import {
  getVideo,
  getVideos,
  streamVideo,
} from "../../../controllers/video.controller";

const router = express.Router();

// User routes without authentication (read-only access)
router.route("/").get(validate(videoValidation.getVideos), getVideos);

router.route("/:videoId").get(validate(videoValidation.getVideo), getVideo);

router.route("/:videoId/stream").get(streamVideo);

export default router;

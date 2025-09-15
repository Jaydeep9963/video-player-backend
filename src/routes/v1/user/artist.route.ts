import express from "express";
import validate from "../../../middleware/validate";
import * as artistValidation from "../../../validations/artist.validation";
import { getArtist, getArtists } from "../../../controllers/artist.controller";

const router = express.Router();

// User routes without authentication (read-only access)
router
  .route("/")
  .get(validate(artistValidation.getArtists), getArtists);

router
  .route("/:artistId")
  .get(validate(artistValidation.getArtist), getArtist);

export default router;
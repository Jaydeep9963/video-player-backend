import express from "express";
import validate from "../../../middleware/validate";
import * as artistValidation from "../../../validations/artist.validation";
import {
  createArtist,
  deleteArtist,
  getArtist,
  getArtists,
  updateArtist,
} from "../../../controllers/artist.controller";
import { auth } from "../../../middleware/auth";

const router = express.Router();

router
  .route("/")
  .post(
    auth("manageArtists"),
    validate(artistValidation.createArtist),
    createArtist
  )
  .get(auth("getUsers"), validate(artistValidation.getArtists), getArtists);

router
  .route("/:artistId")
  .get(auth("getUsers"), validate(artistValidation.getArtist), getArtist)
  .patch(
    auth("manageArtists"),
    validate(artistValidation.updateArtist),
    updateArtist
  )
  .delete(
    auth("manageArtists"),
    validate(artistValidation.deleteArtist),
    deleteArtist
  );

export default router;
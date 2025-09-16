import express from "express";
import { auth } from "../../../middleware/auth";
import {
  notificationTokenController,
  notificationTokenValidation,
} from "../../../notificationToken";
import validate from "../../../middleware/validate";
import multer from "multer";

const router = express.Router();
const upload = multer();

router.post(
  "/notification-token",
  upload.none(),
  validate(notificationTokenValidation.storeNotificationToken),
  notificationTokenController.storeNotificationToken
);

export default router;

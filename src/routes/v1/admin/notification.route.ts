import express from "express";
import {
  notificationTokenController,
  notificationTokenValidation,
} from "../../../notificationToken";
import { auth } from "../../../middleware/auth";
import validate from "../../../middleware/validate";
import multer from "multer";

const router = express.Router();
const upload = multer();

// Admin notification routes with authentication
router.get(
  "/notification-tokens",
  auth("getNotificationTokens"),
  notificationTokenController.getAllNotificationTokens
);
router.post(
  "/send-notification",
  auth("sendNotification"),
  upload.none(),
  validate(notificationTokenValidation.sendNotification),
  notificationTokenController.sendNotificationToAll
);

export default router;

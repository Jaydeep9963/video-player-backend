import express from "express";
import validate from "../../middleware/validate";
import * as authValidation from "../../validations/auth.validation";
import {
  forgotPassword,
  login,
  logout,
  refreshTokens,
  resetPassword,
} from "../../controllers/auth.controller";

const router = express.Router();

router.post("/login", validate(authValidation.login), login);
router.post("/logout", validate(authValidation.logout), logout);
router.post(
  "/refresh-tokens",
  validate(authValidation.refreshTokens),
  refreshTokens
);
router.post(
  "/forgot-password",
  validate(authValidation.forgotPassword),
  forgotPassword
);
router.post(
  "/reset-password",
  validate(authValidation.resetPassword),
  resetPassword
);

export default router;

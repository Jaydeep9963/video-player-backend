import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import moment from "moment";
import config from "../config/config";
import { tokenTypes } from "../config/tokens";
import User from "../models/user.model";
import Token from "../models/token.model";

/**
 * Login with username and password
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Hardcoded admin credentials
    const ADMIN_EMAIL = "admin@example.com";
    const ADMIN_PASSWORD = "Admin@123";
    // Fixed admin user ID to ensure consistency
    const ADMIN_USER_ID = new mongoose.Types.ObjectId(
      "507f1f77bcf86cd799439011"
    );

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .send({ message: "Incorrect email or password" });
    }

    // If credentials match, create a consistent admin user object
    const user = {
      id: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      role: "admin",
    };

    // Generate auth tokens (will overwrite existing tokens for same user)
    const tokens = await generateAuthTokens(user);

    return res.status(httpStatus.OK).send({
      user,
      tokens,
      usage_note:
        "You can use the access token directly in the Authorization header without 'Bearer' prefix",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error during login" });
  }
};

/**
 * Logout
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken;
    const refreshTokenDoc = await Token.findOne({
      token: refreshToken,
      type: tokenTypes.REFRESH,
      blacklisted: false,
    });

    if (!refreshTokenDoc) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Token not found" });
    }

    await refreshTokenDoc.deleteOne();

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error during logout" });
  }
};

/**
 * Refresh auth tokens
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const refreshTokens = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const refreshTokenDoc = await Token.findOne({
      token: refreshToken,
      type: tokenTypes.REFRESH,
      blacklisted: false,
    });

    if (!refreshTokenDoc) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .send({ message: "Invalid refresh token" });
    }

    const user = await User.findById(refreshTokenDoc.user);
    if (!user) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .send({ message: "User not found" });
    }

    // Remove old refresh token
    await refreshTokenDoc.deleteOne();

    // Generate new auth tokens
    const tokens = await generateAuthTokens(user);

    return res.status(httpStatus.OK).send({
      tokens,
      usage_note:
        "You can use the access token directly in the Authorization header without 'Bearer' prefix",
    });
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error refreshing tokens" });
  }
};

/**
 * Reset password
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const resetPasswordTokenDoc = await Token.findOne({
      token,
      type: tokenTypes.RESET_PASSWORD,
      blacklisted: false,
    });

    if (!resetPasswordTokenDoc) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .send({ message: "Invalid or expired token" });
    }

    const user = await User.findById(resetPasswordTokenDoc.user);
    if (!user) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .send({ message: "User not found" });
    }

    // Update password
    user.password = password;
    await user.save();

    // Delete all user tokens
    await Token.deleteMany({ user: user.id });

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error resetting password" });
  }
};

/**
 * Forgot password
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "No users found with this email" });
    }

    // Generate reset password token
    const resetPasswordToken = await generateResetPasswordToken(user);

    // TODO: Send email with reset password link
    // This would typically involve sending an email with a link containing the token

    return res.status(httpStatus.OK).send({ resetPasswordToken });
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error processing forgot password request" });
  }
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user: any) => {
  const accessTokenExpires = moment().add(
    config.jwt.accessExpirationMinutes,
    "minutes"
  );
  const accessToken = generateToken(
    user.id,
    accessTokenExpires,
    tokenTypes.ACCESS
  );

  const refreshTokenExpires = moment().add(
    config.jwt.refreshExpirationDays,
    "days"
  );
  const refreshToken = generateToken(
    user.id,
    refreshTokenExpires,
    tokenTypes.REFRESH
  );

  // Delete existing refresh tokens for this user to prevent multiple tokens
  await Token.deleteMany({
    user: user.id,
    type: tokenTypes.REFRESH,
  });

  // Save new refresh token
  await saveToken(
    refreshToken,
    user.id,
    refreshTokenExpires,
    tokenTypes.REFRESH
  );

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Generate reset password token
 * @param {User} user
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (user: any) => {
  const expires = moment().add(30, "minutes"); // Default to 30 minutes if not specified in config
  const resetPasswordToken = generateToken(
    user.id,
    expires,
    tokenTypes.RESET_PASSWORD
  );

  await saveToken(
    resetPasswordToken,
    user.id,
    expires,
    tokenTypes.RESET_PASSWORD
  );

  return resetPasswordToken;
};

/**
 * Generate token
 * @param {mongoose.Types.ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @returns {string}
 */
const generateToken = (
  userId: mongoose.Types.ObjectId,
  expires: moment.Moment,
  type: string
) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };

  return jwt.sign(payload, config.jwt.secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {mongoose.Types.ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @returns {Promise<Token>}
 */
const saveToken = async (
  token: string,
  userId: mongoose.Types.ObjectId,
  expires: moment.Moment,
  type: string
) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted: false,
  });

  return tokenDoc;
};

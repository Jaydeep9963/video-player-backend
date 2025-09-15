import {
  Strategy as JwtStrategy,
  ExtractJwt,
  VerifiedCallback,
} from "passport-jwt";
import config from "./config";
import { tokenTypes } from "./tokens";
import User from "../models/user.model";
import { Request } from "express";

// Custom JWT extractor that accepts tokens with or without 'Bearer' prefix
const customJwtExtractor = (req: Request) => {
  let token = null;
  if (req.headers && req.headers.authorization) {
    const authHeader = req.headers.authorization as string;
    // Check if token already has Bearer prefix
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Use the token as-is if no Bearer prefix
      token = authHeader;
    }
  }
  return token;
};

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: customJwtExtractor,
};

const jwtVerify = async (payload: any, done: VerifiedCallback) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error("Invalid token type");
    }

    // Fixed admin user ID for consistency
    const ADMIN_USER_ID = "507f1f77bcf86cd799439011";

    // Check if this is the hardcoded admin user
    if (payload.sub === ADMIN_USER_ID) {
      const adminUser = {
        id: ADMIN_USER_ID,
        email: "admin@example.com",
        role: "admin",
      };
      return done(null, adminUser);
    }

    // For regular users, check in database
    const user = await User.findById(payload.sub);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

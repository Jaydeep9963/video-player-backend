import passport from "passport";
import httpStatus from "http-status";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "./error";
import { roleRights } from "../config/roles";

/**
 * Verify callback for Passport JWT
 */
const verifyCallback =
  (req: Request, resolve: any, reject: any, requiredRights: string[]) =>
  async (err: Error, user: any, info: any) => {
    if (err || info || !user) {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate")
      );
    }

    req.user = user; // attach user to request

    // If no specific rights are required, allow access
    if (!requiredRights.length) {
      return resolve();
    }

    // Get user's permissions/rights from their role
    const userRights = roleRights.get(user.role) || [];

    // Check if user has all required rights
    const hasRequiredRights = requiredRights.every((r) =>
      userRights.includes(r)
    );

    // For routes with userId param, allow access if the user is the owner
    const isOwner =
      req.params.userId && req.params.userId === user._id?.toString();

    if (!hasRequiredRights && !isOwner) {
      return reject(new ApiError(httpStatus.FORBIDDEN, "Forbidden"));
    }

    resolve();
  };

/**
 * Auth middleware
 * @param requiredRights List of required permissions for the route
 */
export const auth =
  (...requiredRights: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await new Promise<void>((resolve, reject) => {
        passport.authenticate(
          "jwt",
          { session: false },
          verifyCallback(req, resolve, reject, requiredRights)
        )(req, res, next);
      });

      next();
    } catch (err) {
      next(err); // Pass ApiError to error handler
    }
  };

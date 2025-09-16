/* eslint-disable prettier/prettier */
import { Request, Response } from "express";
import { catchAsync } from "../utils";
import NotificationToken from "./notificationToken.model";
import notificationService from "./notification-service";

// Store notification token (for users) - No authentication required
export const storeNotificationToken = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

    try {
      const existingToken = await NotificationToken.findOne({ token });

      if (existingToken) {
        res.status(200).json({
          success: true,
          message: "Notification token already exists",
          data: existingToken,
        });
      } else {
        // Create new token
        const notificationToken = new NotificationToken({ token });
        await notificationToken.save();
        res.status(201).json({
          success: true,
          message: "Notification token created successfully",
          data: notificationToken,
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Error storing notification token" });
    }
  }
);

// Get all notification tokens (for admin)
export const getAllNotificationTokens = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const tokens = await NotificationToken.find().sort({ createdAt: -1 });

      res.status(200).json({
        results: tokens,
        total: tokens.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching notification tokens" });
    }
  }
);

// Send notification to all users (for admin)
export const sendNotificationToAll = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { data } = req.body;

      if (!data || !data.title || !data.msg) {
        res.status(400).json({
          success: false,
          message: "Data object with title and msg are required",
        });
        return;
      }

      const { title, msg } = data;

      const result = await notificationService.sendToAllUsersWithCleanup(
        title,
        msg,
        data
      );
      const summary = notificationService.getSendResultSummary(result);

      res.status(200).json({
        success: true,
        message: "Notifications sent successfully",
        data: summary,
      });
    } catch (error) {
      console.error("Error sending notifications to all users:", error);
      res.status(500).json({
        success: false,
        message: "Error sending notifications",
      });
    }
  }
);

// Get active tokens count (for admin)
export const getActiveTokensCount = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const count = await notificationService.getActiveTokensCount();
      res.status(200).json({
        success: true,
        data: { activeTokens: count },
      });
    } catch (error) {
      console.error("Error getting active tokens count:", error);
      res.status(500).json({
        success: false,
        message: "Error getting active tokens count",
      });
    }
  }
);

// Export all controller functions
export const notificationTokenController = {
  storeNotificationToken,
  getAllNotificationTokens,
  sendNotificationToAll,
  getActiveTokensCount,
};

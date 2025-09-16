import { FirebaseError } from "firebase-admin";
import { BatchResponse, SendResponse } from "firebase-admin/messaging";
import admin from "../config/firebase-config";
import NotificationToken from "./notificationToken.model";

interface NotificationData {
  [key: string]: string;
}

interface NotificationStats {
  totalTokens: number;
  recentTokens: number;
  activeTokens: number;
  lastUpdated: string;
  error?: string;
}

class NotificationService {
  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data: NotificationData = {}
  ): Promise<BatchResponse[]> {
    if (tokens.length === 0) {
      throw new Error("No tokens provided");
    }

    const results: BatchResponse[] = [];

    // Send to tokens in batches (FCM has limits)
    const batchSize = 500;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      try {
        const message = {
          notification: { title, body },
          data,
          tokens: batch,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        results.push(response);

        console.log(
          `Successfully sent batch ${Math.floor(i / batchSize) + 1}:`,
          {
            successCount: response.successCount,
            failureCount: response.failureCount,
          }
        );
      } catch (error: unknown) {
        console.error(
          `Error sending batch ${Math.floor(i / batchSize) + 1}:`,
          error
        );
        // Create a mock BatchResponse for error cases
        const errorResponse: BatchResponse = {
          responses: batch.map(
            (): SendResponse => ({
              success: false,
              error: error as FirebaseError,
            })
          ),
          successCount: 0,
          failureCount: batch.length,
        };
        results.push(errorResponse);
      }
    }

    return results;
  }

  async sendToAllUsers(
    title: string,
    body: string,
    data: NotificationData = {}
  ): Promise<BatchResponse[]> {
    try {
      const userTokens = await this.getAllUserTokens();
      if (userTokens.length === 0) {
        throw new Error("No user tokens found");
      }

      console.log(`Sending notification to ${userTokens.length} users`);
      const result = await this.sendToTokens(userTokens, title, body, data);
      return result;
    } catch (error: unknown) {
      console.log("Error sending to all users:", error);
      throw error;
    }
  }

  async sendToSpecificToken(
    token: string,
    title: string,
    body: string,
    data: NotificationData = {}
  ): Promise<string> {
    try {
      const message = {
        notification: { title, body },
        data,
        token,
      };

      const response = await admin.messaging().send(message);
      console.log("Successfully sent message to specific token:", response);
      return response;
    } catch (error: unknown) {
      console.log("Error sending message to specific token:", error);
      throw error;
    }
  }

  private async getAllUserTokens(): Promise<string[]> {
    try {
      // Use your existing model to fetch tokens directly from database
      const tokenDocuments = await NotificationToken.find()
        .select("token")
        .lean(); // Use lean() for better performance when only reading data

      const tokens = tokenDocuments
        .map((doc) => doc.token)
        .filter(
          (token): token is string =>
            typeof token === "string" && token.length > 0
        );

      console.log(`Retrieved ${tokens.length} user tokens from database`);
      return tokens;
    } catch (error: unknown) {
      console.error("Error fetching user tokens from database:", error);
      return [];
    }
  }

  // Helper method to clean up invalid tokens
  async cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
    if (invalidTokens.length === 0) return;

    try {
      // Remove invalid tokens from database
      const deleteResult = await NotificationToken.deleteMany({
        token: { $in: invalidTokens },
      });

      console.log(
        `Cleaned up ${deleteResult.deletedCount} invalid tokens from database`
      );
    } catch (error: unknown) {
      console.error("Error cleaning up invalid tokens:", error);
    }
  }

  // Method to get notification statistics
  async getNotificationStats(): Promise<NotificationStats> {
    try {
      const totalTokens = await NotificationToken.countDocuments();

      // You can add more sophisticated stats here
      const recentTokens = await NotificationToken.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      });

      return {
        totalTokens,
        recentTokens,
        activeTokens: totalTokens,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error: unknown) {
      console.error("Error getting notification stats:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        totalTokens: 0,
        recentTokens: 0,
        activeTokens: 0,
        lastUpdated: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  // Method to extract invalid tokens from batch responses
  private extractInvalidTokens(
    results: BatchResponse[],
    originalTokens: string[]
  ): string[] {
    const invalidTokens: string[] = [];
    let tokenIndex = 0;

    results.forEach((batchResult) => {
      batchResult.responses.forEach((response: SendResponse) => {
        if (!response.success && response.error) {
          const errorCode = response.error.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            const token = originalTokens[tokenIndex];
            if (token) {
              invalidTokens.push(token);
            }
          }
        }
        tokenIndex++;
      });
    });

    return invalidTokens;
  }

  // Enhanced sendToAllUsers with automatic cleanup
  async sendToAllUsersWithCleanup(
    title: string,
    body: string,
    data: NotificationData = {}
  ): Promise<BatchResponse[]> {
    try {
      const userTokens = await this.getAllUserTokens();
      if (userTokens.length === 0) {
        throw new Error("No user tokens found");
      }

      const result = await this.sendToTokens(userTokens, title, body, data);

      // Extract and clean up invalid tokens
      const invalidTokens = this.extractInvalidTokens(result, userTokens);
      if (invalidTokens.length > 0) {
        await this.cleanupInvalidTokens(invalidTokens);
        console.log(`Cleaned up ${invalidTokens.length} invalid tokens`);
      }

      return result;
    } catch (error: unknown) {
      console.log("Error sending to all users with cleanup:", error);
      throw error;
    }
  }

  // Method to get active tokens count
  async getActiveTokensCount(): Promise<number> {
    try {
      return await NotificationToken.countDocuments();
    } catch (error: unknown) {
      console.error("Error getting active tokens count:", error);
      return 0;
    }
  }

  // Method to check if a token exists
  async tokenExists(token: string): Promise<boolean> {
    try {
      const existingToken = await NotificationToken.findOne({ token });
      return !!existingToken;
    } catch (error: unknown) {
      console.error("Error checking token existence:", error);
      return false;
    }
  }

  // Method to get summary of send results
  getSendResultSummary(results: BatchResponse[]): {
    totalSuccess: number;
    totalFailure: number;
    totalSent: number;
    batches: number;
  } {
    let totalSuccess = 0;
    let totalFailure = 0;

    results.forEach((batch) => {
      totalSuccess += batch.successCount;
      totalFailure += batch.failureCount;
    });

    return {
      totalSuccess,
      totalFailure,
      totalSent: totalSuccess + totalFailure,
      batches: results.length,
    };
  }
}

export default new NotificationService();

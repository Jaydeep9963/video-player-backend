/* eslint-disable prettier/prettier */
import mongoose, { Document, Schema } from "mongoose";
import { toJSON } from "../toJSON";

export interface INotificationToken extends Document {
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationTokenSchema: Schema = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Apply the toJSON plugin
NotificationTokenSchema.plugin(toJSON);

export default mongoose.model<INotificationToken>(
  "NotificationToken",
  NotificationTokenSchema
);

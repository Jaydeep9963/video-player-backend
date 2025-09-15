import Joi from "joi";
import { objectId } from "./custom.validation";

export const getRecentlyPlayedVideos = {
  query: Joi.object().keys({
    search: Joi.string(),
    sortBy: Joi.string().valid("updatedAt", "watchedAt", "createdAt"),
  }),
};

export const addToWatchHistory = {
  params: Joi.object().keys({
    videoId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    watchDuration: Joi.number().min(0).optional(),
    completed: Joi.boolean().optional(),
  }),
};

export const removeFromWatchHistory = {
  params: Joi.object().keys({
    videoId: Joi.string().custom(objectId).required(),
  }),
};

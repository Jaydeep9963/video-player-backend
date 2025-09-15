import Joi from "joi";
import { objectId } from "./custom.validation";

export const createVideo = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string(),
    category: Joi.string().required().custom(objectId),
    subcategory: Joi.string().custom(objectId),
    artist: Joi.string().custom(objectId).optional(),
    youtubeUrl: Joi.string().uri(),
    platform: Joi.string().valid("upload", "youtube"),
    duration: Joi.number().min(0).optional(),
    isPublished: Joi.boolean(),
    thumbnailPath: Joi.string(),
  }),
};

export const getVideos = {
  query: Joi.object().keys({
    title: Joi.string(),
    category: Joi.string().custom(objectId),
    subcategory: Joi.string().custom(objectId),
    artist: Joi.string().custom(objectId),
    platform: Joi.string().valid("upload", "youtube"),
    search: Joi.string(),
    isPublished: Joi.boolean(),
    sortBy: Joi.string(),
  }),
};

export const getVideo = {
  params: Joi.object().keys({
    videoId: Joi.string().custom(objectId),
  }),
};

export const updateVideo = {
  params: Joi.object().keys({
    videoId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string(),
      description: Joi.string(),
      category: Joi.string().custom(objectId),
      subcategory: Joi.string().custom(objectId),
      artist: Joi.string().custom(objectId),
      youtubeUrl: Joi.string().uri(),
      platform: Joi.string().valid("upload", "youtube"),
      duration: Joi.number().min(0).optional(),
      isPublished: Joi.boolean(),
      thumbnailPath: Joi.string(),
    })
    .min(1),
};

export const deleteVideo = {
  params: Joi.object().keys({
    videoId: Joi.string().custom(objectId),
  }),
};

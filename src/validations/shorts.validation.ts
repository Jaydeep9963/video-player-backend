import Joi from "joi";
import { objectId } from "./custom.validation";

export const createShorts = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string(),
    youtubeUrl: Joi.string().uri(),
    platform: Joi.string().valid("upload", "youtube"),
    duration: Joi.number().min(0).optional(),
    isPublished: Joi.boolean(),
    thumbnailPath: Joi.string(),
  }),
};

export const getShorts = {
  query: Joi.object().keys({
    title: Joi.string(),
    search: Joi.string(),
    platform: Joi.string().valid("upload", "youtube"),
    isPublished: Joi.boolean(),
    sortBy: Joi.string(),
  }),
};

export const getShortById = {
  params: Joi.object().keys({
    shortsId: Joi.string().custom(objectId),
  }),
};

export const updateShort = {
  params: Joi.object().keys({
    shortsId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string(),
      description: Joi.string(),
      youtubeUrl: Joi.string().uri(),
      platform: Joi.string().valid("upload", "youtube"),
      duration: Joi.number().min(0).optional(),
      isPublished: Joi.boolean(),
      thumbnailPath: Joi.string(),
    })
    .min(1),
};

export const deleteShort = {
  params: Joi.object().keys({
    shortsId: Joi.string().custom(objectId),
  }),
};

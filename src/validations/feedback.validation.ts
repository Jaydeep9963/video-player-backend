import Joi from "joi";
import { objectId } from "./custom.validation";

export const createFeedback = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    mobile: Joi.string().required(),
    description: Joi.string().required(),
  }),
};

export const getFeedbacks = {
  query: Joi.object().keys({
    name: Joi.string(),
    mobile: Joi.string(),
    search: Joi.string(),
    sortBy: Joi.string(),
  }),
};

export const getFeedback = {
  params: Joi.object().keys({
    feedbackId: Joi.string().custom(objectId),
  }),
};

export const deleteFeedback = {
  params: Joi.object().keys({
    feedbackId: Joi.string().custom(objectId),
  }),
};

export const updateFeedback = {
  params: Joi.object().keys({
    feedbackId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      mobile: Joi.string(),
      description: Joi.string(),
    })
    .min(1),
};

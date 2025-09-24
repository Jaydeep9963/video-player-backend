import Joi from "joi";
import { objectId } from "./custom.validation";

// Custom mobile number validation - exact 10 digits
const mobileNumberValidation = Joi.string()
  .pattern(/^[0-9]{10}$/)
  .message('Mobile number must be exactly 10 digits')
  .required();

const optionalMobileValidation = Joi.string()
  .pattern(/^[0-9]{10}$/)
  .message('Mobile number must be exactly 10 digits');

export const createFeedback = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    mobile: mobileNumberValidation,
    description: Joi.string().required(),
  }),
};

export const getFeedbacks = {
  query: Joi.object().keys({
    name: Joi.string(),
    mobile: optionalMobileValidation,
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
      mobile: optionalMobileValidation,
      description: Joi.string(),
    })
    .min(1),
};
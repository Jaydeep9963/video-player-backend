import Joi from 'joi';

export const createContent = {
  body: Joi.object().keys({
    type: Joi.string().required().valid('privacy-policy', 'terms-and-conditions', 'about-us'),
    content: Joi.string().required(),
  }),
};

export const getContent = {
  params: Joi.object().keys({
    type: Joi.string().required().valid('privacy-policy', 'terms-and-conditions', 'about-us'),
  }),
};

export const updateContent = {
  params: Joi.object().keys({
    type: Joi.string().required().valid('privacy-policy', 'terms-and-conditions', 'about-us'),
  }),
  body: Joi.object().keys({
    content: Joi.string().required(),
  }),
};

export const deleteContent = {
  params: Joi.object().keys({
    type: Joi.string().required().valid('privacy-policy', 'terms-and-conditions', 'about-us'),
  }),
};
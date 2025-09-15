import Joi from "joi";
import { objectId } from "./custom.validation";

export const createSubcategory = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    category: Joi.string().required().custom(objectId),
    image: Joi.string(),
  }),
};

export const getSubcategories = {
  query: Joi.object().keys({
    name: Joi.string(),
    category: Joi.string().custom(objectId),
    search: Joi.string(),
    sortBy: Joi.string(),
  }),
};

export const getSubcategory = {
  params: Joi.object().keys({
    subcategoryId: Joi.string().custom(objectId),
  }),
};

export const updateSubcategory = {
  params: Joi.object().keys({
    subcategoryId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      category: Joi.string().custom(objectId),
      image: Joi.string(),
    })
    .min(1),
};

export const deleteSubcategory = {
  params: Joi.object().keys({
    subcategoryId: Joi.string().custom(objectId),
  }),
};

export const getSubcategoriesByCategory = {
  params: Joi.object().keys({
    categoryId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
  }),
};

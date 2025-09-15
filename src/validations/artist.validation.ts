import Joi from 'joi';
import { objectId } from './custom.validation';

export const createArtist = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    bio: Joi.string(),
  }),
};

export const getArtists = {
  query: Joi.object().keys({
    name: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getArtist = {
  params: Joi.object().keys({
    artistId: Joi.string().custom(objectId),
  }),
};

export const updateArtist = {
  params: Joi.object().keys({
    artistId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      bio: Joi.string(),
    })
    .min(1),
};

export const deleteArtist = {
  params: Joi.object().keys({
    artistId: Joi.string().custom(objectId),
  }),
};
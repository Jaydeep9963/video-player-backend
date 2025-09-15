import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import  Artist  from '../models/artist.model';

/**
 * Create an artist
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const createArtist = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.create(req.body);
    return res.status(httpStatus.CREATED).send(artist);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(httpStatus.BAD_REQUEST).send({ message: error.message });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error creating artist' });
  }
};

/**
 * Get all artists
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getArtists = async (req: Request, res: Response) => {
  try {
    const { name, sortBy, limit = 10, page = 1 } = req.query;
    const filter: any = {};
    
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    
    const options = {
      sort: sortBy ? { [sortBy as string]: 1 } : { createdAt: -1 },
      limit: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
    };
    
    const artists = await Artist.find(filter, null, options);
    const totalResults = await Artist.countDocuments(filter);
    
    return res.status(httpStatus.OK).send({
      results: artists,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalResults / Number(limit)),
      totalResults,
    });
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error fetching artists' });
  }
};

/**
 * Get artist by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getArtist = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.findById(req.params.artistId);
    
    if (!artist) {
      return res.status(httpStatus.NOT_FOUND).send({ message: 'Artist not found' });
    }
    
    return res.status(httpStatus.OK).send(artist);
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error fetching artist' });
  }
};

/**
 * Update artist by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const updateArtist = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.artistId, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!artist) {
      return res.status(httpStatus.NOT_FOUND).send({ message: 'Artist not found' });
    }
    
    return res.status(httpStatus.OK).send(artist);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(httpStatus.BAD_REQUEST).send({ message: error.message });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error updating artist' });
  }
};

/**
 * Delete artist by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteArtist = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.findByIdAndDelete(req.params.artistId);
    
    if (!artist) {
      return res.status(httpStatus.NOT_FOUND).send({ message: 'Artist not found' });
    }
    
    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error deleting artist' });
  }
};
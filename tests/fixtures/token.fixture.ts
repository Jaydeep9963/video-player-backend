import moment from 'moment';
import config from '../../src/config/config';
import { tokenTypes } from '../../src/config/tokens';
import { userOne, admin } from './user.fixture';
import jwt from 'jsonwebtoken';

const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');

export const userOneAccessToken = jwt.sign(
  {
    sub: userOne._id,
    iat: moment().unix(),
    exp: accessTokenExpires.unix(),
    type: tokenTypes.ACCESS,
  },
  config.jwt.secret
);

export const adminAccessToken = jwt.sign(
  {
    sub: admin._id,
    iat: moment().unix(),
    exp: accessTokenExpires.unix(),
    type: tokenTypes.ACCESS,
  },
  config.jwt.secret
);
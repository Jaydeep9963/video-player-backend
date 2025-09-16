/* eslint-disable prettier/prettier */
import Joi from "joi";

export const storeNotificationToken = {
  body: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

export const sendNotification = {
  body: Joi.object().keys({
    data: Joi.object()
      .keys({
        title: Joi.string().required().max(100),
        msg: Joi.string().required().max(500),
        notification_at: Joi.string().optional(),
      })
      .unknown(true)
      .required(),
  }),
};

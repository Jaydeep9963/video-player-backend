import express from 'express';
import userRoute from './user.route';
import authRoute from './auth.route';
import feedbackRoute from './feedback.route';
import contentRoute from './content.route';
import overviewRoute from './overview.route';
import adminRoutes from './admin';
import userRoutes from './user';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/feedback',
    route: feedbackRoute,
  },
  {
    path: '/content',
    route: contentRoute,
  },
  {
    path: '/overview',
    route: overviewRoute,
  },
  {
    path: '/admin',
    route: adminRoutes,
  },
  {
    path: '/',
    route: userRoutes,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
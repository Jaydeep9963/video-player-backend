import express from 'express';
import videoRoute from './video.route';
import shortsRoute from './shorts.route';
import searchRoute from './search.route';
import categoryRoute from './category.route';
import subcategoryRoute from './subcategory.route';
import notificationRoute from './notification.route';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/videos',
    route: videoRoute,
  },
  {
    path: '/shorts',
    route: shortsRoute,
  },
  {
    path: '/search',
    route: searchRoute,
  },
  {
    path: '/categories',
    route: categoryRoute,
  },
  {
    path: '/subcategories',
    route: subcategoryRoute,
  },
  {
    path: '/notification',
    route: notificationRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;

import express from "express";
import videoRoute from "./video.route";
import shortsRoute from "./shorts.route";
import searchRoute from "./search.route";
import categoryRoute from "./category.route";
import subcategoryRoute from "./subcategory.route";
import artistRoute from "./artist.route";

const router = express.Router();

const userRoutes = [
  {
    path: "/videos",
    route: videoRoute,
  },
  {
    path: "/shorts",
    route: shortsRoute,
  },
  {
    path: "/search",
    route: searchRoute,
  },
  {
    path: "/categories",
    route: categoryRoute,
  },
  {
    path: "/subcategories",
    route: subcategoryRoute,
  },
  {
    path: "/artists",
    route: artistRoute,
  },
];

userRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;

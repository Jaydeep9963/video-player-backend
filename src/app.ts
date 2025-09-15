import express, { Express } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import passport from "passport";
import httpStatus from "http-status";
import mongoSanitize from "express-mongo-sanitize";
// @ts-ignore
import xss from "xss-clean";
import morgan from "morgan";
import config from "./config/config";
import { jwtStrategy } from "./config/passport";
import { errorConverter, errorHandler } from "./middleware/error";
import { authLimiter } from "./middleware/rateLimiter";
import routes from "./routes/v1";
import path from "path";

const app: Express = express();
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Set security HTTP headers
app.use(helmet());

// Enable cors
app.use(cors());
app.options("*", cors());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Sanitize request data
app.use(xss());
app.use(mongoSanitize());

// Compression
app.use(compression());

// Morgan logger
app.use(morgan("dev"));

// JWT authentication
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

// Limit repeated failed requests to auth endpoints
if (config.env === "production") {
  app.use("/v1/auth", authLimiter);
}

// API routes
app.use("/v1", routes);

// Send back a 404 error for any unknown API request
app.use((req, res) => {
  res.status(httpStatus.NOT_FOUND).json({
    status: httpStatus.NOT_FOUND,
    message: "Not found",
  });
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle errors
app.use(errorHandler);

export default app;

# Video Player Backend

A RESTful API backend for a video streaming platform built with Node.js, Express, TypeScript, and MongoDB.

## Features

- User authentication and authorization
- Video upload and streaming
- Categories and subcategories management
- Artist profiles
- User feedback system
- Content management (privacy policy, terms, about us)

## Prerequisites

- Node.js (v14 or later)
- MongoDB
- FFmpeg (for video processing)

## Installation

1. Clone the repository

```bash
git clone <repository-url>
cd video_player_backend
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```
# Port number
PORT=3000

# URL of the Mongo DB
MONGODB_URL=mongodb://127.0.0.1:27017/video_player

# JWT
JWT_SECRET=thisisasamplesecret
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30
JWT_RESET_PASSWORD_EXPIRATION_MINUTES=10

# SMTP configuration options for the email service
SMTP_HOST=email-server
SMTP_PORT=587
SMTP_USERNAME=email-server-username
SMTP_PASSWORD=email-server-password
EMAIL_FROM=support@yourapp.com
```

4. Create upload directories

```bash
mkdir -p uploads/videos uploads/thumbnails
```

## Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Testing

```bash
npm test
```

## API Documentation

API documentation is available at `/v1/docs` when the server is running.

## API Endpoints

### Auth
- `POST /v1/auth/login` - Login
- `POST /v1/auth/logout` - Logout
- `POST /v1/auth/refresh-tokens` - Refresh auth tokens
- `POST /v1/auth/forgot-password` - Forgot password
- `POST /v1/auth/reset-password` - Reset password

### Users
- `POST /v1/users` - Create a user
- `GET /v1/users` - Get all users
- `GET /v1/users/:userId` - Get a user
- `PATCH /v1/users/:userId` - Update a user
- `DELETE /v1/users/:userId` - Delete a user

### Videos
- `POST /v1/videos` - Upload a video
- `GET /v1/videos` - Get all videos
- `GET /v1/videos/:videoId` - Get a video
- `PATCH /v1/videos/:videoId` - Update a video
- `DELETE /v1/videos/:videoId` - Delete a video
- `GET /v1/videos/:videoId/stream` - Stream a video

### Categories
- `POST /v1/categories` - Create a category
- `GET /v1/categories` - Get all categories
- `GET /v1/categories/:categoryId` - Get a category
- `PATCH /v1/categories/:categoryId` - Update a category
- `DELETE /v1/categories/:categoryId` - Delete a category

### Subcategories
- `POST /v1/subcategories` - Create a subcategory
- `GET /v1/subcategories` - Get all subcategories
- `GET /v1/subcategories/:subcategoryId` - Get a subcategory
- `PATCH /v1/subcategories/:subcategoryId` - Update a subcategory
- `DELETE /v1/subcategories/:subcategoryId` - Delete a subcategory
- `GET /v1/subcategories/category/:categoryId` - Get subcategories by category

### Artists
- `POST /v1/artists` - Create an artist
- `GET /v1/artists` - Get all artists
- `GET /v1/artists/:artistId` - Get an artist
- `PATCH /v1/artists/:artistId` - Update an artist
- `DELETE /v1/artists/:artistId` - Delete an artist

### Feedback
- `POST /v1/feedback` - Create feedback
- `GET /v1/feedback` - Get all feedback
- `GET /v1/feedback/:feedbackId` - Get feedback
- `PATCH /v1/feedback/:feedbackId` - Update feedback
- `DELETE /v1/feedback/:feedbackId` - Delete feedback
- `GET /v1/feedback/user/:userId` - Get user feedback

### Content
- `POST /v1/content` - Create or update content
- `GET /v1/content` - Get all content
- `GET /v1/content/:type` - Get content by type
- `DELETE /v1/content/:type` - Delete content

## Project Structure

```
src/
├── config/         # Environment variables and configuration
├── controllers/    # Route controllers (controller layer)
├── middleware/     # Custom express middlewares
├── models/         # Mongoose models (data layer)
├── routes/         # Routes
├── utils/          # Utility classes and functions
├── validations/    # Request data validation schemas
├── app.ts          # Express app
└── index.ts        # App entry point
```

## License

[MIT](LICENSE)
#!/bin/bash

# Create upload directories for organized file storage
echo "Creating upload directories..."

# Create main uploads directory
mkdir -p uploads

# Create category and subcategory directories
mkdir -p uploads/categories
mkdir -p uploads/subcategories

# Create video directories
mkdir -p uploads/videos
mkdir -p uploads/thumbnails/videos

# Create shorts directories  
mkdir -p uploads/shorts
mkdir -p uploads/thumbnails/shorts

# Create general images directory (for backward compatibility)
mkdir -p uploads/images

echo "Upload directories created successfully!"
echo "Directory structure:"
echo "uploads/"
echo "├── categories/"
echo "├── subcategories/"
echo "├── videos/"
echo "├── shorts/"
echo "├── thumbnails/"
echo "│   ├── videos/"
echo "│   └── shorts/"
echo "└── images/"#!/bin/bash

# Create upload directories for organized file storage
echo "Creating upload directories..."

# Create main uploads directory
mkdir -p uploads

# Create category and subcategory directories
mkdir -p uploads/categories
mkdir -p uploads/subcategories

# Create video directories
mkdir -p uploads/videos
mkdir -p uploads/thumbnails/videos

# Create shorts directories  
mkdir -p uploads/shorts
mkdir -p uploads/thumbnails/shorts

# Create general images directory (for backward compatibility)
mkdir -p uploads/images

echo "Upload directories created successfully!"
echo "Directory structure:"
echo "uploads/"
echo "├── categories/"
echo "├── subcategories/"
echo "├── videos/"
echo "├── shorts/"
echo "├── thumbnails/"
echo "│   ├── videos/"
echo "│   └── shorts/"
echo "└── images/"
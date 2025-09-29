# Dither Art Generator

## Overview
An application that allows users to upload images and convert them to artistically stylized images using various dithering algorithms. Users can preview and download the processed images in multiple formats.

## Core Features

### Image Upload and Processing
- Users can upload image files from their device
- The application processes uploaded images using selected dithering algorithms
- Processing happens in the frontend for immediate feedback

### Dithering Algorithms
- Support multiple dithering styles including:
  - Floyd-Steinberg
  - Bayer
  - Atkinson
  - Halftone
  - Clustered Dot
  - Additional common dithering algorithms
- Users can select their preferred dithering style before processing

### Color Output Options
- Users can choose between black & white or color output for the dithered image
- Black & white option produces monochrome dithering results
- Color option preserves color information in the dithering process
- Selection affects the final artistic style of the processed image

### Pixelization Controls
- Users can adjust the degree of pixelization independently from output image size
- Pixelization control affects the resolution/block size of the dithering effect
- Control allows fine-tuning of the artistic effect intensity

### Output Dimensions
- Users can choose from several large output image dimensions
- Available dimensions use powers of 2 (e.g., 512x512, 1024x1024, 2048x2048)
- Selection affects the final processed image size

### Preview and Display
- Display high-quality, large preview of the stylized output image
- Preview shows the full processed result before download
- Images are optimized for clear viewing on various screen sizes

### Download Options
- Users can download processed images as PNG files
- Users can download processed images as SVG files with proper functionality
- PNG images support press-and-hold saving on iOS devices for Photos app integration
- SVG files include dedicated download button for device saving and produce valid, viewable SVG files

### File Storage
- Backend stores processed output images using blob storage
- Large images are efficiently served to users
- Storage handles both PNG and SVG format outputs

## Backend Requirements
- Store processed images in blob storage system
- Serve large image files efficiently to frontend
- Handle file upload and storage operations
- Manage image metadata and retrieval

## User Interface
- Simple upload interface for selecting source images
- Dithering algorithm selection controls
- Color output selection (black & white or color)
- Pixelization degree adjustment controls
- Output dimension selection options
- Large preview area for processed images
- Download controls for different file formats with working SVG functionality
- Mobile-friendly interface supporting iOS press-and-hold functionality
- All interface elements and content displayed in English

"""
README:
This script performs human segmentation on standard RGB images using classical 
computer vision techniques (GrabCut). It strictly avoids deep learning.

Setup:
1. Create a folder named 'image' in the same directory as this script.
2. Place your RGB image (e.g., .jpg, .png) inside the 'image' folder.
3. Run the script: python human_segmentation.py
"""

import cv2
import numpy as np
import sys
import os
import glob

def process_image_grabcut(image_path):
    """
    Finds the exact boundaries of a human (or any foreground object) using GrabCut.
    This is a classical computer vision approach that uses graph cuts and color distributions
    instead of deep learning.
    """
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not load image at {image_path}")
        sys.exit(1)

    # Resize image if it's too large to fit on screen
    height, width = img.shape[:2]
    max_dimension = 800
    if max(height, width) > max_dimension:
        scale = max_dimension / max(height, width)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    # Since ML/DL human detectors are not allowed, we automate this by assuming 
    # the human (main subject) is located in the center of the image.
    # We create a bounding box that covers the central area of the image (e.g., with a 10% margin).
    margin_x = int(width * 0.1)
    margin_y = int(height * 0.1)
    rect = (margin_x, margin_y, width - 2 * margin_x, height - 2 * margin_y)
    
    print(f"Automatically selected bounding box: {rect}")

    if rect[2] == 0 or rect[3] == 0:
        print("No valid bounding box selected. Exiting.")
        sys.exit(1)

    print("Running GrabCut algorithm... please wait.")

    # Create mask, bgdModel, and fgdModel required by GrabCut
    mask = np.zeros(img.shape[:2], np.uint8)
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)

    # Run GrabCut algorithm
    # cv2.GC_INIT_WITH_RECT means we are initializing it with our bounding box
    # 5 is the number of iterations
    cv2.grabCut(img, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)

    # The mask contains values 0 (bg), 1 (fg), 2 (probable bg), 3 (probable fg)
    # We modify the mask such that all 1-pixels (fg) and 3-pixels (probable fg) are 1, and the rest are 0
    mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')

    # Multiply the original image with the new mask to get the segmented human
    result = img * mask2[:, :, np.newaxis]

    # Optional: Find contours to draw the exact boundaries on the original image
    contours, _ = cv2.findContours(mask2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boundary_img = img.copy()
    cv2.drawContours(boundary_img, contours, -1, (0, 255, 0), 2)

    # Show results
    cv2.imshow('Original Image with Boundaries', boundary_img)
    cv2.imshow('Segmented Result', result)
    print("Press any key to close the windows.")
    cv2.waitKey(0)
    cv2.destroyAllWindows()

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    image_dir = os.path.join(script_dir, "image")
    
    # Supported image extensions
    extensions = ('*.png', '*.jpg', '*.jpeg', '*.bmp', '*.tiff')
    image_files = []
    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(image_dir, ext)))
        
    if not image_files:
        print(f"No image files found in {image_dir}")
        sys.exit(1)
        
    # Grab the first image found
    image_path = image_files[0]
    print(f"Processing image: {image_path}")
    process_image_grabcut(image_path)

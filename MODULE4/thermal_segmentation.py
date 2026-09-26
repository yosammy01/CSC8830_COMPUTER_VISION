"""
README:
This script performs human segmentation on thermal images using classical 
computer vision techniques (Otsu's Thresholding and Morphology). It strictly 
avoids deep learning.

Setup:
1. Run the script once to automatically generate the 'thermal_image' folder.
2. Place your thermal image inside the 'thermal_image' folder.
3. Run the script again: python thermal_segmentation.py
"""

import cv2
import numpy as np
import sys
import os
import glob

def process_thermal_image(image_path):
    """
    Finds the exact boundaries of a human in a thermal image using classical CV techniques.
    Deep learning/ML are not used.
    """
    # 1. Read the thermal image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not load image at {image_path}")
        sys.exit(1)

    # 2. Convert to grayscale
    # Thermal images map temperature to color or intensity. By converting to grayscale,
    # we get a clean 2D array where pixel intensity roughly equals temperature.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. Blur the image to reduce noise and smooth the temperature map
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # 4. Apply Otsu's Thresholding
    # Since humans are usually warmer than their surroundings, they appear as bright pixels.
    # Otsu's method automatically calculates the mathematically optimal threshold value 
    # to separate the hot foreground (human) from the colder background.
    # (If the thermal camera uses a "hot is black" palette, use cv2.THRESH_BINARY_INV instead)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 5. Morphological Operations
    # Clean up small noise (like a hot lamp in the background) and fill holes in the human body
    kernel = np.ones((5, 5), np.uint8)
    
    # Closing (dilate then erode) to close small holes inside the human shape
    thresh_closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    
    # Opening (erode then dilate) to remove small background noise dots
    thresh_cleaned = cv2.morphologyEx(thresh_closed, cv2.MORPH_OPEN, kernel, iterations=1)

    # 6. Find Contours (the boundaries)
    contours, _ = cv2.findContours(thresh_cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        print("No warm objects found in the image.")
        return

    # 7. Filter for the human
    # Assuming the human is the largest hot object in the frame, we sort and pick the biggest contour
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    largest_contour = contours[0]

    # Draw the boundary on the original image in bright green
    boundary_img = img.copy()
    cv2.drawContours(boundary_img, [largest_contour], -1, (0, 255, 0), 2)

    # 8. Show results
    cv2.imshow('Original Thermal Image', img)
    cv2.imshow('Temperature Mask (Thresholding)', thresh_cleaned)
    cv2.imshow('Final Boundaries', boundary_img)
    print("Press any key to close the windows.")
    cv2.waitKey(0)
    cv2.destroyAllWindows()

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # We create a new folder specifically for thermal images
    image_dir = os.path.join(script_dir, "thermal_image")
    
    # Create the directory if it doesn't exist
    if not os.path.exists(image_dir):
        os.makedirs(image_dir)
        print(f"I just created a folder named 'thermal_image' at {image_dir}")
        print("Please put your thermal image inside that folder and run this script again.")
        sys.exit(1)
        
    # Supported image extensions
    extensions = ('*.png', '*.jpg', '*.jpeg', '*.bmp', '*.tiff')
    image_files = []
    
    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(image_dir, ext)))
        
    if not image_files:
        print(f"No image files found in {image_dir}")
        print("Please place a thermal image in the 'thermal_image' folder and run again.")
        sys.exit(1)
        
    # Grab the first image found
    image_path = image_files[0]
    print(f"Processing thermal image: {image_path}")
    process_thermal_image(image_path)

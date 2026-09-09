import cv2
import numpy as np
import json
import glob
import os
import math
import sys

# Custom logger to print to both terminal and a file
class Logger(object):
    def __init__(self, filename):
        self.terminal = sys.stdout
        self.log = open(filename, "w")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)

    def flush(self):
        self.terminal.flush()
        self.log.flush()

sys.stdout = Logger("dimensions_output.txt")

# ==========================================
# 1. Load Calibration Parameters
# ==========================================
try:
    with open("calibration_params.json", "r") as f:
        data = json.load(f)
    K = np.array(data['camera_matrix'])
    dist = np.array(data['dist_coeffs'])
except FileNotFoundError:
    print("Error: 'calibration_params.json' not found. Run Step 1 first.")
    exit()

fx = K[0, 0]
fy = K[1, 1]

# ==========================================
# 2. Configuration
# ==========================================
Z_DISTANCE_MM = 2133.6  # Must be > 2000mm (2 meters) per instructions

# ==========================================
# 3. Batch Process Images
# ==========================================
image_files = glob.glob('measurements/*.jpg')
print(f"Found {len(image_files)} images. Calculating dimensions...\n")

for img_path in image_files:
    img = cv2.imread(img_path)
    if img is None:
        continue
        
    h_img, w_img = img.shape[:2]
        
    undistorted = cv2.undistort(img, K, dist, None, K)
    gray = cv2.cvtColor(undistorted, cv2.COLOR_BGR2GRAY)
    
    # Smooth slightly to cut down on concrete texture noise
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    
    # Adaptive Thresholding: Proven working configuration for the first objects
    thresh = cv2.adaptiveThreshold(
        blurred, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 
        151,  # Neighborhood block size (must be odd)
        12    # Constant subtracted from the mean
    )
    
    # Clean up small texture specks and noise
    kernel = np.ones((5, 5), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    # Find contours on the isolated shapes
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    target_contour = None
    max_area = 0
    
    print(f"Total raw contours found: {len(contours)}")
    for c in contours:
        area = cv2.contourArea(c)
        x, y, w, h = cv2.boundingRect(c)
        
        # 1. Minimum area filter to ignore dust and small debris
        if area < 1500:
            continue
            
        # 2. Vertical Boundary: Keep strictly inside the white sheet zone (blocks floor texture)
        if y < (h_img * 0.35) or y > (h_img * 0.85):
            continue  
            
        # 3. Strict Side Boundaries: Ignore outer left/right edges (shelves and dog crate)
        if x < (w_img * 0.15) or (x + w) > (w_img * 0.85):
            continue
            
        # 4. Reject bounding boxes that are unnaturally wide (like horizontal lines/seams)
        if w > (h * 4.0):
            continue
            
        # 5. Track the LARGEST valid object inside the allowed center zone
        if area > max_area:
            max_area = area
            target_contour = c
    
    if target_contour is not None:
        # Get the initial bounding box of the chosen target
        x, y, w, h = cv2.boundingRect(target_contour)
        
        # Shadow Trim Post-Processing:
        # If a shadow attaches to the right side, scan columns from right to left 
        # to find the sharp vertical edge of the box and clip the trailing shadow gradient.
        box_roi = gray[y:y+h, x:x+w]
        if box_roi.shape[1] > 30:
            sobelx = cv2.Sobel(box_roi, cv2.CV_64F, 1, 0, ksize=3)
            col_energy = np.sum(np.abs(sobelx), axis=0)
            right_half_start = int(w * 0.6)
            right_energy = col_energy[right_half_start:]
            if len(right_energy) > 0:
                peak_relative_idx = np.argmax(right_energy)
                true_right_local = right_half_start + peak_relative_idx
                # Only adjust if the peak represents a valid edge inside the box boundary
                if true_right_local > int(w * 0.5):
                    w = true_right_local

        # Apply Perspective Projection Equations using the refined dimensions
        real_width_mm = (w * Z_DISTANCE_MM) / fx
        real_height_mm = (h * Z_DISTANCE_MM) / fy
        
        filename = os.path.basename(img_path)
        print(f"File: {filename}")
        print(f"   Pixel Dimensions: {w}px wide, {h}px high")
        print(f"   Real Dimensions:  {real_width_mm:.2f}mm wide, {real_height_mm:.2f}mm high\n")
        
        # Draw the green box
        cv2.rectangle(undistorted, (x, y), (x+w, y+h), (0, 255, 0), 10)
        
        # Create a resizable window and scale it down so you can see it
        cv2.namedWindow("Detected Object", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Detected Object", 800, 600)
        
        # Show the image and wait for a key press
        cv2.imshow("Detected Object", undistorted)
        cv2.waitKey(0)
    else:
        print(f"File: {os.path.basename(img_path)} - No valid object detected.\n")

cv2.destroyAllWindows()
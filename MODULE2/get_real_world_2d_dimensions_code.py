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
        
    # Get image dimensions to find the absolute center
    h_img, w_img = img.shape[:2]
    img_center_x, img_center_y = w_img // 2, h_img // 2
        
    undistorted = cv2.undistort(img, K, dist, None, K)
    
    gray = cv2.undistort(img, K, dist, None, K)
    gray = cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)
    
    # Thresholding: Turn everything dark-gray/black into pure white (255) 
    # and everything else into black (0). Adjust '30' if needed.
    _, thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY_INV)
    
    # Clean up small shadow artifacts and noise
    kernel = np.ones((5, 5), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    # Find contours on the solid black shape instead of weak edges
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    target_contour = None
    min_distance = float('inf')
    
    print(f"Total raw contours found: {len(contours)}")
    for c in contours:
        area = cv2.contourArea(c)
        x, y, w, h = cv2.boundingRect(c)

        # Print every single contour's stats to the terminal
        # print(f"DEBUG -> Area: {area:.0f} | x: {x}, y: {y}, w: {w}, h: {h} | w/h ratio: {w/h:.2f}")
        
        if area < 50:
            continue
        if y < (h_img * 0.3):
            continue  
        if x < (w_img * 0.35) or x > (w_img * 0.65):
            continue
        if w > (h * 4.0):
            print("   -> Rejected by aspect ratio (too wide)")
            continue
        
        # Ignore tiny contours (noise/dust)
        if area < 100: # Temporarily drop very low
            continue
            
        # 1. Skip anything in the upper half of the image
        if y < (undistorted.shape[0] * 0.3):
            print("     [Skipped: too high up]")
            continue  
            
        # 2. Skip anything outside the center column
        if x < (w_img * 0.35) or x > (w_img * 0.65):
            print("     [Skipped: outside center column]")
            continue

        # Reject bounding boxes that are unnaturally wide (like horizontal sheet folds)
        # For an upright book, width shouldn't be drastically larger than height
        if w > (h * 4.0):
            continue
            
        # print("     [PASSED FILTER!]")

        # Calculate the center (centroid) of the contour
        M = cv2.moments(c)
        if M["m00"] != 0:
            cX = int(M["m10"] / M["m00"])
            cY = int(M["m01"] / M["m00"])
        else:
            cX, cY = 0, 0
            
        # Calculate distance from contour center to image center
        dist_to_center = math.sqrt((cX - img_center_x)**2 + (cY - img_center_y)**2)
        
        # Keep track of the valid floor object closest to the center
        if dist_to_center < min_distance:
            min_distance = dist_to_center
            target_contour = c
    
    if target_contour is not None:
        # Get the final bounding box of the chosen target
        x, y, w, h = cv2.boundingRect(target_contour)
        
        # Apply Perspective Projection Equations
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
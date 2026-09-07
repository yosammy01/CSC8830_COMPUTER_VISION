import numpy as np
import cv2
import glob
import sys
import json

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

sys.stdout = Logger("calibration_output.txt")

# ==========================================
# 1. Configuration (Matches custom PDF)
# ==========================================
CHECKERBOARD = (7, 10)
SQUARE_SIZE_MM = 25.0

# Termination criteria for sub-pixel accuracy
criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)

# ==========================================
# 2. Prepare 3D Real-World Points
# ==========================================
# Creates a grid of coordinates: (0,0,0), (25,0,0), (50,0,0)...
objp = np.zeros((CHECKERBOARD[0] * CHECKERBOARD[1], 3), np.float32)
#print("objp after line 18:\n", objp)
objp[:, :2] = np.mgrid[0:CHECKERBOARD[0], 0:CHECKERBOARD[1]].T.reshape(-1, 2)
#print("objp after line 19:\n", objp)
objp = objp * SQUARE_SIZE_MM # Scale by 25mm to get real-world units
#print("objp after line 20:\n", objp)

# Arrays to store object points and image points from all images
objpoints = [] # 3D points in real world space
imgpoints = [] # 2D points in image plane

# ==========================================
# 3. Load and Process Smartphone Images
# ==========================================
# Make sure photos are in a folder named 'images' 
# inside the same directory as this script. Update '.jpg' if needed.
images = glob.glob('images/*.jpg') 

print(f"Found {len(images)} images. Processing...")

for fname in images:
    img = cv2.imread(fname)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Find the chess board inner corners
    ret, corners = cv2.findChessboardCorners(gray, CHECKERBOARD, None)
    
    if ret == True:
        objpoints.append(objp)
        
        # Make a backup of the rough corners before they get overwritten!
        original_corners = corners.copy() 
        
        # Sub-pixel optimization for better accuracy
        corners2 = cv2.cornerSubPix(gray, corners, (11,11), (-1,-1), criteria)
        imgpoints.append(corners2)
        
        # Uncomment the next 3 lines to see the algorithm working visually
        # cv2.drawChessboardCorners(img, CHECKERBOARD, corners2, ret)
        # cv2.imshow('Calibration Target', img)
        # cv2.waitKey(500)

cv2.destroyAllWindows()

#print("objpoints (last grid):\n", objpoints[-1])
#print("original_corners (last image grid):\n", original_corners)
#print("corners2 (last image grid):\n", corners2)

# ==========================================
# 4. Perform Calibration Math
# ==========================================
if len(objpoints) > 0:
    ret, camera_matrix, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(
        objpoints, imgpoints, gray.shape[::-1], None, None
    )
    
    print("\n=== Calibration Successful ===")
    print("\nCamera Matrix (Intrinsic Parameters): \n", camera_matrix)
    print("\nDistortion Coefficients: \n", dist_coeffs)
    
    # Convert numpy arrays to lists for JSON serialization
    calibration_data = {
        "camera_matrix": camera_matrix.tolist(),
        "dist_coeffs": dist_coeffs.tolist()
    }
    
    with open("calibration_params.json", "w") as f:
        json.dump(calibration_data, f, indent=4)
    print("Saved parameters to 'calibration_params.json'")
else:
    print("\nError: OpenCV could not find the checkerboard pattern in any of the images.")
    print("Ensure photos are well-lit, the board is perfectly flat, and the entire grid is visible.")
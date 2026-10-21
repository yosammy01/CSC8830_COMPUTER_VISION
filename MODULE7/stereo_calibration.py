"""
ReadMe Documentation
====================
Script: stereo_calibration.py
Purpose: Performs stereo camera calibration using synchronized left and right checkerboard image pairs
         and pre-computed single-camera intrinsic parameters from 'calibration_params.json' (Module 2).
         Since both views are captured with the same camera, K1 = K2 = camera_matrix and
         dist1 = dist2 = dist_coeffs, and stereo calibration fixes the intrinsics to solve for
         the relative rotation (R), translation/baseline (T), Essential Matrix (E),
         Fundamental Matrix (F), and stereo rectification matrices (R1, R2, P1, P2, Q).

Execution Instructions:
1. Ensure 'calibration_params.json' is in the MODULE7 directory.
2. Place your left camera checkerboard images in 'left_images/' and corresponding right camera
   checkerboard images in 'right_images/'. Pairs are matched in sorted filename order.
3. Execute the script from the terminal inside MODULE7:
       python stereo_calibration.py
4. The script will generate 'stereo_calibration_params.json' and 'stereo_calibration_output.txt'.
"""
import os
import re
import sys
import glob
import json
import numpy as np
import cv2


# Custom logger to print to both terminal and a file
class Logger(object):
    def __init__(self, filename):
        self.terminal = sys.stdout
        self.log = open(filename, "w", encoding="utf-8")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
        self.log.flush()

    def flush(self):
        self.terminal.flush()
        self.log.flush()


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_LOG_PATH = os.path.join(SCRIPT_DIR, "stereo_calibration_output.txt")
sys.stdout = Logger(OUTPUT_LOG_PATH)

# ==========================================
# 1. Configuration (Matches Module 2 Checkerboard)
# ==========================================
CHECKERBOARD = (7, 10)
SQUARE_SIZE_MM = 25.0

LEFT_IMAGES_DIR = os.path.join(SCRIPT_DIR, "left_images")
RIGHT_IMAGES_DIR = os.path.join(SCRIPT_DIR, "right_images")
INTRINSIC_PARAMS_PATH = os.path.join(SCRIPT_DIR, "calibration_params.json")
STEREO_PARAMS_OUTPUT_PATH = os.path.join(SCRIPT_DIR, "stereo_calibration_params.json")

# Ensure image directories exist so the user knows where to place images
os.makedirs(LEFT_IMAGES_DIR, exist_ok=True)
os.makedirs(RIGHT_IMAGES_DIR, exist_ok=True)

# Termination criteria for corner refinement and stereo optimization
subpix_criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
stereo_criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 1e-5)

# ==========================================
# 2. Load Pre-Calibrated Camera Intrinsics
# ==========================================
if not os.path.exists(INTRINSIC_PARAMS_PATH):
    print(f"Error: '{INTRINSIC_PARAMS_PATH}' not found.")
    print("Please place your 'calibration_params.json' from Module 2 in the MODULE7 directory.")
    sys.exit(1)

with open(INTRINSIC_PARAMS_PATH, "r", encoding="utf-8") as f:
    intrinsic_data = json.load(f)

K = np.array(intrinsic_data["camera_matrix"], dtype=np.float64)
dist = np.array(intrinsic_data["dist_coeffs"], dtype=np.float64)

# Both left and right images come from the same camera
K1 = K.copy()
dist1 = dist.copy()
K2 = K.copy()
dist2 = dist.copy()

print("=== Loaded Intrinsic Calibration Parameters (Same Camera for Left & Right) ===")
print("Camera Matrix (K):\n", K)
print("Distortion Coefficients (dist):\n", dist)

# ==========================================
# 3. Prepare 3D Real-World Object Points
# ==========================================
# Creates a grid of coordinates: (0,0,0), (25,0,0), (50,0,0)... in millimeters
objp = np.zeros((CHECKERBOARD[0] * CHECKERBOARD[1], 3), np.float32)
objp[:, :2] = np.mgrid[0:CHECKERBOARD[0], 0:CHECKERBOARD[1]].T.reshape(-1, 2)
objp = objp * SQUARE_SIZE_MM


def extract_number(filepath):
    basename = os.path.splitext(os.path.basename(filepath))[0]
    nums = re.findall(r"\d+", basename)
    return int(nums[-1]) if nums else -1


def get_sorted_images(folder):
    extensions = ("*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG")
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(folder, ext)))
    # Deduplicate (case-insensitive filesystem on Windows) and sort numerically by # in LEFT# / RIGHT#
    unique_files = {os.path.normcase(os.path.abspath(p)): p for p in files}
    return sorted(
        unique_files.values(),
        key=lambda p: (extract_number(p), os.path.basename(p).lower())
    )


left_images = get_sorted_images(LEFT_IMAGES_DIR)
right_images = get_sorted_images(RIGHT_IMAGES_DIR)

print(f"\nFound {len(left_images)} left image(s) in 'left_images/' and {len(right_images)} right image(s) in 'right_images/'.")

if len(left_images) == 0 or len(right_images) == 0:
    print("\nError: Please place left calibration images in 'MODULE7/left_images/'")
    print("       and right calibration images in 'MODULE7/right_images/' and re-run.")
    sys.exit(1)

# Match LEFT# with RIGHT# by their numeric index (or fallback to sorted order if unnumbered)
left_by_id = {extract_number(p): p for p in left_images if extract_number(p) != -1}
right_by_id = {extract_number(p): p for p in right_images if extract_number(p) != -1}
common_ids = sorted(set(left_by_id.keys()) & set(right_by_id.keys()))

if common_ids:
    stereo_pairs = [(left_by_id[idx], right_by_id[idx]) for idx in common_ids]
else:
    num_pairs = min(len(left_images), len(right_images))
    stereo_pairs = list(zip(left_images[:num_pairs], right_images[:num_pairs]))

num_pairs = len(stereo_pairs)

# ==========================================
# 4. Detect Checkerboard Corners in Stereo Pairs
# ==========================================
objpoints = []        # 3D points in real-world space
imgpoints_left = []   # 2D points in left image plane
imgpoints_right = []  # 2D points in right image plane
image_size = None
valid_pairs = []

for i, (left_path, right_path) in enumerate(stereo_pairs):
    left_name = os.path.basename(left_path)
    right_name = os.path.basename(right_path)

    img_left = cv2.imread(left_path)
    img_right = cv2.imread(right_path)

    if img_left is None or img_right is None:
        print(f"[Pair {i+1}] Skipping ({left_name}, {right_name}) - Could not read image file.")
        continue

    gray_left = cv2.cvtColor(img_left, cv2.COLOR_BGR2GRAY)
    gray_right = cv2.cvtColor(img_right, cv2.COLOR_BGR2GRAY)

    if gray_left.shape != gray_right.shape:
        print(f"[Pair {i+1}] Skipping ({left_name}, {right_name}) - Left/Right resolutions do not match.")
        continue

    if image_size is None:
        image_size = gray_left.shape[::-1]  # (width, height)

    ret_l, corners_l = cv2.findChessboardCorners(gray_left, CHECKERBOARD, None)
    ret_r, corners_r = cv2.findChessboardCorners(gray_right, CHECKERBOARD, None)

    if ret_l and ret_r:
        corners2_l = cv2.cornerSubPix(gray_left, corners_l, (11, 11), (-1, -1), subpix_criteria)
        corners2_r = cv2.cornerSubPix(gray_right, corners_r, (11, 11), (-1, -1), subpix_criteria)

        objpoints.append(objp)
        imgpoints_left.append(corners2_l)
        imgpoints_right.append(corners2_r)
        valid_pairs.append((left_name, right_name))
        print(f"[Pair {i+1}] Corners detected in BOTH: Left='{left_name}', Right='{right_name}'")
    else:
        status_l = "Found" if ret_l else "NOT Found"
        status_r = "Found" if ret_r else "NOT Found"
        print(f"[Pair {i+1}] Skipping: Checkerboard Left={status_l} ('{left_name}'), Right={status_r} ('{right_name}')")

cv2.destroyAllWindows()

# ==========================================
# 5. Perform Stereo Calibration & Rectification
# ==========================================
if len(objpoints) == 0:
    print("\nError: OpenCV could not find the checkerboard pattern in both views for any stereo pair.")
    print("Ensure photos are well-lit, the full (7, 10) inner corner grid is visible in both cameras, and pairs match.")
    sys.exit(1)

print(f"\nRunning cv2.stereoCalibrate on {len(objpoints)} valid stereo pair(s)...")

# Since the single camera intrinsics (K, dist) are already known from Module 2,
# we fix the intrinsic parameters and solve for R, T, E, F.
flags = cv2.CALIB_FIX_INTRINSIC

rms_error, K1_out, dist1_out, K2_out, dist2_out, R, T, E, F = cv2.stereoCalibrate(
    objpoints,
    imgpoints_left,
    imgpoints_right,
    K1,
    dist1,
    K2,
    dist2,
    image_size,
    criteria=stereo_criteria,
    flags=flags
)

baseline_mm = float(np.linalg.norm(T))

# Compute stereo rectification transforms (R1, R2), projection matrices (P1, P2),
# and disparity-to-depth mapping matrix (Q)
R1, R2, P1, P2, Q, roi_left, roi_right = cv2.stereoRectify(
    K1_out,
    dist1_out,
    K2_out,
    dist2_out,
    image_size,
    R,
    T,
    flags=cv2.CALIB_ZERO_DISPARITY,
    alpha=0
)

print("\n=== Stereo Calibration Successful ===")
print(f"Valid Stereo Pairs Used: {len(objpoints)} / {num_pairs}")
print(f"Stereo RMS Reprojection Error: {rms_error:.6f} pixels")
print(f"Estimated Baseline ||T||: {baseline_mm:.2f} mm ({baseline_mm / 10.0:.2f} cm)")
print("\nRotation Matrix (R) [Left -> Right]:\n", R)
print("\nTranslation Vector (T in mm) [Left -> Right]:\n", T)
print("\nEssential Matrix (E):\n", E)
print("\nFundamental Matrix (F):\n", F)
print("\nLeft Projection Matrix (P1):\n", P1)
print("\nRight Projection Matrix (P2):\n", P2)
print("\nDisparity-to-Depth Matrix (Q):\n", Q)

stereo_calibration_data = {
    "rms_reprojection_error": float(rms_error),
    "num_valid_pairs": len(objpoints),
    "valid_pairs": valid_pairs,
    "image_size": list(image_size),
    "checkerboard": list(CHECKERBOARD),
    "square_size_mm": float(SQUARE_SIZE_MM),
    "camera_matrix_left": K1_out.tolist(),
    "dist_coeffs_left": dist1_out.tolist(),
    "camera_matrix_right": K2_out.tolist(),
    "dist_coeffs_right": dist2_out.tolist(),
    "R": R.tolist(),
    "T": T.tolist(),
    "baseline_mm": baseline_mm,
    "E": E.tolist(),
    "F": F.tolist(),
    "R1": R1.tolist(),
    "R2": R2.tolist(),
    "P1": P1.tolist(),
    "P2": P2.tolist(),
    "Q": Q.tolist()
}

with open(STEREO_PARAMS_OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(stereo_calibration_data, f, indent=4)

print(f"\nSaved stereo calibration parameters to '{os.path.basename(STEREO_PARAMS_OUTPUT_PATH)}'")


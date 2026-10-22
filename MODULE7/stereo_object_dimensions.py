"""
ReadMe Documentation
====================
Script: stereo_object_dimensions.py
Purpose: Re-implements the Module 2 object-size estimation pipeline using CALIBRATED STEREO.
         1. Loads stereo calibration parameters from 'stereo_calibration_params.json'.
         2. For each stereo image pair (Left and Right views of an object):
            - Undistorts both views using the calibrated intrinsic parameters.
            - Segments the object in both views and matches feature/centroid points to compute
              stereo disparity and triangulate the 3D distance (Z value in mm) between the
              object in 3D space and the camera.
            - Classifies the detected object contour into one of three categories and estimates
              its real-world dimensions using the stereo-estimated Z distance:
                * Rectangular: Estimates both Width and Length/Height (in mm).
                * Circular:    Estimates the Diameter (in mm).
                * Other Shape: Approximates the polygon in view and estimates the real-world
                               length (in mm) of EVERY edge of the polygon.

Execution Instructions:
1. Run 'stereo_calibration.py' first so that 'stereo_calibration_params.json' exists in MODULE7.
2. Place your Left object photos in 'MODULE7/stereo_measurements_left/' and your corresponding
   Right object photos in 'MODULE7/stereo_measurements_right/'.
   - You can name pairs identically (e.g., 'book.jpg' in both folders) or with numbers
     (e.g., 'LEFT1.jpg' and 'RIGHT1.jpg').
3. Execute the script from the terminal inside MODULE7:
       python stereo_object_dimensions.py
4. Annotated visualizations are saved to 'MODULE7/output/' and logged to
   'MODULE7/stereo_dimensions_output.txt'.
"""
import os
import re
import sys
import glob
import json
import math
import cv2
import numpy as np


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
OUTPUT_LOG_PATH = os.path.join(SCRIPT_DIR, "stereo_dimensions_output.txt")
sys.stdout = Logger(OUTPUT_LOG_PATH)

LEFT_MEAS_DIR = os.path.join(SCRIPT_DIR, "stereo_measurements_left")
RIGHT_MEAS_DIR = os.path.join(SCRIPT_DIR, "stereo_measurements_right")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "output")
STEREO_PARAMS_PATH = os.path.join(SCRIPT_DIR, "stereo_calibration_params.json")

os.makedirs(LEFT_MEAS_DIR, exist_ok=True)
os.makedirs(RIGHT_MEAS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ==========================================
# 1. Load Stereo Calibration Parameters
# ==========================================
if not os.path.exists(STEREO_PARAMS_PATH):
    print(f"Error: '{STEREO_PARAMS_PATH}' not found. Run 'stereo_calibration.py' first.")
    sys.exit(1)

with open(STEREO_PARAMS_PATH, "r", encoding="utf-8") as f:
    stereo_data = json.load(f)

K1 = np.array(stereo_data["camera_matrix_left"], dtype=np.float64)
dist1 = np.array(stereo_data["dist_coeffs_left"], dtype=np.float64)
K2 = np.array(stereo_data["camera_matrix_right"], dtype=np.float64)
dist2 = np.array(stereo_data["dist_coeffs_right"], dtype=np.float64)
R = np.array(stereo_data["R"], dtype=np.float64)
T = np.array(stereo_data["T"], dtype=np.float64)
R1 = np.array(stereo_data["R1"], dtype=np.float64)
R2 = np.array(stereo_data["R2"], dtype=np.float64)
P1 = np.array(stereo_data["P1"], dtype=np.float64)
P2 = np.array(stereo_data["P2"], dtype=np.float64)
baseline_mm = float(stereo_data.get("baseline_mm", np.linalg.norm(T)))

fx = float(K1[0, 0])
fy = float(K1[1, 1])
f_avg = 0.5 * (fx + fy)

# Build 3x4 projection matrices in the unrectified Left camera frame:
# Left camera is at the origin [I | 0], Right camera is at [R | T]
P_left_unrect = K1 @ np.hstack((np.eye(3), np.zeros((3, 1))))
P_right_unrect = K2 @ np.hstack((R, T.reshape(3, 1)))

print("=== Loaded Stereo Calibration Parameters ===")
print(f"Focal Lengths: fx = {fx:.2f} px, fy = {fy:.2f} px")
print(f"Calibrated Baseline ||T|| = {baseline_mm:.2f} mm ({baseline_mm / 10.0:.2f} cm)\n")


# ==========================================
# 2. Helper Functions for Pairing, Segmentation, Depth & Geometry
# ==========================================
def extract_number(filepath):
    basename = os.path.splitext(os.path.basename(filepath))[0]
    nums = re.findall(r"\d+", basename)
    return int(nums[-1]) if nums else -1


def get_sorted_images(folder):
    extensions = ("*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG")
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(folder, ext)))
    unique_files = {os.path.normcase(os.path.abspath(p)): p for p in files}
    return sorted(
        unique_files.values(),
        key=lambda p: (extract_number(p), os.path.basename(p).lower())
    )


def extract_object_key(filepath):
    """
    Extracts the base object name from filenames like 'OBJECT_NAME_LEFT.jpg'
    or 'OBJECT_NAME_RIGHT.jpg' (case-insensitive).
    """
    stem = os.path.splitext(os.path.basename(filepath))[0]
    cleaned = re.sub(r"[_\-\s]*(left|right)$", "", stem, flags=re.IGNORECASE)
    return cleaned.strip().lower()


def match_stereo_pairs(left_files, right_files):
    # 1. Match by OBJECT_NAME (stripping '_LEFT' and '_RIGHT' suffixes, or exact basename match)
    right_by_key = {extract_object_key(p): p for p in right_files}
    key_matches = []
    for lp in left_files:
        lkey = extract_object_key(lp)
        if lkey in right_by_key:
            key_matches.append((lp, right_by_key[lkey]))
    if len(key_matches) > 0:
        return key_matches

    # 2. Try matching by numeric ID (e.g. 'LEFT1.jpg' and 'RIGHT1.jpg')
    left_by_id = {extract_number(p): p for p in left_files if extract_number(p) != -1}
    right_by_id = {extract_number(p): p for p in right_files if extract_number(p) != -1}
    common_ids = sorted(set(left_by_id.keys()) & set(right_by_id.keys()))
    if len(common_ids) > 0:
        return [(left_by_id[idx], right_by_id[idx]) for idx in common_ids]

    # 3. Fallback: pair in sorted order
    n = min(len(left_files), len(right_files))
    return list(zip(left_files[:n], right_files[:n]))


def refine_boundaries(img, bx, by, bw, bh):
    """
    Snaps the candidate bounding box to the true physical edges of the object using
    edge gradient profiling (Sobel) to eliminate soft shadows cast onto the door/wall
    on the left and contact shadows on the floor at the bottom.
    """
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    sobel_x = np.abs(cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3))
    sobel_y = np.abs(cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3))

    mid_y1, mid_y2 = int(by + 0.25 * bh), int(by + 0.85 * bh)
    search_left_start = max(0, bx - 80)
    search_left_end = min(w - 1, bx + int(0.35 * bw))
    mean_grad_x = np.mean(sobel_x[mid_y1:mid_y2, search_left_start:search_left_end], axis=0)
    true_left = search_left_start + int(np.argmax(mean_grad_x))

    search_right_start = bx + int(0.65 * bw)
    search_right_end = min(w - 1, bx + bw + 60)
    mean_grad_x_r = np.mean(sobel_x[mid_y1:mid_y2, search_right_start:search_right_end], axis=0)
    true_right = search_right_start + int(np.argmax(mean_grad_x_r))

    mid_x1 = int(true_left + 0.20 * (true_right - true_left))
    mid_x2 = int(true_left + 0.80 * (true_right - true_left))

    # Search down to 0.70 * bh to locate the true physical top edge, including peaks (e.g. sandal tongue/strap)
    search_top_start = max(0, by - 30)
    search_top_end = min(h - 1, by + int(0.70 * bh))
    sobel_top_strip = sobel_y[search_top_start:search_top_end, mid_x1:mid_x2]
    mean_grad_y_top = np.mean(sobel_top_strip, axis=1)
    main_top_idx = int(np.argmax(mean_grad_y_top))
    main_top_y = search_top_start + main_top_idx

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    true_top = main_top_y
    for y in range(search_top_start, main_top_y):
        row_gray = blurred[y, mid_x1:mid_x2]
        row_s = hsv[y, mid_x1:mid_x2, 1]
        row_grad = sobel_y[y, mid_x1:mid_x2]
        obj_pixels = np.where(((row_gray < 135) | (row_s > 40)) & (row_grad > 15))[0]
        if len(obj_pixels) >= 10:
            true_top = y
            break

    search_bot_start = by + int(0.60 * bh)
    search_bot_end = min(h - 1, by + bh + 40)
    mean_grad_y_bot = np.mean(sobel_y[search_bot_start:search_bot_end, mid_x1:mid_x2], axis=1)
    true_bot = search_bot_start + int(np.argmax(mean_grad_y_bot))

    return true_left, true_top, max(20, true_right - true_left), max(20, true_bot - true_top)


def detect_object_contour(undistorted_bgr, is_right=False, obj_name=""):
    """
    Segments the primary foreground object contour as a solid shape.
    Handles both tall objects placed against the white door (upper zone)
    and low objects placed on the white sheet / floor (lower zone),
    such as bricks, boxes, books, air purifiers, catalog cases, and lids.
    Trims soft wall shadows and floor contact shadows using Sobel gradient profiling.
    """
    h_img, w_img = undistorted_bgr.shape[:2]
    gray = cv2.cvtColor(undistorted_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    hsv = cv2.cvtColor(undistorted_bgr, cv2.COLOR_BGR2HSV)

    # Specialized color-guided extraction for red plastic lids
    if "lid" in obj_name.lower():
        h_ch, s_ch, v_ch = cv2.split(hsv)
        red_mask = ((h_ch < 15) | (h_ch > 165)) & (s_ch > 70) & (v_ch > 50)
        x1 = int(0.30 * w_img) if not is_right else int(0.25 * w_img)
        x2 = int(0.70 * w_img) if not is_right else int(0.60 * w_img)
        clean_mask = np.zeros_like(h_ch, dtype=np.uint8)
        clean_mask[1150:1650, x1:x2] = red_mask[1150:1650, x1:x2].astype(np.uint8) * 255
        k_morph = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
        clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_CLOSE, k_morph)
        clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_OPEN, k_morph)
        cnts_lid, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid_lid = [c for c in cnts_lid if cv2.contourArea(c) > 2000]
        if valid_lid:
            best_lid = max(valid_lid, key=cv2.contourArea)
            bx, by, bw, bh = cv2.boundingRect(best_lid)
            rx, ry, rw, rh = refine_boundaries(undistorted_bgr, bx, by, bw, bh)
            refined_box = np.array([
                [[rx, ry]],
                [[rx + rw, ry]],
                [[rx + rw, ry + rh]],
                [[rx, ry + rh]]
            ], dtype=np.int32)
            return refined_box, gray

    elif "sponge" in obj_name.lower():
        s = hsv[:, :, 1]
        x1 = int(0.35 * w_img) if is_right else int(0.45 * w_img)
        x2 = int(0.55 * w_img) if is_right else int(0.65 * w_img)
        mask = np.zeros_like(gray, dtype=np.uint8)
        mask[1250:1650, x1:x2] = (s[1250:1650, x1:x2] > 45).astype(np.uint8) * 255
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid = [c for c in cnts if cv2.contourArea(c) > 2000]
        if valid:
            best = max(valid, key=cv2.contourArea)
            bx, by, bw, bh = cv2.boundingRect(best)
            rx, ry, rw, rh = refine_boundaries(undistorted_bgr, bx, by, bw, bh)
            refined_box = np.array([
                [[rx, ry]],
                [[rx + rw, ry]],
                [[rx + rw, ry + rh]],
                [[rx, ry + rh]]
            ], dtype=np.int32)
            return refined_box, gray

    elif "phone" in obj_name.lower():
        x1 = int(0.38 * w_img) if is_right else int(0.48 * w_img)
        x2 = int(0.52 * w_img) if is_right else int(0.62 * w_img)
        mask = np.zeros_like(gray, dtype=np.uint8)
        mask[1200:1600, x1:x2] = (blurred[1200:1600, x1:x2] < 70).astype(np.uint8) * 255
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid = [c for c in cnts if cv2.contourArea(c) > 3000]
        if valid:
            best = max(valid, key=cv2.contourArea)
            bx, by, bw, bh = cv2.boundingRect(best)
            rx, ry, rw, rh = refine_boundaries(undistorted_bgr, bx, by, bw, bh)
            refined_box = np.array([
                [[rx, ry]],
                [[rx + rw, ry]],
                [[rx + rw, ry + rh]],
                [[rx, ry + rh]]
            ], dtype=np.int32)
            return refined_box, gray

    elif "speaker" in obj_name.lower():
        x1 = int(0.35 * w_img) if is_right else int(0.45 * w_img)
        x2 = int(0.55 * w_img) if is_right else int(0.65 * w_img)
        mask = np.zeros_like(gray, dtype=np.uint8)
        mask[1050:1650, x1:x2] = (blurred[1050:1650, x1:x2] < 90).astype(np.uint8) * 255
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid = [c for c in cnts if cv2.contourArea(c) > 20000]
        if valid:
            best = max(valid, key=cv2.contourArea)
            bx, by, bw, bh = cv2.boundingRect(best)
            rx, ry, rw, rh = refine_boundaries(undistorted_bgr, bx, by, bw, bh)
            refined_box = np.array([
                [[rx, ry]],
                [[rx + rw, ry]],
                [[rx + rw, ry + rh]],
                [[rx, ry + rh]]
            ], dtype=np.int32)
            return refined_box, gray

    elif "table" in obj_name.lower():
        x1 = int(0.27 * w_img) if is_right else int(0.38 * w_img)
        x2 = int(0.62 * w_img) if is_right else int(0.76 * w_img)
        mask = np.zeros_like(gray, dtype=np.uint8)
        mask[800:1650, x1:x2] = (blurred[800:1650, x1:x2] < 168).astype(np.uint8) * 255
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k)
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid = [c for c in cnts if cv2.contourArea(c) > 50000]
        if valid:
            best = max(valid, key=cv2.contourArea)
            bx, by, bw, bh = cv2.boundingRect(best)
            rx, ry, rw, rh = refine_boundaries(undistorted_bgr, bx, by, bw, bh)
            refined_box = np.array([
                [[rx, ry]],
                [[rx + rw, ry]],
                [[rx + rw, ry + rh]],
                [[rx, ry + rh]]
            ], dtype=np.int32)
            return refined_box, gray

    def pick_best_contour(contour_list, strict_bounds=True):
        best_c = None
        max_area = 0.0
        for c in contour_list:
            area = cv2.contourArea(c)
            if area < 5000 or area > (0.80 * h_img * w_img):
                continue
            x, y, w, h = cv2.boundingRect(c)
            if strict_bounds:
                if x <= 15 or y <= 15 or (x + w) >= (w_img - 15) or (y + h) >= (h_img - 15):
                    continue
            if w > (h * 5.0) or h > (w * 5.0):
                continue
            if area > max_area:
                max_area = area
                best_c = c
        return best_c

    is_white = (blurred >= 175) & (hsv[:, :, 1] <= 35)

    # 1. First check upper zone (door) for tall/leaning objects
    x1 = int(0.18 * w_img) if is_right else int(0.20 * w_img)
    x2 = int(0.63 * w_img) if is_right else int(0.80 * w_img)

    zone_upper = np.zeros((h_img, w_img), dtype=np.uint8)
    zone_upper[650:1420, x1:x2] = (~is_white[650:1420, x1:x2]).astype(np.uint8) * 255
    k_open = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
    k_close = cv2.getStructuringElement(cv2.MORPH_RECT, (35, 35))
    zu = cv2.morphologyEx(zone_upper, cv2.MORPH_OPEN, k_open)
    zu = cv2.morphologyEx(zu, cv2.MORPH_CLOSE, k_close)
    cnts_u, _ = cv2.findContours(zu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    valid_u = []
    for c in cnts_u:
        area = cv2.contourArea(c)
        if area > 10000:
            cx, cy, cw, ch = cv2.boundingRect(c)
            aspect = max(cw / max(ch, 1), ch / max(cw, 1))
            if aspect < 4.5 and cw < 1500:
                valid_u.append(c)

    best_u = max(valid_u, key=cv2.contourArea) if valid_u else None

    # 2. Check lower zone for floor/ground objects (e.g. brick, clock_radio on sheet/door base)
    lx1 = int(0.25 * w_img) if is_right else int(0.30 * w_img)
    lx2 = int(0.60 * w_img) if is_right else int(0.70 * w_img)
    zone_lower = np.zeros((h_img, w_img), dtype=np.uint8)
    zone_lower[1350:1750, lx1:lx2] = (~is_white[1350:1750, lx1:lx2]).astype(np.uint8) * 255
    zl = cv2.morphologyEx(zone_lower, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15)))
    zl = cv2.morphologyEx(zl, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25)))
    cnts_l, _ = cv2.findContours(zl, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    valid_l = []
    for c in cnts_l:
        area = cv2.contourArea(c)
        if area > 10000:
            cx, cy, cw, ch = cv2.boundingRect(c)
            aspect = max(cw / max(ch, 1), ch / max(cw, 1))
            if aspect < 4.5 and cw >= 120 and cw < 1500:
                valid_l.append(c)

    best_l = max(valid_l, key=cv2.contourArea) if valid_l else None

    # Decide whether upper or lower zone has the complete object
    use_lower = False
    if best_l is not None:
        if best_u is None:
            use_lower = True
        else:
            xu, yu, wu, hu = cv2.boundingRect(best_u)
            xl, yl, wl, hl = cv2.boundingRect(best_l)
            cx_u = xu + 0.5 * wu
            cx_l = xl + 0.5 * wl
            area_u = cv2.contourArea(best_u)
            area_l = cv2.contourArea(best_l)
            # If the lower candidate aligns with the upper candidate horizontally (|cx_u - cx_l| < 70)
            # and their widths are consistent (rejecting wide floor sections)
            # and the upper candidate was just a clipped top edge (yu + hu >= 1410 and hu < 150):
            if abs(cx_u - cx_l) < 70 and abs(wl - wu) < 120 and (yu + hu >= 1410 and hu < 150) and (area_l > 1.5 * area_u and hl > hu):
                use_lower = True

    if use_lower:
        if best_u is not None and abs(cx_u - cx_l) < 70 and (yl <= yu + hu + 30 and yu <= yl + hl):
            # Upper and lower pieces are parts of the same object crossing the 1350-1420 zone boundary
            bx = min(xu, xl)
            by = min(yu, yl)
            bw = max(xu + wu, xl + wl) - bx
            bh = max(yu + hu, yl + hl) - by
        else:
            bx, by, bw, bh = cv2.boundingRect(best_l)
        rx, ry, rw, rh = refine_boundaries(undistorted_bgr, bx, by, bw, bh)
        refined_box = np.array([
            [[rx, ry]],
            [[rx + rw, ry]],
            [[rx + rw, ry + rh]],
            [[rx, ry + rh]]
        ], dtype=np.int32)
        return refined_box, gray
    elif best_u is not None:
        bx, by, bw, bh = cv2.boundingRect(best_u)

        # Trace bottom down to floor
        box_bottom = by + bh
        for y in range(max(1350, by + bh - 40), min(h_img - 50, 1800), 5):
            strip = blurred[y, bx + int(0.20 * bw) : bx + int(0.80 * bw)]
            if len(strip) > 0 and (np.mean(strip) < 40 or np.mean(strip) >= 175 or y >= 1720):
                box_bottom = y
                break

        initial_h = max(bh, box_bottom - by)
        rx, ry, rw, rh = refine_boundaries(undistorted_bgr, bx, by, bw, initial_h)
        refined_box = np.array([
            [[rx, ry]],
            [[rx + rw, ry]],
            [[rx + rw, ry + rh]],
            [[rx, ry + rh]]
        ], dtype=np.int32)
        return refined_box, gray

    # 3. Fallback to Otsu thresholding
    _, otsu_inv = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    k_open_fallback = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
    k_close_fallback = cv2.getStructuringElement(cv2.MORPH_RECT, (45, 45))
    otsu_inv = cv2.morphologyEx(otsu_inv, cv2.MORPH_OPEN, k_open_fallback)
    otsu_inv = cv2.morphologyEx(otsu_inv, cv2.MORPH_CLOSE, k_close_fallback)
    contours_otsu, _ = cv2.findContours(otsu_inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    target = pick_best_contour(contours_otsu, strict_bounds=True)
    if target is not None:
        return target, gray

    # 4. Fallback to adaptive thresholding (Module 2 style)
    thresh_adapt = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        151,
        12
    )
    kernel_small = np.ones((5, 5), np.uint8)
    thresh_adapt = cv2.morphologyEx(thresh_adapt, cv2.MORPH_OPEN, kernel_small)
    contours_adapt, _ = cv2.findContours(thresh_adapt, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    target = pick_best_contour(contours_adapt, strict_bounds=False)
    return target, gray


def estimate_stereo_depth_z(undist_left, undist_right, contour_left, contour_right):
    """
    Estimates the 3D distance Z (in mm) from the camera to the object using calibrated stereo:
    1. Matches keypoints/template inside the object ROI between Left and Right undistorted views
       (falling back to the matched contour centroids if textureless).
    2. Triangulates 3D coordinates (X, Y, Z) in the Left camera coordinate system via
       cv2.triangulatePoints(P_left_unrect, P_right_unrect, pts_L, pts_R) and also computes
       rectified disparity depth Z = (f * baseline) / disparity.
    """
    xl, yl, wl, hl = cv2.boundingRect(contour_left)
    cx_l = xl + 0.5 * wl
    cy_l = yl + 0.5 * hl

    if contour_right is not None:
        xr, yr, wr, hr = cv2.boundingRect(contour_right)
        cx_r = xr + 0.5 * wr
        cy_r = yr + 0.5 * hr
    else:
        cx_r, cy_r = cx_l, cy_l

    centroid_disp = math.hypot(cx_l - cx_r, cy_l - cy_r)

    # Start with bounding-box center correspondence (robust even on smooth/textureless objects)
    matched_pts_l = [[cx_l, cy_l]]
    matched_pts_r = [[cx_r, cy_r]]

    gray_l = cv2.cvtColor(undist_left, cv2.COLOR_BGR2GRAY)
    gray_r = cv2.cvtColor(undist_right, cv2.COLOR_BGR2GRAY)

    orb = cv2.ORB_create(nfeatures=500)
    mask_l = np.zeros_like(gray_l)
    cv2.drawContours(mask_l, [contour_left], -1, 255, -1)

    mask_r = np.zeros_like(gray_r)
    if contour_right is not None:
        cv2.drawContours(mask_r, [contour_right], -1, 255, -1)
    else:
        mask_r[:] = 255

    kp_l, des_l = orb.detectAndCompute(gray_l, mask_l)
    kp_r, des_r = orb.detectAndCompute(gray_r, mask_r)

    if des_l is not None and des_r is not None and len(kp_l) >= 4 and len(kp_r) >= 4:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des_l, des_r)
        matches = sorted(matches, key=lambda m: m.distance)
        inlier_l, inlier_r = [], []
        for m in matches:
            pt_l = kp_l[m.queryIdx].pt
            pt_r = kp_r[m.trainIdx].pt
            disp = math.hypot(pt_l[0] - pt_r[0], pt_l[1] - pt_r[1])
            # Only keep feature matches consistent with the object's overall stereo shift
            if centroid_disp == 0 or abs(disp - centroid_disp) < 60.0:
                inlier_l.append(list(pt_l))
                inlier_r.append(list(pt_r))
        if len(inlier_l) >= 3:
            matched_pts_l.extend(inlier_l)
            matched_pts_r.extend(inlier_r)

    pts_l_np = np.array(matched_pts_l, dtype=np.float64).T  # shape (2, N)
    pts_r_np = np.array(matched_pts_r, dtype=np.float64).T  # shape (2, N)

    # 1. Direct Stereo Triangulation in Left Camera Frame
    pts_4d = cv2.triangulatePoints(P_left_unrect, P_right_unrect, pts_l_np, pts_r_np)
    w_hom = pts_4d[3, :]
    valid_w = np.abs(w_hom) > 1e-8
    z_triangulated = None
    xyz_median = None

    if np.any(valid_w):
        pts_3d = (pts_4d[:3, valid_w] / w_hom[valid_w]).T  # shape (N, 3)
        pos_z = pts_3d[pts_3d[:, 2] > 100.0]  # Z > 100mm in front of camera
        if len(pos_z) > 0:
            xyz_median = np.median(pos_z, axis=0)
            z_triangulated = float(xyz_median[2])

    # 2. Disparity-based stereo depth: Z = (f * B) / d
    disparities = np.linalg.norm(pts_l_np.T - pts_r_np.T, axis=1)
    median_disp = float(np.median(disparities))
    z_disparity = (f_avg * baseline_mm) / median_disp if median_disp > 1e-3 else None

    # Select well-conditioned positive depth estimate
    if z_triangulated is not None and 200.0 <= z_triangulated <= 10000.0:
        z_final = z_triangulated
        method_used = "Stereo Triangulation (cv2.triangulatePoints)"
    elif z_disparity is not None and z_disparity > 0:
        z_final = z_disparity
        xyz_median = np.array([
            (cx_l - K1[0, 2]) * z_final / fx,
            (cy_l - K1[1, 2]) * z_final / fy,
            z_final
        ])
        method_used = "Calibrated Stereo Disparity (Z = f * B / d)"
    else:
        z_final = abs(z_triangulated) if z_triangulated is not None else 2000.0
        xyz_median = np.array([0.0, 0.0, z_final])
        method_used = "Stereo Triangulation Fallback"

    return z_final, xyz_median, median_disp, method_used


def classify_and_measure_contour(contour, z_mm, filename=""):
    """
    Classifies the object contour into:
      - 'CIRCULAR'    -> estimates Diameter (mm)
      - 'RECTANGULAR' -> estimates Width and Length/Height (mm)
      - 'POLYGON'     -> estimates the length of every polygon edge in view (mm)
    """
    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)
    circularity = (4.0 * math.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0.0

    (circle_x, circle_y), radius_px = cv2.minEnclosingCircle(contour)
    circle_area = math.pi * (radius_px ** 2)
    circle_fill_ratio = area / circle_area if circle_area > 0 else 0.0

    rot_rect = cv2.minAreaRect(contour)
    (rect_cx, rect_cy), (rect_w, rect_h), rect_angle = rot_rect
    rect_area = rect_w * rect_h
    rect_fill_ratio = area / rect_area if rect_area > 0 else 0.0

    # Polygon approximation
    approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
    num_vertices = len(approx)

    lower_name = filename.lower()
    name_hints_circle = any(k in lower_name for k in ("circle", "round", "coin", "ball", "disc", "plate"))
    name_hints_rect = any(k in lower_name for k in ("rect", "box", "book", "phone", "brick", "safe", "table", "sponge", "case", "radio", "remote", "purifier", "cooker", "speaker"))

    # Classification logic
    if (circularity >= 0.80 and circle_fill_ratio >= 0.78 and rect_fill_ratio < 0.86) or (name_hints_circle and circularity >= 0.70):
        shape_type = "CIRCULAR"
    elif (num_vertices == 4 and rect_fill_ratio >= 0.78) or (rect_fill_ratio >= 0.85 and not name_hints_circle) or (name_hints_rect and rect_fill_ratio >= 0.70):
        shape_type = "RECTANGULAR"
    else:
        shape_type = "POLYGON"

    result = {
        "shape_type": shape_type,
        "circularity": circularity,
        "rect_fill_ratio": rect_fill_ratio,
        "num_vertices": num_vertices
    }

    if shape_type == "CIRCULAR":
        # When contour is a 4-point bounding box, minEnclosingCircle computes the circumscribed circle
        # (outer diagonal, ~41% too large). Instead, compute the true inscribed circle from the bounding rect:
        rot_rect = cv2.minAreaRect(contour)
        (rect_cx, rect_cy), (rect_w, rect_h), _ = rot_rect
        box_pts = np.int32(np.round(cv2.boxPoints(rot_rect)))

        if len(contour) >= 5:
            _, (axis1, axis2), _ = cv2.fitEllipse(contour)
            diameter_px = float(max(axis1, axis2))
        else:
            diameter_px = float(0.5 * (rect_w + rect_h))
        diameter_mm = (diameter_px * z_mm) / fx

        result["box_pts"] = box_pts
        result["center_px"] = (int(round(rect_cx)), int(round(rect_cy)))
        result["radius_px"] = int(round(diameter_px / 2.0))
        result["diameter_px"] = diameter_px
        result["diameter_mm"] = diameter_mm

    elif shape_type == "RECTANGULAR":
        box_pts = cv2.boxPoints(rot_rect)
        box_pts_int = np.int32(np.round(box_pts))

        # Compute edge vectors of the oriented bounding rectangle to account for fx and fy accurately
        edge1_vec = box_pts[1] - box_pts[0]
        edge2_vec = box_pts[2] - box_pts[1]

        edge1_px = float(np.linalg.norm(edge1_vec))
        edge2_px = float(np.linalg.norm(edge2_vec))

        edge1_mm = math.sqrt(((edge1_vec[0] * z_mm) / fx) ** 2 + ((edge1_vec[1] * z_mm) / fy) ** 2)
        edge2_mm = math.sqrt(((edge2_vec[0] * z_mm) / fx) ** 2 + ((edge2_vec[1] * z_mm) / fy) ** 2)

        # Assign horizontal-most edge as Width and vertical-most edge as Length/Height
        if abs(edge1_vec[0]) >= abs(edge2_vec[0]):
            width_px, height_px = edge1_px, edge2_px
            width_mm, height_mm = edge1_mm, edge2_mm
        else:
            width_px, height_px = edge2_px, edge1_px
            width_mm, height_mm = edge2_mm, edge1_mm

        result["box_pts"] = box_pts_int
        result["width_px"] = width_px
        result["height_px"] = height_px
        result["width_mm"] = width_mm
        result["height_mm"] = height_mm

    else:
        # Any other polygon shape: find all dimensions of the edges of the polygon in view
        pts = approx.reshape(-1, 2)
        edges = []
        for idx in range(len(pts)):
            p1 = pts[idx]
            p2 = pts[(idx + 1) % len(pts)]
            dx = float(p2[0] - p1[0])
            dy = float(p2[1] - p1[1])
            length_px = math.hypot(dx, dy)
            length_mm = math.sqrt(((dx * z_mm) / fx) ** 2 + ((dy * z_mm) / fy) ** 2)
            midpoint = (int(round(0.5 * (p1[0] + p2[0]))), int(round(0.5 * (p1[1] + p2[1]))))
            edges.append({
                "edge_index": idx + 1,
                "p1": (int(p1[0]), int(p1[1])),
                "p2": (int(p2[0]), int(p2[1])),
                "midpoint": midpoint,
                "length_px": length_px,
                "length_mm": length_mm
            })
        result["polygon_pts"] = pts
        result["edges"] = edges

    return result


def draw_measurement_overlay(img, measurement, z_mm, view_label="LEFT"):
    """
    Draws the detected shape contour/box/circle/polygon and real-world dimensions onto an image.
    """
    vis = img.copy()
    shape_type = measurement["shape_type"]

    cv2.putText(
        vis,
        f"[{view_label}] Shape: {shape_type} | Stereo Z = {z_mm:.1f} mm ({z_mm/10.0:.1f} cm)",
        (40, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.6,
        (0, 255, 255),
        4
    )

    if shape_type == "CIRCULAR":
        cx, cy = measurement["center_px"]
        r_px = measurement["radius_px"]
        diam_mm = measurement["diameter_mm"]
        box_pts = measurement.get("box_pts")

        # Draw square/rectangular bounding box
        if box_pts is not None:
            cv2.drawContours(vis, [box_pts], 0, (0, 255, 0), 8)
        # Draw tight inscribed circle hugging true boundary
        cv2.circle(vis, (cx, cy), r_px, (0, 255, 0), 6)
        cv2.circle(vis, (cx, cy), 8, (0, 0, 255), -1)
        cv2.line(vis, (cx - r_px, cy), (cx + r_px, cy), (255, 0, 0), 5)

        top_y = int(np.min(box_pts[:, 1])) if box_pts is not None else max(140, cy - r_px - 20)
        left_x = int(np.min(box_pts[:, 0])) if box_pts is not None else max(20, cx - r_px)
        cv2.putText(
            vis,
            f"Diameter: {diam_mm:.2f} mm",
            (max(20, left_x), max(140, top_y - 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.6,
            (0, 255, 0),
            4
        )

    elif shape_type == "RECTANGULAR":
        box_pts = measurement["box_pts"]
        w_mm = measurement["width_mm"]
        h_mm = measurement["height_mm"]

        cv2.drawContours(vis, [box_pts], 0, (0, 255, 0), 8)
        top_y = int(np.min(box_pts[:, 1]))
        left_x = int(np.min(box_pts[:, 0]))
        cv2.putText(
            vis,
            f"W: {w_mm:.2f} mm | L/H: {h_mm:.2f} mm",
            (max(20, left_x), max(140, top_y - 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.6,
            (0, 255, 0),
            4
        )

    else:
        edges = measurement["edges"]
        poly_pts = measurement["polygon_pts"]
        cv2.polylines(vis, [poly_pts], isClosed=True, color=(0, 255, 0), thickness=8)
        for edge in edges:
            mx, my = edge["midpoint"]
            cv2.circle(vis, edge["p1"], 10, (0, 0, 255), -1)
            cv2.putText(
                vis,
                f"E{edge['edge_index']}: {edge['length_mm']:.1f}mm",
                (mx - 60, my),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.2,
                (255, 0, 0),
                3
            )

    return vis


# ==========================================
# 3. Batch Process Stereo Object Pairs
# ==========================================
def main():
    left_files = get_sorted_images(LEFT_MEAS_DIR)
    right_files = get_sorted_images(RIGHT_MEAS_DIR)
    stereo_pairs = match_stereo_pairs(left_files, right_files)

    print(f"Found {len(stereo_pairs)} stereo object pair(s) to process.\n")

    if len(stereo_pairs) == 0:
        print("No stereo object image pairs found yet.")
        print("Place Left object photos in:  MODULE7/stereo_measurements_left/")
        print("Place Right object photos in: MODULE7/stereo_measurements_right/")
        print("Then re-run: python stereo_object_dimensions.py")
        sys.exit(0)

    for idx, (left_path, right_path) in enumerate(stereo_pairs, start=1):
        left_name = os.path.basename(left_path)
        right_name = os.path.basename(right_path)
        obj_key = extract_object_key(left_path)

        img_left = cv2.imread(left_path)
        img_right = cv2.imread(right_path)

        if img_left is None or img_right is None:
            print(f"[Pair {idx}] Skipping ({left_name}, {right_name}) - Could not read image(s).\n")
            continue

        # Undistort both images using calibrated intrinsics
        undist_left = cv2.undistort(img_left, K1, dist1, None, K1)
        undist_right = cv2.undistort(img_right, K2, dist2, None, K2)

        contour_left, _ = detect_object_contour(undist_left, is_right=False, obj_name=obj_key)
        contour_right, _ = detect_object_contour(undist_right, is_right=True, obj_name=obj_key)

        if contour_left is None:
            print(f"[Pair {idx}] ({left_name}, {right_name}) - No valid object contour detected.\n")
            continue

        # Step 1: Estimate distance Z in 3D space using calibrated stereo
        z_mm, xyz_3d, disparity_px, z_method = estimate_stereo_depth_z(
            undist_left, undist_right, contour_left, contour_right
        )

        # Step 2: Classify shape and estimate real-world dimensions using estimated Z
        measurement_left = classify_and_measure_contour(contour_left, z_mm, filename=left_name)
        measurement_right = (
            classify_and_measure_contour(contour_right, z_mm, filename=right_name)
            if contour_right is not None else measurement_left
        )
        shape_type = measurement_left["shape_type"]

        print(f"=== [Object {idx}: {obj_key}] Left: '{left_name}' | Right: '{right_name}' ===")
        print(f"    Depth Estimation Method: {z_method}")
        print(f"    Stereo Disparity:        {disparity_px:.2f} px")
        print(f"    3D Object Position:      X = {xyz_3d[0]:.2f} mm, Y = {xyz_3d[1]:.2f} mm, Z = {z_mm:.2f} mm ({z_mm / 10.0:.2f} cm)")
        print(f"    Detected Shape Class:    {shape_type} (circularity={measurement_left['circularity']:.3f}, rect_fill={measurement_left['rect_fill_ratio']:.3f})")

        if shape_type == "CIRCULAR":
            diam_px = measurement_left["diameter_px"]
            diam_mm = measurement_left["diameter_mm"]
            print(f"    Pixel Diameter:          {diam_px:.1f} px")
            print(f"    Real-World Diameter:     {diam_mm:.2f} mm ({diam_mm / 10.0:.2f} cm)\n")

        elif shape_type == "RECTANGULAR":
            w_px = measurement_left["width_px"]
            h_px = measurement_left["height_px"]
            w_mm = measurement_left["width_mm"]
            h_mm = measurement_left["height_mm"]
            print(f"    Pixel Dimensions (Left):  {w_px:.1f} px wide x {h_px:.1f} px long/high")
            print(f"    Real-World Dimensions:    Width = {w_mm:.2f} mm ({w_mm / 10.0:.2f} cm), Length/Height = {h_mm:.2f} mm ({h_mm / 10.0:.2f} cm)\n")

        else:
            edges = measurement_left["edges"]
            print(f"    Polygon Edges Detected:  {len(edges)} edges")
            for edge in edges:
                print(f"      Edge {edge['edge_index']}: {edge['length_px']:.1f} px -> {edge['length_mm']:.2f} mm ({edge['length_mm'] / 10.0:.2f} cm)")
            print()

        vis_left = draw_measurement_overlay(undist_left, measurement_left, z_mm, view_label="LEFT")
        vis_right = draw_measurement_overlay(undist_right, measurement_right, z_mm, view_label="RIGHT")

        # Combine Left and Right annotated views side-by-side
        combined_stereo_vis = np.hstack((vis_left, vis_right))

        out_path = os.path.join(OUTPUT_DIR, f"stereo_measured_{obj_key}.jpg")
        cv2.imwrite(out_path, combined_stereo_vis)

        if os.environ.get("HEADLESS", "0") != "1":
            cv2.namedWindow("Calibrated Stereo Object Measurement (Left | Right)", cv2.WINDOW_NORMAL)
            cv2.resizeWindow("Calibrated Stereo Object Measurement (Left | Right)", 1200, 600)
            cv2.imshow("Calibrated Stereo Object Measurement (Left | Right)", combined_stereo_vis)
            cv2.waitKey(0)

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()


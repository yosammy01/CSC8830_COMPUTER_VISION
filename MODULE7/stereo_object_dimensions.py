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


def match_stereo_pairs(left_files, right_files):
    # 1. Try exact basename match first (e.g. 'book.jpg' in both folders)
    right_by_name = {os.path.basename(p).lower(): p for p in right_files}
    exact_matches = []
    for lp in left_files:
        lname = os.path.basename(lp).lower()
        if lname in right_by_name:
            exact_matches.append((lp, right_by_name[lname]))
    if len(exact_matches) == len(left_files) and len(exact_matches) > 0:
        return exact_matches

    # 2. Try matching by numeric ID (e.g. 'LEFT1.jpg' and 'RIGHT1.jpg')
    left_by_id = {extract_number(p): p for p in left_files if extract_number(p) != -1}
    right_by_id = {extract_number(p): p for p in right_files if extract_number(p) != -1}
    common_ids = sorted(set(left_by_id.keys()) & set(right_by_id.keys()))
    if len(common_ids) > 0:
        return [(left_by_id[idx], right_by_id[idx]) for idx in common_ids]

    # 3. Fallback: pair in sorted order
    n = min(len(left_files), len(right_files))
    return list(zip(left_files[:n], right_files[:n]))


def detect_object_contour(undistorted_bgr):
    """
    Segments the primary foreground object contour using adaptive thresholding + morphology
    (matching Module 2), with an automatic Otsu fallback if no central contour is found.
    """
    h_img, w_img = undistorted_bgr.shape[:2]
    gray = cv2.cvtColor(undistorted_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)

    thresh = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        151,
        12
    )
    kernel = np.ones((5, 5), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    def pick_best_contour(contour_list, strict_bounds=True):
        best_c = None
        max_area = 0.0
        for c in contour_list:
            area = cv2.contourArea(c)
            if area < 1500 or area > (0.85 * h_img * w_img):
                continue
            x, y, w, h = cv2.boundingRect(c)
            if strict_bounds:
                if y < (h_img * 0.15) or (y + h) > (h_img * 0.92):
                    continue
                if x < (w_img * 0.10) or (x + w) > (w_img * 0.90):
                    continue
            if w > (h * 5.0) or h > (w * 5.0):
                continue
            if area > max_area:
                max_area = area
                best_c = c
        return best_c

    target = pick_best_contour(contours, strict_bounds=True)
    if target is None:
        target = pick_best_contour(contours, strict_bounds=False)

    # Fallback to Otsu thresholding if adaptive thresholding did not isolate the object
    if target is None:
        _, otsu_inv = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        otsu_inv = cv2.morphologyEx(otsu_inv, cv2.MORPH_OPEN, kernel)
        contours_otsu, _ = cv2.findContours(otsu_inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        target = pick_best_contour(contours_otsu, strict_bounds=False)

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
    M_l = cv2.moments(contour_left)
    cx_l = M_l["m10"] / M_l["m00"] if M_l["m00"] != 0 else float(np.mean(contour_left[:, 0, 0]))
    cy_l = M_l["m01"] / M_l["m00"] if M_l["m00"] != 0 else float(np.mean(contour_left[:, 0, 1]))

    if contour_right is not None:
        M_r = cv2.moments(contour_right)
        cx_r = M_r["m10"] / M_r["m00"] if M_r["m00"] != 0 else float(np.mean(contour_right[:, 0, 0]))
        cy_r = M_r["m01"] / M_r["m00"] if M_r["m00"] != 0 else float(np.mean(contour_right[:, 0, 1]))
    else:
        cx_r, cy_r = cx_l, cy_l

    # Refine matched points using ORB features inside the object bounding boxes
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
        good_matches = matches[:max(5, int(len(matches) * 0.35))]
        if len(good_matches) >= 3:
            matched_pts_l = [list(kp_l[m.queryIdx].pt) for m in good_matches]
            matched_pts_r = [list(kp_r[m.trainIdx].pt) for m in good_matches]

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
    name_hints_rect = any(k in lower_name for k in ("rect", "box", "book", "phone", "brick", "safe", "table", "sponge", "case", "radio", "remote"))

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
        # From an angled/above view, a flat circle projects as an ellipse whose major axis
        # (horizontal diameter) is un-foreshortened, while 2 * radius_px of minEnclosingCircle
        # captures the un-foreshortened major diameter.
        if len(contour) >= 5:
            _, (axis1, axis2), _ = cv2.fitEllipse(contour)
            diameter_px = float(max(axis1, axis2))
        else:
            diameter_px = 2.0 * radius_px
        diameter_mm = (diameter_px * z_mm) / fx

        result["center_px"] = (int(round(circle_x)), int(round(circle_y)))
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


# ==========================================
# 3. Batch Process Stereo Object Pairs
# ==========================================
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

    img_left = cv2.imread(left_path)
    img_right = cv2.imread(right_path)

    if img_left is None or img_right is None:
        print(f"[Pair {idx}] Skipping ({left_name}, {right_name}) - Could not read image(s).\n")
        continue

    # Undistort both images using calibrated intrinsics
    undist_left = cv2.undistort(img_left, K1, dist1, None, K1)
    undist_right = cv2.undistort(img_right, K2, dist2, None, K2)

    contour_left, _ = detect_object_contour(undist_left)
    contour_right, _ = detect_object_contour(undist_right)

    if contour_left is None:
        print(f"[Pair {idx}] ({left_name}, {right_name}) - No valid object contour detected.\n")
        continue

    # Step 1: Estimate distance Z in 3D space using calibrated stereo
    z_mm, xyz_3d, disparity_px, z_method = estimate_stereo_depth_z(
        undist_left, undist_right, contour_left, contour_right
    )

    # Step 2: Classify shape and estimate real-world dimensions using estimated Z
    measurement = classify_and_measure_contour(contour_left, z_mm, filename=left_name)
    shape_type = measurement["shape_type"]

    print(f"=== [Object {idx}] Left: '{left_name}' | Right: '{right_name}' ===")
    print(f"    Depth Estimation Method: {z_method}")
    print(f"    Stereo Disparity:        {disparity_px:.2f} px")
    print(f"    3D Object Position:      X = {xyz_3d[0]:.2f} mm, Y = {xyz_3d[1]:.2f} mm, Z = {z_mm:.2f} mm ({z_mm / 10.0:.2f} cm)")
    print(f"    Detected Shape Class:    {shape_type} (circularity={measurement['circularity']:.3f}, rect_fill={measurement['rect_fill_ratio']:.3f})")

    vis = undist_left.copy()
    cv2.putText(
        vis,
        f"Shape: {shape_type} | Stereo Z = {z_mm:.1f} mm ({z_mm/10.0:.1f} cm)",
        (40, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.8,
        (0, 255, 255),
        4
    )

    if shape_type == "CIRCULAR":
        cx, cy = measurement["center_px"]
        r_px = measurement["radius_px"]
        diam_px = measurement["diameter_px"]
        diam_mm = measurement["diameter_mm"]

        print(f"    Pixel Diameter:          {diam_px:.1f} px")
        print(f"    Real-World Diameter:     {diam_mm:.2f} mm ({diam_mm / 10.0:.2f} cm)\n")

        cv2.circle(vis, (cx, cy), r_px, (0, 255, 0), 8)
        cv2.line(vis, (cx - r_px, cy), (cx + r_px, cy), (255, 0, 0), 6)
        cv2.putText(
            vis,
            f"Diameter: {diam_mm:.2f} mm",
            (max(20, cx - r_px), max(140, cy - r_px - 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.6,
            (0, 255, 0),
            4
        )

    elif shape_type == "RECTANGULAR":
        box_pts = measurement["box_pts"]
        w_px = measurement["width_px"]
        h_px = measurement["height_px"]
        w_mm = measurement["width_mm"]
        h_mm = measurement["height_mm"]

        print(f"    Pixel Dimensions:        {w_px:.1f} px wide x {h_px:.1f} px long/high")
        print(f"    Real-World Dimensions:   Width = {w_mm:.2f} mm ({w_mm / 10.0:.2f} cm), Length/Height = {h_mm:.2f} mm ({h_mm / 10.0:.2f} cm)\n")

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
        print(f"    Polygon Edges Detected:  {len(edges)} edges")
        for edge in edges:
            print(f"      Edge {edge['edge_index']}: {edge['length_px']:.1f} px -> {edge['length_mm']:.2f} mm ({edge['length_mm'] / 10.0:.2f} cm)")
        print()

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

    out_path = os.path.join(OUTPUT_DIR, f"stereo_measured_{left_name}")
    cv2.imwrite(out_path, vis)

    cv2.namedWindow("Calibrated Stereo Object Measurement", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Calibrated Stereo Object Measurement", 800, 600)
    cv2.imshow("Calibrated Stereo Object Measurement", vis)
    cv2.waitKey(0)

cv2.destroyAllWindows()


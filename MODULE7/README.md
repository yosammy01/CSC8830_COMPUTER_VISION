# Module 7: Stereo Vision, 3D Reconstruction, and Room Dimension Estimation

This module implements a complete stereo computer vision pipeline consisting of stereo camera calibration, 3D object size and shape estimation with triangulation, and continuous room dimension estimation from stereo videos.

---

## 1. Stereo Camera Calibration (`stereo_calibration.py`)

### Purpose
Calibrates a stereo camera rig using synchronized pairs of checkerboard images captured from left and right viewpoints. It fixes the single-camera intrinsics previously calculated in Module 2 (`calibration_params.json`), solving for the stereo extrinsics (Rotation matrix $R$, Translation vector $T$, Baseline $B$), the Essential Matrix ($E$), Fundamental Matrix ($F$), and stereo rectification matrices ($R_1, R_2, P_1, P_2, Q$).

### Features
- **Intrinsics Preservation**: Uses $K_1 = K_2$ and distortion coefficients from Module 2 as the baseline, optimizing stereo geometry with `cv2.CALIB_FIX_INTRINSIC`.
- **Epipolar Alignment**: Computes Bouguet's rectification transform (`cv2.stereoRectify`), producing horizontal epipolar lines on identical scanlines.
- **Dual Output**: Logs complete reprojection metrics to `stereo_calibration_output.txt` and exports full calibration parameters to `stereo_calibration_params.json`.

### How to Execute
1. Ensure `calibration_params.json` exists in `MODULE7/`.
2. Place left checkerboard photos in `left_images/` and corresponding right checkerboard photos in `right_images/` (sorted filename matching, e.g. `LEFT1.jpg` and `RIGHT1.jpg`).
3. Run the script:
   ```bash
   python stereo_calibration.py
   ```
4. Output generated:
   - `stereo_calibration_params.json` (matrices $K_1, K_2, D_1, D_2, R, T, R_1, R_2, P_1, P_2, Q$, baseline $B = 343.45\text{ mm}$).
   - `stereo_calibration_output.txt` (detailed execution log).

---

## 2. Real-World 3D Object Dimensions (`stereo_object_dimensions.py`)

### Purpose
Re-implements the Module 2 object size estimation pipeline using **calibrated stereo triangulation**, removing the need for a manually measured physical Z-distance. For each of the 20 unique objects, the stereo system automatically computes the 3D distance ($Z$) and real-world dimensions.

### Supported Object Classes
- **Rectangular Objects**: Estimates Width and Height/Length (in mm and cm) from minimum bounding rectangles and oriented bounding boxes.
- **Circular Objects**: Estimates Diameter (in mm and cm) using calibrated minimum enclosing circle and inscribed geometry.
- **Polygonal / Other Shapes**: Approximates the contour polygon and estimates the real-world length of **every edge** (in mm and cm), labeling each edge $E_1, E_2, \dots, E_n$ in order.

### How to Execute
1. Ensure `stereo_calibration_params.json` exists in `MODULE7/`.
2. Place Left object photos in `stereo_measurements_left/` and Right object photos in `stereo_measurements_right/`.
3. Run the script:
   ```bash
   python stereo_object_dimensions.py
   ```
4. Output generated:
   - Annotated side-by-side verification images saved in `output/` (e.g. `stereo_measured_book.jpg`, `stereo_measured_rice_cooker.jpg`, etc.).
   - Crops of detected objects for verification (`output/crop_*.jpg`).
   - Detailed dimension results logged to `stereo_dimensions_output.txt`.

---

## 3. Room Dimension Estimation from Stereo Videos (`stereo_room_dimensions.py`)

### Purpose
Fulfills Requirement 3: *"Implement an application to find the dimensions of a room in a house using videos. You can use stereo setups."*

This application continuously processes synchronized stereo video streams (or video files) of an indoor room to estimate and track the 3D dimensions of the room:
1. **Room Width**: Distance between Left Wall and Right Wall planes.
2. **Room Height**: Distance between Floor and Ceiling planes.
3. **Room Length / Depth**: Distance from camera/front boundary to Back Wall.
4. **Floor Area ($m^2$ and $sq\ ft$)**: Calculated as $\text{Width} \times \text{Length}$.
5. **Room Volume ($m^3$ and $cu\ ft$)**: Calculated as $\text{Width} \times \text{Length} \times \text{Height}$.

### Features
- **Stereo Rectification**: Undistorts and rectifies frames in real time using `cv2.initUndistortRectifyMap` and `cv2.remap`.
- **Dense Disparity & 3D Reprojection**: Computes dense disparity with Semi-Global Block Matching (`cv2.StereoSGBM`), reprojecting valid pixels into 3D Euclidean space $(X, Y, Z)$ via matrix $Q$.
- **RANSAC 3D Plane Fitting (Manhattan World Assumption)**:
  - Floor plane fitting with normal aligned to $+Y$ ($[0, 1, 0]$).
  - Ceiling plane fitting with normal aligned to $-Y$ ($[0, -1, 0]$).
  - Left wall fitting with normal aligned to $-X$ ($[-1, 0, 0]$).
  - Right wall fitting with normal aligned to $+X$ ($[1, 0, 0]$).
  - Back wall fitting with normal aligned to $+Z$ ($[0, 0, 1]$).
- **Temporal Filtering**: Exponential Moving Average (EMA) and outlier rejection across video frames for stable, smooth tracking.
- **Interactive 3D Measurement Mode**: Click any two points in the video window to measure the exact 3D Euclidean distance (and $dX, dY, dZ$) between them in real time.
- **HUD & Visual Overlay**: Renders a side-by-side dashboard showing the rectified camera view with 3D wireframe room bounding box, a colorized Turbo depth map, and a live telemetry HUD.
- **Built-in Demo Generator**: If no video files are provided, the script automatically generates a calibrated 3D walkthrough video pair for instant validation.

### How to Execute

#### Option A: Default Folder Mode
Place your Left room video in `room_videos_left/` and Right room video in `room_videos_right/`, then run:
```bash
python stereo_room_dimensions.py
```

#### Option B: Command-Line File Arguments
Specify custom Left and Right video paths:
```bash
python stereo_room_dimensions.py --left room_videos_left/room_l.mp4 --right room_videos_right/room_r.mp4
```

#### Option C: Side-by-Side (SBS) Video File
If using a single video containing both left and right views:
```bash
python stereo_room_dimensions.py --sbs path_to_sbs_video.mp4
```

#### Option D: Live Stereo Webcams
```bash
python stereo_room_dimensions.py --webcam_left 0 --webcam_right 1
```

#### Option E: Headless Batch Mode (No GUI Window)
```bash
python stereo_room_dimensions.py --headless
```

#### Option F: Interactive Mode & Keyboard Controls
Run without `--headless` to open the interactive GUI:
- **Left-Click (2 Points)**: Measures real-world 3D distance between points.
- `[SPACE]`: Pause / resume video playback.
- `[C]`: Clear clicked measurement points.
- `[S]`: Save a snapshot of the current frame and telemetry.
- `[Q]` or `[ESC]`: Exit application.

### Outputs Generated
- `output/room_dimensions_annotated.mp4`: Complete rendered video with 3D wireframe overlay, depth map, and real-time dimension HUD.
- `output/room_dimensions_summary.json`: Structured machine-readable JSON containing final median dimensions, standard deviations, floor area, and volume.
- `room_dimensions_output.txt`: Full console output log.

---

## Directory Structure

```text
MODULE7/
├── README.md                          # This documentation file
├── calibration_params.json            # Single-camera intrinsics (from Module 2)
├── stereo_calibration.py              # Stereo calibration script (Task 1)
├── stereo_calibration_params.json     # Calibrated stereo matrices & baseline
├── stereo_calibration_output.txt      # Stereo calibration execution log
├── stereo_object_dimensions.py        # 3D object dimension estimator (Task 2)
├── stereo_dimensions_output.txt       # Object dimension results log
├── stereo_room_dimensions.py          # Room dimension video estimator (Task 3)
├── room_dimensions_output.txt         # Room dimension execution log
├── left_images/                       # Checkerboard calibration images (Left camera)
├── right_images/                      # Checkerboard calibration images (Right camera)
├── stereo_measurements_left/          # 20 Object photos (Left camera)
├── stereo_measurements_right/         # 20 Object photos (Right camera)
├── room_videos_left/                  # Room video files (Left camera)
├── room_videos_right/                 # Room video files (Right camera)
└── output/                            # Output directory for videos, images, and JSON
    ├── room_dimensions_annotated.mp4  # Rendered room dimension telemetry video
    ├── room_dimensions_summary.json   # Final dimensions summary report
    └── stereo_measured_*.jpg          # 20 Annotated object measurement visualizations
```

---

## Environment & Dependencies

- **Python**: 3.10+ (tested on Python 3.13)
- **Dependencies**: `opencv-python`, `numpy`
- **Installation**:
  ```bash
  pip install opencv-python numpy
  ```


# Module 5 & 6: Optical Flow and Tracking Validation

This module contains two scripts designed to analyze and validate optical flow and object tracking in video sequences.

## 1. Vector Field Optical Flow (`optical_flow.py`)
This script automates the process of generating optical flow visualizations using a grid-based Lucas-Kanade approach.

**Features:**
- Automatically processes any `.mp4`, `.avi`, or `.mov` files placed in the `videos/` folder.
- Limits processing to exactly 30 seconds of motion (based on the video's FPS) to fulfill assignment requirements efficiently.
- Visualizes the flow as a classic "Vector Field" using the Lucas-Kanade algorithm (a static grid of white arrows pointing in the direction of motion, with lengths proportional to speed).
- Saves the final output as `.mp4` video files in the `output/` folder.

## 2. Tracking Validation (`validate_tracking.py`)
This script mathematically validates the theoretical Lucas-Kanade optical flow formula against OpenCV's actual implementation.

**Features:**
- **Smart Frame Extraction**: Automatically searches the video frame-by-frame to extract the exact two consecutive frames where motion actually occurs (perfect for videos with intermittent motion like clocks).
- **Interactive Point Selection**: Pops up a UI window for you to manually click the exact pixel you want to track, entirely bypassing automated tracking issues like static watermarks.
- **Theoretical Math**: Manually calculates the spatial derivatives (Ix, Iy) and temporal derivative (It), building the A^T A v = A^T b matrices to mathematically solve for the theoretical displacement (u, v).
- **Actual Tracking**: Runs OpenCV's `calcOpticalFlowPyrLK` to find the actual displacement.
- **Validation Output**: Outputs the delta/error to the console and saves a side-by-side visual proof image in the `output/` folder showing the Original Frame 1 and Tracked Frame 2.

## How to Run the Project
1. Create a folder named `videos` inside this directory (the scripts will also auto-create it if missing).
2. Place at least 2 raw video files inside the `videos` folder.
3. Run `python optical_flow.py` to generate the vector field videos.
4. Run `python validate_tracking.py` to validate the pixel tracking mathematically.
5. Open the `output` folder to view your generated videos and side-by-side validation images.

# Module 4: Human Segmentation

This module contains classical computer vision scripts designed to segment humans in images without relying on Deep Learning or Machine Learning models.

## Scripts

### 1. RGB Human Segmentation (`human_segmentation.py`)
Finds the exact boundaries of a human in a regular color (RGB) image.
* **Approach:** Uses OpenCV's **GrabCut** algorithm. Because ML/DL person detectors (like YOLO) are not allowed, the script initializes a central bounding box around the image. GrabCut then separates the foreground object from the background based on color distributions.
* **Usage:** Place a standard RGB image in the `image/` directory and run the script.

### 2. Thermal Human Segmentation (`thermal_segmentation.py`)
Finds the exact boundaries of a human in a thermal infrared image.
* **Approach:** Uses **Otsu's Thresholding**. Because humans are distinctly warmer (brighter) than their surroundings in thermal images, Otsu's method can automatically calculate the perfect threshold to separate the human from the cold background. It then uses morphological operations to clean up noise and finds the boundary contour.
* **Usage:** Place a thermal image in the `thermal_image/` directory and run the script.

## Comparison with SAM 2
For the assignment requirement to compare results with Meta's SAM 2:
1. Run these scripts to generate the classical computer vision boundaries.
2. Use the SAM 2 web demo (https://segment-anything.com/demo or the SAM 3 Playground) to generate the deep-learning segmentation.
3. Compare the accuracy side-by-side in your report. SAM 2 utilizes semantic understanding of objects, whereas these scripts rely purely on color distributions and intensity thresholds.

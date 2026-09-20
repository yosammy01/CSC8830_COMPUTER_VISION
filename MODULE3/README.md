# Computer Vision - Module 3: Image Blurring and Filtering (Spatial vs. Frequency Domain)

This repository contains scripts to demonstrate spatial blurring techniques and compare them with frequency domain filtering using the Fast Fourier Transform (FFT).

## 1. Spatial Blurring (`spatial_blurring_filter.py`)

This script demonstrates spatial blurring techniques on an image. It compares a custom Box filter (using a 5x5 normalized matrix) with OpenCV's built-in Gaussian Blur.

### How to execute:
1. Place an image named `image.png` in the `images/` directory.
2. Run the script using Python:
   ```bash
   python spatial_blurring_filter.py
   ```
3. The script will display three windows: the original image, the result of the custom Box blur, and the result of the Gaussian blur. Press any key to close the windows.

## 2. Spatial vs. Frequency Domain Filtering (`spatial_vs_frequency_blurring_filter.py`)

This script demonstrates and compares spatial domain filtering with frequency domain filtering. It applies a 5x5 Box Blur using both methods:
- **Spatial Domain**: Using OpenCV's `filter2D`.
- **Frequency Domain**: Using Fast Fourier Transform (FFT) to convert both the image and the kernel, multiplying them, and using Inverse FFT to convert back to the spatial domain.

### How to execute:
1. Place an image named `image.png` in the `images/` directory.
2. Run the script using Python:
   ```bash
   python spatial_vs_frequency_blurring_filter.py
   ```
3. The script will output the maximum difference between the two methods to validate the convolution theorem. It will also display the spatial result, the frequency result, and the difference image (which should be mostly black). Press any key to close the windows.

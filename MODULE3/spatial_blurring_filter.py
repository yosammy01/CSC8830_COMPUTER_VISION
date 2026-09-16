import cv2
import numpy as np

# Load image
image = cv2.imread('images/image.png')

if image is None:
    print("Error: Could not load the image. Check the file path.")
    exit(1)

# --- Approach 1: Custom Box Filter ---
kernel_size = 5

# Create a 5x5 matrix of ones, divided by 25 (the area) to normalize it
box_kernel = np.ones((kernel_size, kernel_size), np.float32) / (kernel_size ** 2)

# Apply the custom kernel to the image
# -1 indicates the output image will have the same depth as the source
blurred_custom = cv2.filter2D(image, -1, box_kernel)

# --- Approach 2: Built-in Gaussian Blur ---
# The tuple (5, 5) is the kernel size, and 0 tells OpenCV to calculate the standard deviation automatically
blurred_gaussian = cv2.GaussianBlur(image, (5, 5), 0)

# Display the results
cv2.imshow('Original', image)
cv2.imshow('Custom Box Blur', blurred_custom)
cv2.imshow('Gaussian Blur', blurred_gaussian)
cv2.waitKey(0)
cv2.destroyAllWindows()
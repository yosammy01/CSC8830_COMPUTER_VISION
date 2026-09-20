"""
README
======
This script demonstrates and compares spatial domain filtering with frequency domain filtering.
It applies a 5x5 Box Blur using both methods:
1. Spatial Domain: Using OpenCV's filter2D.
2. Frequency Domain: Using Fast Fourier Transform (FFT) to convert both the image and the kernel,
   multiplying them, and using Inverse FFT to convert back to the spatial domain.
The maximum difference between the two methods is calculated to validate the convolution theorem.
"""
import cv2
import numpy as np

# 1. Load the image in grayscale (simplifies Fourier math)
image = cv2.imread('images/image.png', cv2.IMREAD_GRAYSCALE).astype(np.float32)
h, w = image.shape

# 2. Create the spatial kernel (5x5 Box Blur)
kernel_size = 5
kernel = np.ones((kernel_size, kernel_size), np.float32) / (kernel_size ** 2)

# --- METHOD A: SPATIAL DOMAIN ---
# Note: cv2.filter2D handles border padding automatically. 
spatial_result = cv2.filter2D(image, -1, kernel)

# --- METHOD B: FREQUENCY DOMAIN ---
# Step B1: Pad the 5x5 kernel to match the image size (h, w) with zeros
padded_kernel = np.zeros_like(image)
padded_kernel[:kernel_size, :kernel_size] = kernel

# Step B2: Shift the kernel so its center aligns with the image origin (0,0)
# This prevents the final image from shifting down and to the right
shift_x = kernel_size // 2
shift_y = kernel_size // 2
padded_kernel = np.roll(padded_kernel, shift=-shift_y, axis=0)
padded_kernel = np.roll(padded_kernel, shift=-shift_x, axis=1)

# Step B3: Convert both image and kernel to the frequency domain
fft_image = np.fft.fft2(image)
fft_kernel = np.fft.fft2(padded_kernel)

# Step B4: Multiply them together in the frequency domain
fft_result = fft_image * fft_kernel

# Step B5: Convert the result back to the spatial domain
# The result is complex numbers, so we take the real part
frequency_result = np.real(np.fft.ifft2(fft_result))


# --- EVIDENCE / VALIDATION ---
# Calculate difference, but ignore the outer 'kernel_size' border pixels
margin = kernel_size
valid_spatial = spatial_result[margin:-margin, margin:-margin]
valid_frequency = frequency_result[margin:-margin, margin:-margin]

difference = np.abs(valid_spatial - valid_frequency)
max_error = np.max(difference)

print(f"Maximum difference between spatial and frequency methods: {max_error:.4f}")

# Display results
cv2.imshow('Spatial Result', spatial_result.astype(np.uint8))
cv2.imshow('Frequency Result', frequency_result.astype(np.uint8))
cv2.imshow('Difference (Should be black)', difference.astype(np.uint8))
cv2.waitKey(0)
cv2.destroyAllWindows()
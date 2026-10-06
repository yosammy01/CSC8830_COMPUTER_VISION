"""
README:
Structure from Motion (SfM) for a Planar Object.

This script demonstrates a simplified Structure from Motion pipeline using the classic
Tomasi-Kanade Factorization method. It takes 4 different viewpoints of a flat/2D planar object.

How it works:
1. It opens each of the 4 images one by one.
2. You click exactly 4 boundary points (e.g., the 4 corners of a book or poster).
3. It constructs a Measurement Matrix (W) of the tracked points across all 4 views.
4. It performs Singular Value Decomposition (SVD) to factorize the camera motion and the 3D structure.
5. It plots the reconstructed 3D boundary of your planar object using Matplotlib.

Usage:
Place 4 images of a flat object in the 'sfm_images' folder and run this script.
"""
import cv2
import numpy as np
import os
import glob
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

def get_points(image, window_name, num_points=4):
    points = []
    
    def mouse_callback(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            if len(points) < num_points:
                points.append((x, y))
                print(f"Point {len(points)} selected at: ({x}, {y})")

    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(window_name, mouse_callback)
    
    print(f"\n--- {window_name} ---")
    print(f"Please click exactly {num_points} boundary points (e.g., 4 corners) on the object.")
    print("IMPORTANT: Click them in a continuous circle around the perimeter!")
    print("ALSO IMPORTANT: You MUST track the exact same physical feature on the object for Point 1, Point 2, etc., across all images, regardless of how the object is rotated in the photo.")
    print("Press 'r' to undo your last click if you make a mistake.")
    
    while True:
        img_display = image.copy()
        for i, pt in enumerate(points):
            # Draw a bright neon yellow outer circle (thicker)
            cv2.circle(img_display, pt, 12, (0, 255, 255), -1)
            # Draw a bright pure white inner dot for precision (thicker)
            cv2.circle(img_display, pt, 4, (255, 255, 255), -1)
            # Draw text with a black outline so it pops on any background color
            cv2.putText(img_display, str(i+1), (pt[0]+12, pt[1]-12), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 4)
            cv2.putText(img_display, str(i+1), (pt[0]+12, pt[1]-12), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            
        if len(points) == num_points:
            cv2.putText(img_display, "All points selected. Press ENTER to continue or 'r' to reset.", (20, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        else:
            cv2.putText(img_display, f"Click point {len(points)+1} of {num_points}. Press 'r' to reset.", (20, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                        
        cv2.imshow(window_name, img_display)
        key = cv2.waitKey(1) & 0xFF
        if key == 13 and len(points) == num_points: # ENTER key
            break
        elif key == ord('r') or key == ord('R'):
            if len(points) > 0:
                points.pop()
                print("Last point removed.")
            
    cv2.destroyWindow(window_name)
    return np.array(points, dtype=np.float32)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    img_dir = os.path.join(script_dir, "sfm_images")
    
    # Ensure directory exists
    if not os.path.exists(img_dir):
        os.makedirs(img_dir)
        print(f"Created folder '{img_dir}'.")
        print("ACTION REQUIRED: Please place exactly 4 images of your object in this folder and run again.")
        return
        
    extensions = ('*.jpg', '*.jpeg', '*.png', '*.bmp')
    image_files = []
    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(img_dir, ext)))
        
    if len(image_files) < 4:
        print(f"Found {len(image_files)} image(s).")
        print(f"ACTION REQUIRED: Please place at least 4 images in the '{img_dir}' folder.")
        return
        
    # Dynamically use however many images are in the folder!
    num_frames = len(image_files)
    print(f"Loaded {num_frames} images for Structure from Motion.")
    num_points = 4
    points_all_frames = []
    
    # 1. Gather Points
    for idx, img_file in enumerate(image_files):
        img = cv2.imread(img_file)
        if img is None:
            print(f"Could not read {img_file}")
            return
            
        pts = get_points(img, f"View {idx+1}: {os.path.basename(img_file)}", num_points)
        points_all_frames.append(pts)
        
    # 2. Construct Measurement Matrix W (2F x P)
    W = np.zeros((2 * num_frames, num_points))
    for i in range(num_frames):
        W[2*i, :] = points_all_frames[i][:, 0]
        W[2*i+1, :] = points_all_frames[i][:, 1]
        
    # 3. Center the data (Tomasi-Kanade Factorization requires the centroid at the origin)
    mean_W = np.mean(W, axis=1, keepdims=True)
    W_centered = W - mean_W
    
    # 4. Singular Value Decomposition (SVD)
    U, S_diag, Vt = np.linalg.svd(W_centered, full_matrices=False)
    
    # 5. Enforce Rank 3 (for 3D structure)
    U3 = U[:, :3]
    S3 = np.diag(S_diag[:3])
    Vt3 = Vt[:3, :]
    
    # 6. Reconstruct Structure Matrix S (3 x P)
    S = np.sqrt(S3) @ Vt3
    
    # Extract Coordinates
    X = S[0, :]
    Y = S[1, :]
    Z = S[2, :]
    
    print("\n--- Reconstructed 3D Structure (X, Y, Z) ---")
    for p in range(num_points):
        print(f"Point {p+1}: ({X[p]:.2f}, {Y[p]:.2f}, {Z[p]:.2f})")
        
    # 7. Plotting the 3D boundary
    fig = plt.figure(figsize=(8, 6))
    ax = fig.add_subplot(111, projection='3d')
    
    # Close the boundary loop by appending the first point at the end
    X_plot = np.append(X, X[0])
    Y_plot = np.append(Y, Y[0])
    Z_plot = np.append(Z, Z[0])
    
    ax.plot(X_plot, Y_plot, Z_plot, marker='o', color='red', linewidth=3, markersize=10)
    
    # Plot formatting
    ax.set_title('Reconstructed 3D Boundary of the Planar Object\n(Tomasi-Kanade SfM)')
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Depth (Z)')
    
    # Ensure axes are equally scaled so the shape doesn't look artificially stretched
    max_range = np.array([X.max()-X.min(), Y.max()-Y.min(), Z.max()-Z.min()]).max() / 2.0
    mid_x = (X.max()+X.min()) * 0.5
    mid_y = (Y.max()+Y.min()) * 0.5
    mid_z = (Z.max()+Z.min()) * 0.5
    
    ax.set_xlim(mid_x - max_range, mid_x + max_range)
    ax.set_ylim(mid_y - max_range, mid_y + max_range)
    ax.set_zlim(mid_z - max_range, mid_z + max_range)
    
    print("\nDisplaying 3D reconstruction. You can click and drag the plot to rotate the 3D object.")
    plt.show()

if __name__ == "__main__":
    main()

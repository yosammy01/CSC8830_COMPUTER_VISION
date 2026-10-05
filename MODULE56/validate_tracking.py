"""
README:
This script validates the theoretical Lucas-Kanade optical flow equation against OpenCV's actual tracking implementation.
It automatically searches the video for two consecutive frames that contain actual motion.
Then, it provides an interactive UI for you to click and select the exact pixel you wish to track (avoiding watermarks).
It calculates the theoretical motion vector manually using spatial/temporal derivatives, and compares it to OpenCV's output.
The results are printed to the console and saved as a side-by-side visual comparison image in the 'output' folder.
"""
import cv2
import numpy as np
import os
import glob

def calculate_theoretical_lk(img1, img2, point, window_size=31):
    """
    Manually calculates the Lucas-Kanade theoretical optical flow (u, v)
    using the mathematical derivatives for validation.
    """
    x, y = int(point[0]), int(point[1])
    w = window_size // 2
    
    # Check boundaries to avoid errors
    if y-w < 0 or y+w+1 > img1.shape[0] or x-w < 0 or x+w+1 > img1.shape[1]:
        return 0.0, 0.0
        
    # Extract the window around the pixel in both frames
    win1 = img1[y-w:y+w+1, x-w:x+w+1].astype(np.float32)
    win2 = img2[y-w:y+w+1, x-w:x+w+1].astype(np.float32)
    
    # Calculate Spatial derivatives (Ix, Iy) using pure mathematical gradients
    # (cv2.Sobel applies a scaling factor of 8 which throws off the pure math vector length)
    Iy, Ix = np.gradient(win1)
    
    # Calculate Temporal derivative (It)
    It = win2 - win1
    
    # Build Lucas-Kanade matrices for the equation A^T A v = A^T b
    Ix = Ix.flatten()
    Iy = Iy.flatten()
    It = It.flatten()
    
    A = np.vstack((Ix, Iy)).T
    b = -It
    
    # Solve for the motion vectors (u, v) using least squares
    ATA = np.dot(A.T, A)
    ATb = np.dot(A.T, b)
    
    try:
        flow = np.linalg.solve(ATA, ATb)
        u, v = flow[0], flow[1]
    except np.linalg.LinAlgError:
        u, v = 0.0, 0.0
        
    return float(u), float(v)

def process_validation(video_path, output_dir):
    print(f"\n--- Validating tracking for: {os.path.basename(video_path)} ---")
    cap = cv2.VideoCapture(video_path)
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 1:
        print("Video is too short.")
        cap.release()
        return

    window_scrub = f"Scrub to select starting frame: {os.path.basename(video_path)}"
    cv2.namedWindow(window_scrub, cv2.WINDOW_NORMAL)
    
    global chosen_frame_idx
    chosen_frame_idx = 0
    
    def on_trackbar(val):
        global chosen_frame_idx
        chosen_frame_idx = val
        cap.set(cv2.CAP_PROP_POS_FRAMES, val)
        ret, frame = cap.read()
        if ret:
            cv2.putText(frame, f"Frame {val}. Scrub to find motion, then press ENTER.", (20, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.imshow(window_scrub, frame)

    cv2.createTrackbar("Frame", window_scrub, 0, total_frames - 2, on_trackbar)
    
    # Initialize first view
    on_trackbar(0)
    
    print("\nA window has opened. Use the trackbar at the bottom to find a good starting frame.")
    print("Find a frame right before the object moves, then press ENTER.")
    
    while True:
        key = cv2.waitKey(1) & 0xFF
        if key == 13: # ENTER
            break
            
    cv2.destroyWindow(window_scrub)
    
    # Now read frame1 and frame2 perfectly consecutively
    cap.set(cv2.CAP_PROP_POS_FRAMES, chosen_frame_idx)
    ret1, frame1 = cap.read()
    ret2, frame2 = cap.read()
    
    if not ret1 or not ret2:
        print("Error reading the chosen consecutive frames.")
        cap.release()
        return
        
    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    
    cap.release()
    
    # Interactive point selection to avoid watermarks and select exact features
    global selected_point, point_selected
    selected_point = None
    point_selected = False
    
    def mouse_callback(event, x, y, flags, param):
        global selected_point, point_selected
        if event == cv2.EVENT_LBUTTONDOWN:
            selected_point = (x, y)
            point_selected = True

    window_name = f"Click to select point: {os.path.basename(video_path)} (Press ENTER when done)"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(window_name, mouse_callback)
    
    print(f"\nA window has opened for '{os.path.basename(video_path)}'.")
    print("Please CLICK on the exact point you want to track (e.g., the clock hand or a cloud).")
    print("Then press the ENTER key to confirm and run the validation.")
    
    while True:
        temp_frame = frame1.copy()
        if point_selected:
            cv2.circle(temp_frame, selected_point, 5, (0, 0, 255), -1)
            cv2.putText(temp_frame, "Point Selected! Press ENTER to confirm.", (20, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        else:
            cv2.putText(temp_frame, "Click on the video to select a point, then press ENTER.", (20, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            
        cv2.imshow(window_name, temp_frame)
        key = cv2.waitKey(1) & 0xFF
        if key == 13 and point_selected: # 13 is the Enter key
            break
            
    cv2.destroyAllWindows()
    
    if not point_selected:
        print("No point was selected. Skipping.")
        return

    x_orig, y_orig = selected_point
    point_orig = (x_orig, y_orig)
    
    # Format p0 perfectly for OpenCV's calcOpticalFlowPyrLK
    p0 = np.array([[[np.float32(x_orig), np.float32(y_orig)]]])
    
    print(f"Selected Feature (Pixel) in Frame 1: ({x_orig:.2f}, {y_orig:.2f})")
    
    # 1. OpenCV's Actual Tracked Location (Implementation Result)
    lk_params = dict(winSize=(15, 15), maxLevel=2, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03))
    p1, st, err = cv2.calcOpticalFlowPyrLK(gray1, gray2, p0, None, **lk_params)
    
    x_cv, y_cv = p1[0][0]
    print(f"OpenCV Actual Tracked Location:      ({x_cv:.2f}, {y_cv:.2f})")
    print(f"Actual Pixel Displacement:          u = {(x_cv - x_orig):.4f}, v = {(y_cv - y_orig):.4f}")
    
    # 2. Theoretical Lucas-Kanade Calculation (Math Validation)
    u_th, v_th = calculate_theoretical_lk(gray1, gray2, point_orig, window_size=31)
    print(f"Theoretical Math Displacement:      u = {u_th:.4f}, v = {v_th:.4f}")
    print(f"Theoretical Validated Location:     ({(x_orig + u_th):.2f}, {(y_orig + v_th):.2f})")
    
    # Calculate the error delta
    err_u = abs((x_cv - x_orig) - u_th)
    err_v = abs((y_cv - y_orig) - v_th)
    print(f"Validation Delta Error:             u_diff = {err_u:.4f}, v_diff = {err_v:.4f}")
    
    # Visualization: Side-by-Side
    vis1 = frame1.copy()
    vis2 = frame2.copy()
    
    # Frame 1: Draw original point in Red
    cv2.circle(vis1, (int(x_orig), int(y_orig)), 5, (0, 0, 255), -1)
    cv2.putText(vis1, "Frame 1: Original Pixel Location (Red)", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    
    # Frame 2: Draw OpenCV's new point in Green (Hollow)
    cv2.circle(vis2, (int(x_cv), int(y_cv)), 8, (0, 255, 0), 2)
    
    # Frame 2: Draw Theoretical new point in Blue
    cv2.circle(vis2, (int(x_orig + u_th), int(y_orig + v_th)), 3, (255, 0, 0), -1)
    
    # Frame 2: Draw lines showing the vectors
    cv2.line(vis2, (int(x_orig), int(y_orig)), (int(x_cv), int(y_cv)), (0, 255, 0), 1)
    cv2.line(vis2, (int(x_orig), int(y_orig)), (int(x_orig + u_th), int(y_orig + v_th)), (255, 0, 0), 1)
    
    # Add a visual legend to Frame 2
    cv2.putText(vis2, "Frame 2: Tracked Locations", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(vis2, "Green: Actual Tracked (OpenCV)", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(vis2, "Blue: Theoretical Validation", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
    
    # Concatenate horizontally
    combined_vis = np.hstack((vis1, vis2))
    
    # Save the validation image
    name = os.path.splitext(os.path.basename(video_path))[0]
    out_path = os.path.join(output_dir, f"{name}_tracking_validation.png")
    cv2.imwrite(out_path, combined_vis)
    print(f"Saved side-by-side validation image to: {out_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    videos_dir = os.path.join(script_dir, "videos")
    output_dir = os.path.join(script_dir, "output")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    extensions = ('*.mp4', '*.avi', '*.mov', '*.mkv')
    video_files = []
    for ext in extensions:
        video_files.extend(glob.glob(os.path.join(videos_dir, ext)))
        
    if len(video_files) == 0:
        print("No videos found to validate in the 'videos' folder.")
    else:
        for v in video_files:
            process_validation(v, output_dir)
        print("\nAll theoretical validations complete!")


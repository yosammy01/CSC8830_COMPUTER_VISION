"""
README:
This script computes dense optical flow using the Lucas-Kanade algorithm and visualizes it as a Vector Field.
It reads video files from the 'videos' folder, processes up to 30 seconds of motion for each,
and saves the resulting vector field visualizations as new .mp4 files in the 'output' folder.
"""
import cv2
import numpy as np
import os
import glob

def get_grid_points(width, height, step=16):
    """Generates an evenly spaced grid of points across the image."""
    y, x = np.mgrid[step/2:height:step, step/2:width:step]
    points = np.vstack([x.ravel(), y.ravel()]).T
    return np.float32(points).reshape(-1, 1, 2)

def process_lucas_kanade_vector_field(video_path, output_path, max_duration_sec=30):
    """
    Computes optical flow using Lucas-Kanade on an evenly spaced grid
    to produce a Vector Field visualization.
    """
    print(f"Processing Lucas-Kanade Vector Field for: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error opening video file: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        fps = 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    max_frames = int(max_duration_sec * fps)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Parameters for Lucas-Kanade optical flow
    lk_params = dict(winSize=(15, 15), maxLevel=2,
                     criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03))

    ret, old_frame = cap.read()
    if not ret:
        print("Failed to read the first frame.")
        cap.release()
        return

    old_gray = cv2.cvtColor(old_frame, cv2.COLOR_BGR2GRAY)
    
    # Generate the static grid of points once
    grid_points = get_grid_points(width, height, step=16)
    
    frame_count = 1
    print(f"Saving visualization to: {output_path}")
    print(f"Processing up to {max_frames} frames ({max_duration_sec} seconds)...")

    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # We calculate the instantaneous flow from the current grid positions
        p1, st, err = cv2.calcOpticalFlowPyrLK(old_gray, frame_gray, grid_points, None, **lk_params)

        vis = frame.copy()

        # Select good points and draw the vector field
        if p1 is not None:
            good_new = p1[st==1]
            good_old = grid_points[st==1]

            for new, old in zip(good_new, good_old):
                a, b = new.ravel()
                c, d = old.ravel()
                a, b, c, d = int(a), int(b), int(c), int(d)
                
                # Only draw if there's actual movement (filter out tiny noise)
                distance = np.sqrt((a - c)**2 + (b - d)**2)
                if distance > 0.5:
                    # Draw a line representing the motion vector (White: BGR)
                    vis = cv2.line(vis, (c, d), (a, b), (255, 255, 255), 1)
                    # Draw a tiny dot at the starting grid point (White)
                    vis = cv2.circle(vis, (c, d), 1, (255, 255, 255), -1)

        out.write(vis)
        
        # Update previous frame
        old_gray = frame_gray.copy()
        
        # Note: We do NOT update the grid points to the new tracked points, 
        # because we want to maintain an evenly spaced static grid (Vector Field) 
        # calculating the instantaneous velocity at those exact pixels every frame.

        frame_count += 1
        
        if frame_count % (int(fps) * 5) == 0:
            print(f"  ...processed {frame_count} frames")

    cap.release()
    out.release()
    print(f"Finished processing {os.path.basename(video_path)}.\n")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    videos_dir = os.path.join(script_dir, "videos")
    output_dir = os.path.join(script_dir, "output")
    
    if not os.path.exists(videos_dir):
        os.makedirs(videos_dir)
        print(f"Created folder '{videos_dir}'. Please place your 2 raw videos into this folder.")
        exit()
        
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    extensions = ('*.mp4', '*.avi', '*.mov', '*.mkv')
    video_files = []
    for ext in extensions:
        video_files.extend(glob.glob(os.path.join(videos_dir, ext)))
        
    if len(video_files) == 0:
        print(f"No videos found in '{videos_dir}'. Please add at least 2 videos.")
        exit()
        
    print(f"Found {len(video_files)} video(s). Beginning processing...")
    
    for video_file in video_files:
        base_name = os.path.basename(video_file)
        name, ext = os.path.splitext(base_name)
        output_file = os.path.join(output_dir, f"{name}_lk_vector_field.mp4")
        process_lucas_kanade_vector_field(video_file, output_file, max_duration_sec=30)
        
    print("All processing complete! Check the 'output' folder for your videos.")
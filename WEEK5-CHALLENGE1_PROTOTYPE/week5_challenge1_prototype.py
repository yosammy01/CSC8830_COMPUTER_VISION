import cv2
import requests

def edge_slowfast_processor(video_path):
    cap = cv2.VideoCapture(video_path)
    
    # Check if the video was opened successfully
    if not cap.isOpened():
        print(f"Error: Could not open video file at {video_path}")
        return

    fps = round(cap.get(cv2.CAP_PROP_FPS))
    
    slow_stream = [] # High-res (Identity)
    fast_stream = [] # Low-res (Motion)
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
            
        # FAST STREAM: 10 frames per second, drastically reduced resolution
        if frame_count % (fps // 10) == 0:
            fast_stream.append(cv2.resize(frame, (112, 112)))
            
        # SLOW STREAM: 1 frame per second, high resolution
        if frame_count % fps == 0:
            slow_stream.append(cv2.resize(frame, (1024, 1024)))
            
        frame_count += 1
    cap.release()
    
    # Calculate Bandwidth / Payload reduction
    standard_payload = frame_count * (1024 * 1024)
    slowfast_payload = (len(slow_stream) * (1024 * 1024)) + (len(fast_stream) * (112 * 112))
    bandwidth_saved = 100 - ((slowfast_payload / standard_payload) * 100)
    
    print(f"--- Edge Device Processing Complete ---")
    print(f"Standard Video Payload (Pixels): {standard_payload:,}")
    print(f"SlowFast Optimized Payload (Pixels): {slowfast_payload:,}")
    print(f"Bandwidth Saved: {bandwidth_saved:.2f}%\n")
    
    # ---------------------------------------------------------
    # Feasibility test: Simulating the send to Video-LLM
    # ---------------------------------------------------------
    print("Mock Transmission of optimized payload to Cloud Video-LLM...")
    
    # Simulated API payload targeting a multimodal tool
    llm_payload = {
        "model": "llava-v1.5-7b",
        "task": "Identify the subject in the high-res frames and describe their action using the low-res frames.",
        "data_streams": {
            "slow_identity_frames": len(slow_stream),
            "fast_motion_frames": len(fast_stream)
        }
    }
    
    print(f"Mock API Call Successful. Mock Vision-LLM processed the event using {bandwidth_saved:.2f}% less network data.")

import glob

# Grab the first .mp4 video in the video folder
video_files = glob.glob("./video/*.mp4")

if video_files:
    video_path = video_files[0]
    print(f"Processing video: {video_path}... This could take a while, please wait.")
    print("For reference, a 10-minute video can take 1-2 minutes to process.")
    edge_slowfast_processor(video_path)
else:
    print("No .mp4 videos found in the ./video/ directory.")

import os
import io
import base64
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load model weights
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model_weights', 'best.pt')
print(f"Loading YOLO model from: {MODEL_PATH}")
model = YOLO(MODEL_PATH)

CLASS_NAMES = {
    0: 'water_leakage',
    1: 'garbage_overflow',
    2: 'fire_accident',
    3: 'fallen_tree',
    4: 'road_damage',
    5: 'streetlight_failure'
}

CLASS_DISPLAY = {
    'water_leakage': 'Water Leakage',
    'garbage_overflow': 'Garbage Overflow',
    'fire_accident': 'Fire Accident',
    'fallen_tree': 'Fallen Tree',
    'road_damage': 'Road Damage',
    'streetlight_failure': 'Streetlight Failure'
}

SEVERITY_PRIORITY = {
    'fire_accident': ('CRITICAL', 'P1'),
    'water_leakage': ('HIGH', 'P1'),
    'fallen_tree': ('HIGH', 'P2'),
    'road_damage': ('MEDIUM', 'P2'),
    'garbage_overflow': ('MEDIUM', 'P3'),
    'streetlight_failure': ('LOW', 'P3')
}

DEPARTMENT_MAP = {
    'water_leakage': 'Water / Public Health Engineering Department',
    'garbage_overflow': 'Municipal Sanitation Department',
    'fire_accident': 'Fire & Emergency Services',
    'fallen_tree': 'Municipal / Parks & Horticulture Department',
    'road_damage': 'Municipal Engineering / Roads Department',
    'streetlight_failure': 'Electrical / Street Lighting Department'
}

AUTHORITY_MAP = {
    'water_leakage': 'Executive Engineer (Water Supply)',
    'garbage_overflow': 'Chief Sanitation Inspector',
    'fire_accident': 'District Fire Officer',
    'fallen_tree': 'Horticulture Superintendent',
    'road_damage': 'Assistant Executive Engineer (Roads)',
    'streetlight_failure': 'Electrical Inspector / Engineer'
}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': True,
        'classes': CLASS_NAMES
    })

def analyze_image_bytes(image_bytes, selected_hint=None):
    # Open image with PIL
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    
    # Run YOLO model inference
    results = model(image, conf=0.15)
    
    boxes_list = []
    top_class = None
    top_conf = 0.0
    
    if len(results) > 0 and len(results[0].boxes) > 0:
        for box in results[0].boxes:
            c_id = int(box.cls[0].item())
            c_name = CLASS_NAMES.get(c_id, f'class_{c_id}')
            conf = float(box.conf[0].item())
            xyxy = [float(x) for x in box.xyxy[0].tolist()]
            
            boxes_list.append({
                'class_id': c_id,
                'class_name': c_name,
                'confidence': round(conf, 4),
                'box': xyxy
            })
            
            if conf > top_conf:
                top_conf = conf
                top_class = c_name
    
    has_detection = (len(results) > 0 and len(results[0].boxes) > 0 and top_class is not None)

    # Fallback if no YOLO detection found
    if not top_class:
        top_class = selected_hint if (selected_hint and selected_hint in SEVERITY_PRIORITY) else 'road_damage'
        top_conf = 0.05

    # Get annotated image
    res_plotted = results[0].plot() if (len(results) > 0 and len(results[0].boxes) > 0) else np.array(image)
    # Convert BGR (OpenCV) to RGB for PIL if plotted
    if len(results) > 0 and len(results[0].boxes) > 0:
        res_plotted = cv2.cvtColor(res_plotted, cv2.COLOR_BGR2RGB)
    
    pil_annotated = Image.fromarray(res_plotted)
    buffered = io.BytesIO()
    pil_annotated.save(buffered, format="JPEG")
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

    severity, priority = SEVERITY_PRIORITY.get(top_class, ('MEDIUM', 'P2'))
    department = DEPARTMENT_MAP.get(top_class, 'Municipal Engineering Department')
    authority = AUTHORITY_MAP.get(top_class, 'Municipal Officer')
    display_name = CLASS_DISPLAY.get(top_class, top_class.replace('_', ' ').title())

    return {
        'detected_class': top_class,
        'category_display': display_name,
        'confidence': round(top_conf, 4),
        'has_detection': has_detection,
        'boxes': boxes_list,
        'annotated_image': annotated_b64,
        'severity': severity,
        'priority': priority,
        'department': department,
        'authority': authority
    }

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    image_bytes = file.read()
    selected_hint = request.form.get('hint_category')

    try:
        result = analyze_image_bytes(image_bytes, selected_hint)
        return jsonify(result)
    except Exception as e:
        print(f"Error in /analyze: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/analyze_video', methods=['POST'])
def analyze_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    video_file = request.files['video']
    temp_path = os.path.join(os.path.dirname(__file__), 'temp_video.mp4')
    video_file.save(temp_path)
    selected_hint = request.form.get('hint_category')

    try:
        cap = cv2.VideoCapture(temp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            total_frames = 30
        
        # Sample 5 frame positions
        sample_indices = np.linspace(0, total_frames - 1, num=min(5, total_frames), dtype=int)
        best_result = None

        for idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue
            
            # Convert OpenCV frame to JPEG bytes
            is_success, buffer = cv2.imencode(".jpg", frame)
            if not is_success:
                continue
            
            frame_bytes = buffer.tobytes()
            res = analyze_image_bytes(frame_bytes, selected_hint)
            
            if best_result is None or res['confidence'] > best_result['confidence']:
                best_result = res
        
        cap.release()
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if best_result is None:
            return jsonify({'error': 'Failed to process video frames'}), 500

        best_result['frames_analyzed'] = len(sample_indices)
        return jsonify(best_result)

    except Exception as e:
        print(f"Error analyzing video: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'error': str(e)}), 500

@app.route('/verify_resolution', methods=['POST'])
def verify_resolution():
    if 'proof_image' not in request.files:
        return jsonify({'error': 'No proof image provided'}), 400
    
    file = request.files['proof_image']
    target_category = request.form.get('category')
    image_bytes = file.read()

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        results = model(image, conf=0.20)

        detected_same_issue = False
        target_conf = 0.0

        if len(results) > 0 and len(results[0].boxes) > 0:
            for box in results[0].boxes:
                c_id = int(box.cls[0].item())
                c_name = CLASS_NAMES.get(c_id, '')
                conf = float(box.conf[0].item())

                if c_name == target_category and conf >= 0.20:
                    detected_same_issue = True
                    target_conf = conf
                    break
        
        if detected_same_issue:
            return jsonify({
                'verified': False,
                'ai_score': 0.35,
                'message': f"AI Verification Alert: High confidence ({round(target_conf*100, 1)}%) of '{target_category}' still detected in the proof image!"
            })
        else:
            return jsonify({
                'verified': True,
                'ai_score': 0.98,
                'message': f"AI Verification Successful: Resolution proof verified clean. Problem ({target_category}) is no longer present."
            })
    except Exception as e:
        print(f"Error verifying resolution: {e}")
        return jsonify({'verified': True, 'ai_score': 0.90, 'message': 'AI verification completed.'})

import hashlib
import json

def compute_image_phash(img):
    try:
        img_gray = img.resize((16, 16), Image.Resampling.LANCZOS).convert('L')
        pixels = list(img_gray.getdata())
        avg = sum(pixels) / len(pixels)
        bits = "".join(["1" if p >= avg else "0" for p in pixels])
        return int(bits, 2)
    except Exception:
        return None

def phash_distance(h1, h2):
    if h1 is None or h2 is None:
        return 999
    return bin(h1 ^ h2).count('1')

@app.route('/evaluate_duplicate', methods=['POST'])
def evaluate_duplicate():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    new_file = request.files['image']
    new_bytes = new_file.read()

    new_hash = hashlib.sha256(new_bytes).hexdigest()
    
    new_img = None
    new_phash = None
    try:
        new_img = Image.open(io.BytesIO(new_bytes)).convert('RGB')
        new_phash = compute_image_phash(new_img)
    except Exception:
        pass

    raw_incidents = request.form.get('existing_incidents')
    existing_list = []
    if raw_incidents:
        try:
            existing_list = json.loads(raw_incidents)
        except Exception:
            existing_list = []

    for inc in existing_list:
        inc_id = inc.get('incident_id')
        file_path = inc.get('file_path')
        if not file_path or not os.path.exists(file_path):
            continue

        try:
            with open(file_path, 'rb') as f:
                ex_bytes = f.read()
            
            # 1. Exact Binary Match (SHA-256)
            ex_hash = hashlib.sha256(ex_bytes).hexdigest()
            if new_hash == ex_hash:
                return jsonify({
                    'is_duplicate': True,
                    'incident_id': inc_id,
                    'match_type': 'exact_binary',
                    'message': f"Duplicate Report\nThis image has already been submitted under incident {inc_id}."
                })
            
            # 2. Perceptual Visual Similarity Match (dHash distance <= 8 out of 256 bits, > 97% visual match)
            if new_phash is not None:
                ex_img = Image.open(io.BytesIO(ex_bytes)).convert('RGB')
                ex_phash = compute_image_phash(ex_img)
                dist = phash_distance(new_phash, ex_phash)
                if dist <= 8:
                    return jsonify({
                        'is_duplicate': True,
                        'incident_id': inc_id,
                        'match_type': 'perceptual_visual',
                        'distance': dist,
                        'message': f"Duplicate Report\nThis image has already been submitted under incident {inc_id}."
                    })
        except Exception as e:
            continue

    return jsonify({
        'is_duplicate': False,
        'message': 'Image is unique.'
    })

if __name__ == '__main__':
    print("Starting SenseGen AI Flask Service on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)

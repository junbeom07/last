from flask import Flask, render_template, Response, jsonify, request, send_file
from camera import VideoCamera
from datetime import datetime
import os
import shutil
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = 'static/uploads'
TEMP_FOLDER = 'static/temp'
ALLOWED_EXTENSIONS = {'png'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TEMP_FOLDER'] = TEMP_FOLDER

# 업로드 폴더와 임시 폴더가 없으면 생성
for folder in [UPLOAD_FOLDER, TEMP_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

video_camera = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def gen(camera):
    while True:
        frame = camera.get_frame()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')

@app.route('/')
def index():
    stickers = get_uploaded_stickers()
    return render_template('index.html', stickers=stickers)

@app.route('/video_feed')
def video_feed():
    global video_camera
    if not video_camera:
        video_camera = VideoCamera()
    return Response(gen(video_camera),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/adjust_sticker', methods=['POST'])
def adjust_sticker():
    global video_camera
    if not video_camera:
        return jsonify({"status": "error", "message": "Camera not initialized"}), 400

    data = request.json
    action = data.get('action')

    if action == 'width_increase':
        video_camera.scaling_factor_width += 0.1
    elif action == 'width_decrease':
        video_camera.scaling_factor_width = max(0.1, video_camera.scaling_factor_width - 0.1)
    elif action == 'height_increase':
        video_camera.scaling_factor_height += 0.1
    elif action == 'height_decrease':
        video_camera.scaling_factor_height = max(0.1, video_camera.scaling_factor_height - 0.1)
    elif action == 'move_left':
        video_camera.sticker_offset_x -= 5
    elif action == 'move_right':
        video_camera.sticker_offset_x += 5
    elif action == 'move_up':
        video_camera.sticker_offset_y -= 5
    elif action == 'move_down':
        video_camera.sticker_offset_y += 5
    elif action == 'reset':
        video_camera.reset_sticker()
    else:
        return jsonify({"status": "error", "message": "Invalid action"}), 400

    return jsonify({"status": "success"}), 200

@app.route('/capture_frame', methods=['POST'])
def capture_frame():
    global video_camera
    if not video_camera:
        return jsonify({"status": "error", "message": "Camera not initialized"}), 400

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'captured_frame_{timestamp}.jpg'
    filepath = os.path.join('static', 'captures', filename)

    # 디렉토리가 없으면 생성
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    frame = video_camera.get_frame()
    with open(filepath, 'wb') as f:
        f.write(frame)

    return jsonify({"status": "success", "filename": filename}), 200

@app.route('/download_capture/<filename>')
def download_capture(filename):
    filepath = os.path.join('static', 'captures', filename)
    return send_file(filepath, as_attachment=True)

@app.route('/upload_sticker', methods=['POST'])
def upload_sticker():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(upload_path)
        return jsonify({"status": "success", "message": "Sticker uploaded successfully", "filename": filename}), 200
    return jsonify({"status": "error", "message": "Only PNG files are allowed"}), 400

@app.route('/set_sticker', methods=['POST'])
def set_sticker():
    global video_camera
    filename = request.json.get('filename')
    if not filename:
        return jsonify({"status": "error", "message": "No filename provided"}), 400
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"status": "error", "message": "File not found"}), 404
    if video_camera:
        video_camera.set_sticker(filepath)
    return jsonify({"status": "success", "message": "Sticker set successfully"}), 200

@app.route('/get_stickers')
def get_stickers():
    stickers = get_uploaded_stickers()
    return jsonify(stickers)

def get_uploaded_stickers():
    stickers = []
    if os.path.exists(UPLOAD_FOLDER):
        for filename in os.listdir(UPLOAD_FOLDER):
            if allowed_file(filename):
                stickers.append(filename)   
    return stickers

@app.route('/delete_sticker', methods=['POST'])
def delete_sticker():
    filename = request.json.get('filename')
    if not filename:
        return jsonify({"status": "error", "message": "파일 이름이 제공되지 않았습니다"}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"status": "error", "message": "파일을 찾을 수 없습니다"}), 404
    
    try:
        os.remove(filepath)
        return jsonify({"status": "success", "message": "스티커가 성공적으로 삭제되었습니다"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"스티커 삭제 중 오류 발생: {str(e)}"}), 500

@app.route('/get_captured_frames')
def get_captured_frames():
    try:
        captures_dir = os.path.join('static', 'captures')
        if not os.path.exists(captures_dir):
            os.makedirs(captures_dir)
        
        files = [f for f in os.listdir(captures_dir) if f.endswith('.jpg')]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(captures_dir, x)), reverse=True)
        
        return jsonify({"files": files}), 200
    except Exception as e:
        app.logger.error(f"get_captured_frames 함수에서 오류 발생: {str(e)}")
        return jsonify({"error": "서버 내부 오류", "details": str(e)}), 500

@app.route('/delete_image', methods=['POST'])
def delete_image():
    filename = request.json.get('filename')
    if not filename:
        return jsonify({"status": "error", "message": "파일 이름이 제공되지 않았습니다"}), 400
    
    filepath = os.path.join('static', 'captures', filename)
    if not os.path.exists(filepath):
        return jsonify({"status": "error", "message": "파일을 찾을 수 없습니다"}), 404
    
    try:
        os.remove(filepath)
        return jsonify({"status": "success", "message": "이미지가 성공적으로 삭제되었습니다"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"이미지 삭제 중 오류 발생: {str(e)}"}), 500

@app.route('/delete_frames', methods=['POST'])
def delete_frames():
    filenames = request.json.get('filenames')
    if not filenames:
        return jsonify({"status": "error", "message": "파일 이름이 제공되지 않았습니다"}), 400
    
    deleted_files = []
    errors = []
    
    for filename in filenames:
        filepath = os.path.join('static', 'captures', filename)
        if not os.path.exists(filepath):
            errors.append(f"{filename}: 파일을 찾을 수 없습니다")
            continue
        
        try:
            os.remove(filepath)
            deleted_files.append(filename)
        except Exception as e:
            errors.append(f"{filename}: 삭제 중 오류 발생 - {str(e)}")
    
    if deleted_files:
        message = f"{len(deleted_files)}개의 이미지가 성공적으로 삭제되었습니다."
        if errors:
            message += f" 그러나 {len(errors)}개의 파일에서 오류가 발생했습니다."
        return jsonify({"status": "success", "message": message, "deleted": deleted_files, "errors": errors}), 200
    elif errors:
        return jsonify({"status": "error", "message": "모든 파일 삭제 중 오류가 발생했습니다", "errors": errors}), 500
    else:
        return jsonify({"status": "error", "message": "삭제할 파일을 찾을 수 없습니다"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
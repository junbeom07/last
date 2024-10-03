# Dockerfile
FROM orgoro/dlib-opencv-python:latest
# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY requirements.txt .

# 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 포트 설정
EXPOSE 8080

# 애플리케이션 실행
CMD ["python", "app.py"]

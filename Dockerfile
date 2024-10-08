# 빌드 스테이지
FROM python:3.11-slim-buster AS builder

WORKDIR /app

# 시스템 의존성 설치 및 캐시 정리
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libpng-dev \ 
    && rm -rf /var/lib/apt/lists/*

# dlib을 위한 패키지 설치
RUN apt-get update && apt-get install -y build-essential cmake
# opencv를 위한 패키지 설치
RUN apt-get update && apt-get install -y libopencv-dev

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install dlib==19.24.6  \
  && pip install opencv-python==4.10.0.84

# pip 업그레이드
RUN pip install --upgrade pip

# 실행 스테이지
FROM python:3.11-slim-buster

WORKDIR /app

# 빌드 스테이지에서 설치된 라이브러리 복사
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 필요한 시스템 라이브러리만 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    libopenblas-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    libpng-dev \
    cmake \
    libboost-all-dev \
    libjpeg-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    v4l-utils \ 
    && rm -rf /var/lib/apt/lists/*

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev

# 애플리케이션 파일 복사
COPY app.py .
COPY camera.py .
COPY static ./static
COPY templates ./templates

RUN mkdir -p static/temp && chmod 777 static/temp
RUN mkdir -p static/captures && chmod 777 static/captures

EXPOSE 8080

# 비루트 사용자 생성 및 전환
RUN useradd -m appuser
RUN usermod -aG video appuser
USER appuser

# 환경 변수 설정
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

CMD ["flask", "run", "--host=0.0.0.0", "--port=8080"]

# 모델 파일 복사
COPY static/models/shape_predictor_68_face_landmarks.dat static/models/
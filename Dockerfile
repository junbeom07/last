# 빌드 스테이지
FROM python:3.11-slim-buster AS builder

WORKDIR /app

# 시스템 의존성 설치 및 캐시 정리
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \  # OpenBLAS 추가
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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

EXPOSE 8080

# 비루트 사용자 생성 및 전환
RUN useradd -m appuser
USER appuser

CMD ["python", "app.py"]
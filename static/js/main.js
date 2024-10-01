let currentPage = 1;
const itemsPerPage = 9;
let totalImages = 0;

function adjustSticker(action) {
    fetch('/adjust_sticker', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: action }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log('스티커 조절 성공:', action);
        } else {
            console.error('스티커 조절 실패:', data.message);
        }
    })
    .catch((error) => console.error('Error:', error));
}

function captureFrame() {
    fetch('/capture_frame', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            updateCapturedFramesList();
            alert('캡처되었습니다');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('프레임 캡처 중 오류가 발생했습니다.');
        });
}

function updateCapturedFramesList() {
    fetch('/get_captured_frames')
    .then(response => response.json())
    .then(data => {
        totalImages = data.files.length;
        renderGallery(data.files);
        updatePagination();
        updateButtonVisibility();
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function renderGallery(files) {
    const galleryContainer = document.getElementById('captureResult');
    galleryContainer.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageFiles = files.slice(startIndex, endIndex);

    pageFiles.forEach((filename) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'gallery-item';
        
        const img = document.createElement('img');
        img.src = `/static/captures/${filename}`;
        img.alt = filename;
        img.className = 'gallery-image';
        img.onclick = () => showModal(filename);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `frame_${filename}`;
        checkbox.value = filename;
        checkbox.className = 'frame-checkbox';
        checkbox.onclick = (e) => e.stopPropagation();
        
        imageItem.appendChild(img);
        imageItem.appendChild(checkbox);
        galleryContainer.appendChild(imageItem);
    });

    updateDownloadButton();
}

function updatePagination() {
    const totalPages = Math.ceil(totalImages / itemsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    pageInfo.textContent = `${currentPage} / ${totalPages}`;

    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function changePage(delta) {
    currentPage += delta;
    updateCapturedFramesList();
}

function showModal(filename) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalDeleteBtn = document.getElementById('modalDeleteBtn');
    
    modal.style.display = "block";
    modalImg.src = `/static/captures/${filename}`;
    
    modalDeleteBtn.onclick = () => deleteImage(filename);
    
    const span = document.getElementsByClassName("close")[0];
    span.onclick = () => {
        modal.style.display = "none";
    };
    
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = "none";
}

function updateDownloadButton() {
    const downloadBtn = document.getElementById('downloadBtn');
    const selectedFrames = document.querySelectorAll('.frame-checkbox:checked');
    downloadBtn.style.display = selectedFrames.length > 0 ? 'block' : 'none';
}

function downloadSelectedFrames() {
    const selectedFrames = document.querySelectorAll('.frame-checkbox:checked');
    selectedFrames.forEach(checkbox => {
        const filename = checkbox.value;
        const link = document.createElement('a');
        link.href = `/download_capture/${filename}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// 페이지 로드 시 캡처된 프레임 목록 업데이트
document.addEventListener('DOMContentLoaded', () => {
    updateCapturedFramesList();
    document.getElementById('captureResult').addEventListener('change', updateDownloadButton);
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
});

let selectedFile = null;

document.getElementById('stickerFile').addEventListener('change', function(e) {
    selectedFile = e.target.files[0];
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.png')) {
        alert('PNG 파일만 업로드 가능합니다.');
        this.value = ''; // 파일 선택 초기화
        selectedFile = null;
        document.getElementById('uploadResult').innerHTML = '<p>PNG 파일을 선택해주세요.</p>';
    } else if (selectedFile) {
        document.getElementById('uploadResult').innerHTML = `<p>선택된 파일: ${selectedFile.name}</p>`;
    }
    var fileName = e.target.files[0] ? e.target.files[0].name : '선택된 파일 없음';
    document.querySelector('.file-name').textContent = fileName;
});

document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var formData = new FormData(this);

    fetch('/upload_sticker', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateStickerList();
            document.getElementById('stickerFile').value = ''; // 파일 입력 초기화
            document.querySelector('.file-name').textContent = "선택된 파일 없음";
            document.getElementById('uploadStickerModal').style.display = "none"; // 모달 닫기
        } else {
            console.error('업로드 실패:', data.message);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        document.getElementById('uploadResult').innerHTML = '<p>업로드 중 오류가 발생했습니다.</p>';
    });
});

function updateStickerList() {
    fetch('/get_stickers')
    .then(response => response.json())
    .then(stickers => {
        const stickerListDiv = document.getElementById('stickerList');
        stickerListDiv.innerHTML = '';  // 기존 목록을 비웁니다
        stickers.forEach(sticker => {
            const stickerItem = document.createElement('div');
            stickerItem.className = 'sticker-item';
            
            const img = document.createElement('img');
            img.src = `/static/uploads/${sticker}`;
            img.alt = sticker;
            img.className = 'sticker-thumbnail';
            img.onclick = () => setSticker(sticker);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '삭제';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => deleteSticker(sticker);
            
            stickerItem.appendChild(img);
            stickerItem.appendChild(deleteBtn);
            stickerListDiv.appendChild(stickerItem);
        });
    })
    .catch(error => console.error('Error:', error));
}

function deleteSticker(filename) {
    if (confirm(`정말로 "${filename}" 스티커를 삭제하시겠습니까?`)) {
        fetch('/delete_sticker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: filename }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('스티커가 성공적으로 삭제되었습니다.');
                updateStickerList();  // 스티커 목록 즉시 업데이트
            } else {
                alert('스티커 삭제 중 오류가 발생했습니다: ' + data.message);
            }
        })
        .catch((error) => console.error('Error:', error));
    }
}

function setSticker(filename) {
    fetch('/set_sticker', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: filename }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('스티커가 성공적으로 변경되었습니다.');
        } else {
            alert('스티커 변경 중 오류가 발생했습니다: ' + data.message);
        }
    })
    .catch((error) => console.error('Error:', error));
}

// 페이지 로드 시 스티커 목록 업데이트
updateStickerList();

function deleteImage(filename) {
    if (confirm(`정말로 "${filename}" 이미지를 삭제하시겠습니까?`)) {
        fetch('/delete_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: filename }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateCapturedFramesList();
                document.getElementById('imageModal').style.display = "none";
            } else {
                console.error('이미지 삭제 중 오류가 발생했습니다:', data.message);
            }
        })
        .catch((error) => console.error('Error:', error));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById("stickerControlModal");
    var btn = document.getElementById("stickerControlBtn");
    var span = modal.querySelector(".close");

    btn.onclick = function() {
        modal.style.display = "block";
    }

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});

function adjustSticker(action) {
    fetch('/adjust_sticker', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: action }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log('스티커 조절 성공:', action);
        } else {
            console.error('스티커 조절 실패:', data.message);
        }
    })
    .catch((error) => console.error('Error:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    var uploadModal = document.getElementById("uploadStickerModal");
    var uploadBtn = document.getElementById("uploadStickerBtn");
    var span = uploadModal.getElementsByClassName("close")[0];
    var uploadForm = document.getElementById("uploadStickerForm");
    var fileInput = document.getElementById("stickerFileInput");
    var fileNameSpan = document.getElementById("stickerFileName");

    uploadBtn.onclick = function() {
        uploadModal.style.display = "block";
    }

    span.onclick = function() {
        uploadModal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == uploadModal) {
            uploadModal.style.display = "none";
        }
    }

    fileInput.addEventListener('change', function(e) {
        var fileName = e.target.files[0] ? e.target.files[0].name : "선택된 파일 없음";
        fileNameSpan.textContent = fileName;
    });

    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var formData = new FormData(uploadForm);

        fetch('/upload_sticker', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateStickerList();
                fileInput.value = ''; // 파일 입력 초기화
                fileNameSpan.textContent = "선택된 파일 없음";
                uploadModal.style.display = "none"; // 모달 닫기
            } else {
                console.error('업로드 실패:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    // 페이지 로드 시 스티커 목록 업데이트
    updateStickerList();
});

function updateStickerList() {
    fetch('/get_stickers')
    .then(response => response.json())
    .then(stickers => {
        const stickerListDiv = document.getElementById('stickerList');
        if (stickerListDiv) {
            stickerListDiv.innerHTML = '';  // 기존 목록을 비웁니다
            stickers.forEach(sticker => {
                const stickerItem = document.createElement('div');
                stickerItem.className = 'sticker-item';
                
                const img = document.createElement('img');
                img.src = `/static/uploads/${sticker}`;
                img.alt = sticker;
                img.className = 'sticker-thumbnail';
                img.onclick = () => setSticker(sticker);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '삭제';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteSticker(sticker);
                
                stickerItem.appendChild(img);
                stickerItem.appendChild(deleteBtn);
                stickerListDiv.appendChild(stickerItem);
            });
        }
    })
    .catch(error => console.error('Error:', error));
}

// 페이지 로드 시 스티커 목록 업데이트
document.addEventListener('DOMContentLoaded', updateStickerList);

function fillGallery(images) {
    const galleryContainer = document.querySelector('.gallery-container');
    galleryContainer.innerHTML = ''; // 기존 내용 초기화

    // 9개의 아이템 공간 생성
    for (let i = 0; i < 9; i++) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        if (images[i]) {
            const img = document.createElement('img');
            img.src = images[i].src;
            img.alt = images[i].alt || '';
            img.className = 'gallery-image';
            item.appendChild(img);
        }
        galleryContainer.appendChild(item);
    }
}

// 사용 예:
// fillGallery(imageArray); // imageArray는 이미지 객체의 배열

function updateButtonVisibility() {
    const checkboxes = document.querySelectorAll('.frame-checkbox:checked');
    const downloadBtn = document.getElementById('downloadBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (checkboxes.length > 0) {
        downloadBtn.style.display = 'inline-flex';
        deleteBtn.style.display = 'inline-flex';
    } else {
        downloadBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    }
}

function deleteSelectedFrames() {
    const checkboxes = document.querySelectorAll('.frame-checkbox:checked');
    const selectedFrames = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedFrames.length === 0) {
        alert('삭제할 프레임을 선택해주세요.');
        return;
    }
    
    if (confirm(`선택한 ${selectedFrames.length}개의 프레임을 삭제하시겠습니까?`)) {
        fetch('/delete_frames', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filenames: selectedFrames }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert(data.message);
                updateCapturedFramesList();
            } else {
                console.error('프레임 삭제 중 오류가 발생했습니다:', data.message);
                if (data.errors) {
                    console.error('상세 오류:', data.errors.join('\n'));
                }
                alert('프레임 삭제 중 오류가 발생했습니다. 자세한 내용은 콘솔을 확인해주세요.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('프레임 삭제 중 오류가 발생했습니다.');
        });
    }
}

// 이벤트 리스너 추가 (이미 있다면 수정하지 않아도 됩니다)
document.addEventListener('change', function(e) {
    if (e.target && e.target.className.includes('frame-checkbox')) {
        updateButtonVisibility();
    }
});
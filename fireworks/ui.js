export function createUI() {
  return {
    startOverlay: document.getElementById("start-overlay"),
    startBtn: document.getElementById("start-btn"),
    startNoCameraBtn: document.getElementById("start-no-camera-btn"),
    controls: document.getElementById("controls"),
    title: document.getElementById("title"),
    debug: document.getElementById("debug"),
    toast: document.getElementById("toast"),
    webcamWrapper: document.getElementById("webcam-wrapper"),
    webcam: document.getElementById("webcam"),
    fileInput: document.getElementById("file-input"),
    folderInput: document.getElementById("folder-input"),
    managePhotosBtn: document.getElementById("manage-photos-btn"),
    photoModal: document.getElementById("photo-modal"),
    closePhotoModalBtn: document.getElementById("close-photo-modal-btn"),
    photoGrid: document.getElementById("photo-grid"),
    photoCount: document.getElementById("photo-count"),
  };
}

export function showToast(toastEl, message, durationMs = 1800) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  if (toastEl._toastTimer) window.clearTimeout(toastEl._toastTimer);
  toastEl._toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), durationMs);
}


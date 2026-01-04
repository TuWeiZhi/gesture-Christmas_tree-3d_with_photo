import * as THREE from "three";
import { CONFIG } from "./config.js";
import { randomChoice, srgbToLinear } from "./utils.js";

export function resolvePreviewUrl(photoData) {
  const image = photoData?.texture?.image;
  if (!image) return photoData?.url || "";
  if (image instanceof HTMLImageElement) return image.src;
  if (image instanceof HTMLCanvasElement) return image.toDataURL();
  if ("src" in image && typeof image.src === "string") return image.src;
  return photoData?.url || "";
}

function drawTextureToCanvas(texture, maxSide = 128) {
  const image = texture?.image;
  if (!image) throw new Error("Texture has no image");

  const srcWidth = image.width || image.videoWidth || 0;
  const srcHeight = image.height || image.videoHeight || 0;
  if (!srcWidth || !srcHeight) throw new Error("Invalid image size");

  const scale = Math.min(1, maxSide / Math.max(srcWidth, srcHeight));
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

export function extractPaletteFromTexture(texture, sampleCount = CONFIG.photo.paletteSamples) {
  const { ctx, width, height } = drawTextureToCanvas(texture, 140);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const samples = [];

  for (let i = 0; i < sampleCount; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const idx = (y * width + x) * 4;
    const a = data[idx + 3] / 255;
    if (a < 0.35) continue;

    const r = data[idx] / 255;
    const g = data[idx + 1] / 255;
    const b = data[idx + 2] / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma < 0.08) continue;

    samples.push(new THREE.Vector3(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)));
  }

  if (samples.length < 8) return null;

  const palette = [];
  const stride = Math.max(1, Math.floor(samples.length / 16));
  for (let i = 0; i < samples.length; i += stride) palette.push(samples[i]);
  return palette.slice(0, 18);
}

export function buildMosaicFromTexture(
  texture,
  { targetSize = CONFIG.photo.mosaicTargetSize, maxPoints = CONFIG.photo.mosaicMaxPoints } = {}
) {
  const { ctx, width, height } = drawTextureToCanvas(texture, targetSize);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const luma = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3] / 255;
      if (a < 0.2) {
        luma[y * width + x] = 0;
        continue;
      }
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      luma[y * width + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  const points = [];
  const aspect = width / height;
  const edgeThreshold = 0.16;
  const fillChance = 0.06;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx1 = y * width + x;
      const c = luma[idx1];
      if (c < 0.06) continue;

      const dx =
        Math.max(
          Math.abs(c - luma[idx1 - 1]),
          Math.abs(c - luma[idx1 + 1]),
          Math.abs(c - luma[idx1 - width]),
          Math.abs(c - luma[idx1 + width])
        ) || 0;

      const isEdge = dx > edgeThreshold;
      const isFill = Math.random() < fillChance && c > 0.12;
      if (!isEdge && !isFill) continue;

      const idx4 = idx1 * 4;
      const r = data[idx4] / 255;
      const g = data[idx4 + 1] / 255;
      const b = data[idx4 + 2] / 255;
      const a = data[idx4 + 3] / 255;
      if (a < 0.35) continue;

      const nx = (x / (width - 1) - 0.5) * aspect;
      const ny = -(y / (height - 1) - 0.5);

      points.push({
        x: nx + (Math.random() - 0.5) * 0.01,
        y: ny + (Math.random() - 0.5) * 0.01,
        color: new THREE.Vector3(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)),
      });
    }
  }

  if (points.length > maxPoints) {
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = points[i];
      points[i] = points[j];
      points[j] = tmp;
    }
    points.length = maxPoints;
  }

  return { aspect, points };
}

export class PhotoLibrary {
  constructor({ onUpdate } = {}) {
    this.photos = [];
    this.photoIdCounter = 0;
    this.onUpdate = typeof onUpdate === "function" ? onUpdate : () => {};
  }

  getVisiblePhotos() {
    return this.photos.filter((p) => p.isVisible);
  }

  getById(id) {
    return this.photos.find((p) => p.id === id) || null;
  }

  getSelectedOrRandom(selectedId) {
    const visible = this.getVisiblePhotos();
    if (!visible.length) return null;
    if (selectedId != null) {
      const found = visible.find((p) => p.id === selectedId);
      if (found) return found;
    }
    return randomChoice(visible);
  }

  addPhoto(texture, sourceUrl) {
    const photoData = {
      id: this.photoIdCounter++,
      url: sourceUrl || texture?.image?.src || "data:image",
      texture,
      palette: null,
      mosaic: null,
      isVisible: true,
      status: "NEW",
    };

    this.photos.push(photoData);
    this.queueProcess(photoData);
    this.onUpdate();
    return photoData;
  }

  removePhoto(id) {
    const photoData = this.getById(id);
    if (!photoData || !photoData.isVisible) return;
    photoData.isVisible = false;
    this.onUpdate();
  }

  queueProcess(photoData) {
    photoData.status = "PROCESSING";
    this.onUpdate();

    const task = () => {
      try {
        photoData.palette = extractPaletteFromTexture(photoData.texture, CONFIG.photo.paletteSamples);
      } catch (error) {
        photoData.palette = null;
      }

      try {
        photoData.mosaic = buildMosaicFromTexture(photoData.texture, {
          targetSize: CONFIG.photo.mosaicTargetSize,
          maxPoints: CONFIG.photo.mosaicMaxPoints,
        });
      } catch (error) {
        photoData.mosaic = null;
      }

      photoData.status = "READY";
      this.onUpdate();
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(task, { timeout: 1500 });
    } else {
      window.setTimeout(task, 0);
    }
  }

  renderModal({ gridEl, countEl, selectedPhotoId, onSelect, onRemove }) {
    const visible = this.getVisiblePhotos();
    if (countEl) countEl.textContent = `照片（可用：${visible.length} / 总计：${this.photos.length}）`;
    if (!gridEl) return;

    gridEl.innerHTML = "";
    if (!visible.length) {
      const div = document.createElement("div");
      div.style.color = "rgba(255,255,255,0.6)";
      div.style.padding = "24px 10px";
      div.style.textAlign = "center";
      div.textContent = "暂无照片。可从右上角上传，或放入 ./images/ 并生成 images.json。";
      gridEl.appendChild(div);
      return;
    }

    for (const photoData of visible) {
      const item = document.createElement("div");
      item.className = "photo-item";
      if (selectedPhotoId === photoData.id) {
        item.style.borderColor = "rgba(255, 43, 43, 0.65)";
        item.style.boxShadow = "0 0 0 1px rgba(255,43,43,0.35) inset";
      }

      const img = document.createElement("img");
      img.alt = "Photo";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = resolvePreviewUrl(photoData);
      img.onerror = () => {
        img.src =
          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect fill="%23111" width="120" height="120"/><text x="60" y="64" text-anchor="middle" fill="%23d4af37" font-size="12">Photo</text></svg>';
      };

      const badge = document.createElement("div");
      badge.className = "photo-badge";
      badge.textContent = photoData.status;

      const actions = document.createElement("div");
      actions.className = "photo-actions";
      const delBtn = document.createElement("button");
      delBtn.textContent = "从库中移除";
      delBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (typeof onRemove === "function") onRemove(photoData);
      });
      actions.appendChild(delBtn);

      item.addEventListener("click", () => {
        if (typeof onSelect === "function") onSelect(photoData);
      });

      item.appendChild(img);
      item.appendChild(badge);
      item.appendChild(actions);
      gridEl.appendChild(item);
    }
  }
}

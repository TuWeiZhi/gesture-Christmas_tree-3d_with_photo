import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

import { CONFIG, FALLBACK_PALETTES } from "./config.js";
import { clamp, buildPaletteFromHex, lerp, randomChoice } from "./utils.js";
import { createUI, showToast } from "./ui.js";
import { PhotoLibrary } from "./photos.js";
import { MosaicPool } from "./mosaic-pool.js";
import { FireworkSystem } from "./firework-system.js";

const UI = createUI();

const STATE = {
  started: false,
  useCamera: true,
  selectedPhotoId: null,
  lastHandTime: 0,
  autoFire: { active: false, lastFireTime: 0 },
  hand: {
    detected: false,
    x: 0,
    y: 0,
    extensionRatio: 0,
    pinchRatio: 1,
    gesture: "NONE",
  },
};

let scene;
let camera;
let renderer;
let composer;
let clock;
let fireworkSystem;
let mosaicPool;
let photoLibrary;
let handLandmarker;

function initThree() {
  const container = document.getElementById("canvas-container");

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    CONFIG.render.fov,
    window.innerWidth / window.innerHeight,
    0.1,
    400
  );
  camera.position.set(CONFIG.render.cameraPos.x, CONFIG.render.cameraPos.y, CONFIG.render.cameraPos.z);
  camera.lookAt(0, 6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.pixelRatioMax));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  addStarfield(scene);

  mosaicPool = new MosaicPool(scene, { poolSize: 4, maxPoints: 4096 });
  fireworkSystem = new FireworkSystem(scene, renderer, {
    onExplode: ({ shell, center, time }) => {
      if (!shell?.isPhoto) return;
      const mosaic = shell.photoData?.mosaic;
      if (!mosaic?.points?.length) return;

      const palette = shell.photoData?.palette || buildPaletteFromHex(randomChoice(FALLBACK_PALETTES));
      fireworkSystem.spawnExplosion({
        center: center.clone().add(new THREE.Vector3(0, 0.8, 0)),
        palette,
        time: time + 0.05,
        pattern: "RING",
        strength: 0.55,
        isPhoto: true,
      });

      mosaicPool.spawn({ center, mosaic, time: time + 0.08, size: 12.8, life: 1.35 });
    },
  });

  setupPost();
}

function addStarfield(targetScene) {
  const starGeo = new THREE.BufferGeometry();
  const starCount = 900;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3 + 0] = THREE.MathUtils.randFloatSpread(220);
    starPos[i * 3 + 1] = THREE.MathUtils.randFloat(0, 120);
    starPos[i * 3 + 2] = THREE.MathUtils.randFloatSpread(220);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.55,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  targetScene.add(stars);
}

function setupPost() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const afterimage = new AfterimagePass();
  afterimage.uniforms.damp.value = CONFIG.post.afterimageDamp;
  composer.addPass(afterimage);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    CONFIG.post.bloomStrength,
    CONFIG.post.bloomRadius,
    CONFIG.post.bloomThreshold
  );
  composer.addPass(bloom);
}

function renderPhotoModal() {
  photoLibrary.renderModal({
    gridEl: UI.photoGrid,
    countEl: UI.photoCount,
    selectedPhotoId: STATE.selectedPhotoId,
    onSelect: (photoData) => {
      STATE.selectedPhotoId = photoData.id;
      renderPhotoModal();
      showToast(UI.toast, "已选中：下一次捏合会优先点燃这张照片");
    },
    onRemove: (photoData) => {
      if (confirm("从照片库中移除这张照片？（不会删除你的本地文件）")) {
        photoLibrary.removePhoto(photoData.id);
        showToast(UI.toast, "已移除");
      }
    },
  });
}

function openPhotoManager() {
  UI.photoModal.classList.add("active");
  renderPhotoModal();
}

function closePhotoManager() {
  UI.photoModal.classList.remove("active");
}

async function loadPredefinedImages() {
  if (!CONFIG.photo.autoScanLocal) return;
  const loader = new THREE.TextureLoader();

  try {
    const response = await fetch("./images.json", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.images)) {
        for (const filename of data.images) {
          const path = `./${data.baseDir || "images"}/${filename}`;
          loader.load(
            path,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              photoLibrary.addPhoto(texture, path);
            },
            undefined,
            () => {}
          );
        }
        showToast(UI.toast, `已从 images.json 加载：${data.images.length} 张`);
        return;
      }
    }
  } catch (error) {}

  for (let i = 1; i <= CONFIG.photo.scanCount; i++) {
    const candidates = [
      `./images/${i}.jpg`,
      `./images/${i}.png`,
      `./images/(${i}).jpg`,
      `./images/(${i}).png`,
    ];

    const tryLoad = (index) => {
      if (index >= candidates.length) return;
      const path = candidates[index];
      loader.load(
        path,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          photoLibrary.addPhoto(texture, path);
        },
        undefined,
        () => tryLoad(index + 1)
      );
    };

    tryLoad(0);
  }
}

function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || !files.length) return;

  const list = Array.from(files).filter((f) => f.type && f.type.startsWith("image/"));
  if (!list.length) return;

  showToast(UI.toast, `正在导入：${list.length} 张`);
  for (const file of list) {
    const reader = new FileReader();
    reader.onload = (e) => {
      new THREE.TextureLoader().load(e.target.result, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        photoLibrary.addPhoto(texture, e.target.result);
      });
    };
    reader.readAsDataURL(file);
  }
}

function screenToWorldX(clientX) {
  const t = (clientX / window.innerWidth) * 2 - 1;
  return t * 16;
}

function ignitePhotoFromGesture() {
  const photo = photoLibrary.getSelectedOrRandom(STATE.selectedPhotoId);
  if (!photo) {
    showToast(UI.toast, "还没有照片：先上传或放入 ./images/");
    return;
  }

  const time = clock.getElapsedTime();
  const x = clamp(STATE.hand.x, -1, 1) * 14;
  const z = lerp(-12, 6, Math.random());

  fireworkSystem.launchShell({
    originX: x,
    originZ: z,
    time,
    palette: photo.palette || buildPaletteFromHex(randomChoice(FALLBACK_PALETTES)),
    pattern: randomChoice(["PEONY", "SATURN", "CHRYSANTHEMUM", "HEART"]),
    isPhoto: true,
    photoData: photo,
  });

  showToast(UI.toast, "点燃照片烟花");
}

function setupEvents() {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  UI.fileInput.addEventListener("change", handleImageUpload);
  UI.folderInput.addEventListener("change", handleImageUpload);

  UI.managePhotosBtn.addEventListener("click", openPhotoManager);
  UI.closePhotoModalBtn.addEventListener("click", closePhotoManager);
  UI.photoModal.addEventListener("click", (e) => {
    if (e.target === UI.photoModal) closePhotoManager();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePhotoManager();
    if (e.key.toLowerCase() === "h") {
      UI.title.classList.toggle("ui-hidden");
      UI.controls.classList.toggle("ui-hidden");
      UI.webcamWrapper.classList.toggle("ui-hidden");
    }
  });

  window.addEventListener("pointerdown", (e) => {
    if (UI.photoModal.classList.contains("active")) return;
    const time = clock.getElapsedTime();
    const x = screenToWorldX(e.clientX);
    const z = lerp(-12, 6, Math.random());
    const palette = buildPaletteFromHex(randomChoice(FALLBACK_PALETTES));
    fireworkSystem.launchShell({ originX: x, originZ: z, time, palette });
  });
}

async function initMediaPipe() {
  const constraints = {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
      facingMode: "user",
    },
    audio: false,
  };

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });

  if (!navigator.mediaDevices?.getUserMedia) {
    UI.debug.textContent = "当前环境不支持摄像头。";
    UI.webcamWrapper.style.display = "none";
    STATE.useCamera = false;
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    UI.webcam.srcObject = stream;
    await UI.webcam.play();
    UI.debug.textContent = "摄像头已开启：张开手掌连发；捏合点燃照片。";
    requestAnimationFrame(predictWebcam);
  } catch (error) {
    UI.debug.textContent = `摄像头不可用：${error.message}`;
    UI.webcamWrapper.style.display = "none";
    STATE.useCamera = false;
  }
}

let lastVideoTime = -1;
function predictWebcam() {
  if (!STATE.started || !STATE.useCamera || !handLandmarker) return;
  if (UI.webcam.readyState >= 2 && UI.webcam.currentTime !== lastVideoTime) {
    lastVideoTime = UI.webcam.currentTime;
    const result = handLandmarker.detectForVideo(UI.webcam, performance.now());
    processGestures(result);
  }
  requestAnimationFrame(predictWebcam);
}

function processGestures(result) {
  const now = clock.getElapsedTime();
  if (result.landmarks && result.landmarks.length > 0) {
    STATE.hand.detected = true;
    STATE.lastHandTime = now;

    const lm = result.landmarks[0];
    STATE.hand.x = (lm[9].x - 0.5) * 2;
    STATE.hand.y = (lm[9].y - 0.5) * 2;

    const wrist = lm[0];
    const middleMCP = lm[9];
    const handSize = Math.hypot(middleMCP.x - wrist.x, middleMCP.y - wrist.y);
    if (handSize < 0.02) return;

    const tips = [lm[8], lm[12], lm[16], lm[20]];
    let avgTipDist = 0;
    for (const tip of tips) avgTipDist += Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    avgTipDist /= tips.length;

    const thumb = lm[4];
    const index = lm[8];
    const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);

    const extensionRatio = avgTipDist / handSize;
    const pinchRatio = pinchDist / handSize;
    STATE.hand.extensionRatio = extensionRatio;
    STATE.hand.pinchRatio = pinchRatio;

    let gesture = "OPEN";
    if (extensionRatio < CONFIG.gesture.extensionFistThreshold) gesture = "FIST";
    else if (pinchRatio < CONFIG.gesture.pinchThreshold) gesture = "PINCH";
    else if (extensionRatio > CONFIG.gesture.extensionOpenThreshold) gesture = "OPEN";
    else gesture = "NEUTRAL";

    const prev = STATE.hand.gesture;
    STATE.hand.gesture = gesture;

    if (gesture === "OPEN") STATE.autoFire.active = true;
    if (gesture === "FIST") STATE.autoFire.active = false;
    if (gesture === "PINCH" && prev !== "PINCH") ignitePhotoFromGesture();

    UI.debug.textContent = `Gesture: ${gesture} | Ext: ${extensionRatio.toFixed(2)} | Pinch: ${pinchRatio.toFixed(
      2
    )} | Auto: ${STATE.autoFire.active ? "ON" : "OFF"}`;
    return;
  }

  STATE.hand.detected = false;
  if (now - STATE.lastHandTime > CONFIG.gesture.lostHandGraceSeconds) STATE.autoFire.active = false;
  UI.debug.textContent = "未检测到手：可点击/触摸屏幕放烟花";
}

function animate() {
  if (!STATE.started) return;
  requestAnimationFrame(animate);

  const dt = clamp(clock.getDelta(), 0, 0.033);
  const time = clock.getElapsedTime();

  if (STATE.autoFire.active) {
    const interval = 1 / CONFIG.fireworks.autoFireRate;
    const jitter = CONFIG.fireworks.autoFireJitter;
    if (time - STATE.autoFire.lastFireTime > interval * lerp(1 - jitter, 1 + jitter, Math.random())) {
      STATE.autoFire.lastFireTime = time;

      const hasPhotos = photoLibrary.getVisiblePhotos().length > 0;
      const usePhoto = hasPhotos && Math.random() < 0.12;
      const photo = usePhoto ? photoLibrary.getSelectedOrRandom(STATE.selectedPhotoId) : null;

      const x = STATE.hand.detected ? clamp(STATE.hand.x, -1, 1) * 14 : lerp(-14, 14, Math.random());
      const z = lerp(-12, 6, Math.random());
      const palette = photo?.palette || buildPaletteFromHex(randomChoice(FALLBACK_PALETTES));

      fireworkSystem.launchShell({
        originX: x,
        originZ: z,
        time,
        palette,
        isPhoto: !!photo,
        photoData: photo,
      });
    }
  }

  fireworkSystem.update({ dt, time });
  mosaicPool.update({ time, camera, renderer });
  composer.render();
}

async function start({ useCamera }) {
  if (STATE.started) return;
  STATE.started = true;
  STATE.useCamera = useCamera;
  UI.startOverlay.style.display = "none";

  photoLibrary = new PhotoLibrary({
    onUpdate: () => {
      if (UI.photoModal.classList.contains("active")) renderPhotoModal();
      else if (UI.photoCount) UI.photoCount.textContent = `照片（可用：${photoLibrary.getVisiblePhotos().length} / 总计：${
          photoLibrary.photos.length
        }）`;
    },
  });

  initThree();
  setupEvents();

  await loadPredefinedImages();
  renderPhotoModal();

  if (useCamera) {
    await initMediaPipe();
  } else {
    UI.webcamWrapper.style.display = "none";
    UI.debug.textContent = "未启用摄像头：点击/触摸屏幕放烟花；右上角可上传照片点燃。";
  }

  for (let i = 0; i < 6; i++) {
    const timeNow = clock.getElapsedTime();
    const x = lerp(-14, 14, Math.random());
    const z = lerp(-10, 4, Math.random());
    const palette = buildPaletteFromHex(randomChoice(FALLBACK_PALETTES));
    fireworkSystem.launchShell({ originX: x, originZ: z, time: timeNow, palette });
  }

  animate();
}

UI.startBtn.addEventListener("click", () => start({ useCamera: true }));
UI.startNoCameraBtn.addEventListener("click", () => start({ useCamera: false }));


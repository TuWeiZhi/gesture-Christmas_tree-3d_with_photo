export const CONFIG = {
  render: {
    pixelRatioMax: 2,
    fov: 55,
    cameraPos: { x: 0, y: 7, z: 40 },
  },
  fireworks: {
    maxParticles: 32000,
    gravity: { x: 0, y: -11.5, z: 0 },
    autoFireRate: 7.5,
    autoFireJitter: 0.35,
    baseShellSpeed: 26,
    shellSpeedJitter: 9,
    groundY: -12,
    maxShells: 32,
  },
  photo: {
    autoScanLocal: true,
    scanCount: 200,
    paletteSamples: 220,
    mosaicTargetSize: 84,
    mosaicMaxPoints: 3600,
  },
  gesture: {
    extensionOpenThreshold: 1.7,
    extensionFistThreshold: 1.5,
    pinchThreshold: 0.35,
    lostHandGraceSeconds: 0.45,
  },
  post: {
    bloomStrength: 0.85,
    bloomRadius: 0.3,
    bloomThreshold: 0.08,
    afterimageDamp: 0.9,
  },
};

export const FALLBACK_PALETTES = [
  ["#ff2b2b", "#ffd000", "#ff6d00", "#ffffff"],
  ["#00d5ff", "#4c7dff", "#a855ff", "#ffffff"],
  ["#ff2bd6", "#ff8a00", "#ffe86b", "#ffffff"],
  ["#00ff9a", "#00d5ff", "#ffd000", "#ffffff"],
  ["#ff3b3b", "#ffb300", "#ffe86b", "#ff7b00", "#ffffff"],
];


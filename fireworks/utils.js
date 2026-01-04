import * as THREE from "three";

export function clamp(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function srgbToLinear(srgb) {
  if (srgb <= 0.04045) return srgb / 12.92;
  return Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function buildPaletteFromHex(hexList) {
  return hexList.map((hex) => {
    const color = new THREE.Color(hex);
    return new THREE.Vector3(color.r, color.g, color.b);
  });
}

export function jitterColor(colorVec3, amount = 0.06) {
  return new THREE.Vector3(
    clamp(colorVec3.x + (Math.random() - 0.5) * amount, 0, 1),
    clamp(colorVec3.y + (Math.random() - 0.5) * amount, 0, 1),
    clamp(colorVec3.z + (Math.random() - 0.5) * amount, 0, 1)
  );
}


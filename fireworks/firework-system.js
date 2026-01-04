import * as THREE from "three";
import { CONFIG, FALLBACK_PALETTES } from "./config.js";
import { buildPaletteFromHex, clamp, lerp, randomChoice } from "./utils.js";

function createShellMesh() {
  const geometry = new THREE.SphereGeometry(0.14, 10, 10);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  const mesh = new THREE.InstancedMesh(geometry, material, CONFIG.fireworks.maxShells);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(CONFIG.fireworks.maxShells * 3),
    3
  );
  return mesh;
}

function createFireworkMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uGravity: { value: new THREE.Vector3(CONFIG.fireworks.gravity.x, CONFIG.fireworks.gravity.y, CONFIG.fireworks.gravity.z) },
      uPointScale: { value: 1 },
    },
    vertexShader: `
      precision highp float;

      uniform float uTime;
      uniform vec3 uGravity;
      uniform float uPointScale;

      attribute vec3 aVelocity;
      attribute vec3 aColor;
      attribute float aStartTime;
      attribute float aLife;
      attribute float aSize;
      attribute float aSeed;
      attribute float aKind;

      varying vec4 vColor;

      void main() {
        float age = uTime - aStartTime;
        float life = max(0.001, aLife);
        float t = clamp(age / life, 0.0, 1.0);
        float alive = step(0.0, age) * step(age, life);

        vec3 p = position + aVelocity * age + 0.5 * uGravity * (age * age);

        float fade = alive * (1.0 - t);
        vec3 jitter = vec3(
          sin(aSeed * 7.1 + age * 9.0),
          cos(aSeed * 5.3 + age * 7.0),
          sin(aSeed * 4.2 + age * 6.0)
        );
        p += jitter * (0.16 + 0.22 * aKind) * fade;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        float alpha = alive;
        alpha *= smoothstep(0.0, 0.07, t);
        alpha *= (1.0 - smoothstep(0.68, 1.0, t));
        alpha *= 0.75 + 0.25 * sin(age * (26.0 + 14.0 * aKind) + aSeed * 10.0);

        float size = aSize * (0.9 + 0.25 * sin(aSeed * 9.0 + age * 10.0));
        gl_PointSize = (size * uPointScale * alive) / max(1.0, -mv.z);
        vColor = vec4(aColor, alpha);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec4 vColor;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r = length(uv);
        float core = smoothstep(0.5, 0.0, r);
        core = pow(core, 1.65);

        float alpha = vColor.a * core;
        if (alpha < 0.01) discard;

        vec3 col = vColor.rgb * (1.35 + 0.85 * core);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function sampleSpeed(pattern) {
  if (pattern === "WILLOW") return lerp(0.7, 1.05, Math.random());
  if (pattern === "RING") return lerp(0.95, 1.25, Math.random());
  if (pattern === "SPIRAL") return lerp(0.85, 1.25, Math.random());
  if (pattern === "HEART") return lerp(0.85, 1.15, Math.random());
  if (pattern === "CHRYSANTHEMUM") return lerp(0.9, 1.25, Math.random());
  if (pattern === "SATURN") return lerp(0.85, 1.25, Math.random());
  return lerp(0.9, 1.25, Math.random());
}

function makePatternParams(pattern) {
  if (pattern === "RING") {
    const axis = randomChoice([
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, 1, 0).normalize(),
    ]);
    const quat = new THREE.Quaternion().setFromAxisAngle(axis, lerp(-0.6, 0.6, Math.random()));
    return { quat };
  }

  if (pattern === "HEART") {
    const axis = randomChoice([
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(1, 1, 0).normalize(),
    ]);
    const quat = new THREE.Quaternion().setFromAxisAngle(axis, lerp(-0.8, 0.8, Math.random()));
    return { quat };
  }

  return {};
}

function sampleDirection(pattern, i, count, out, params) {
  if (pattern === "RING") {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    out.set(Math.cos(angle), (Math.random() - 0.5) * 0.08, Math.sin(angle));
    if (params?.quat) out.applyQuaternion(params.quat);
    return out.normalize();
  }

  if (pattern === "HEART") {
    const t = (i / count) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    out.set(x / 18, y / 18, (Math.random() - 0.5) * (8 / 18));
    if (params?.quat) out.applyQuaternion(params.quat);
    return out.normalize();
  }

  if (pattern === "SPIRAL") {
    const angle = (i / count) * Math.PI * 12;
    const radius = lerp(0.2, 1.0, Math.random());
    out.set(Math.cos(angle) * radius, lerp(-0.2, 1.0, Math.random()), Math.sin(angle) * radius);
    return out.normalize();
  }

  if (pattern === "WILLOW") {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    out.set(
      Math.sin(phi) * Math.cos(theta),
      Math.abs(Math.cos(phi)) * 0.62 + 0.2,
      Math.sin(phi) * Math.sin(theta)
    );
    return out.normalize();
  }

  if (pattern === "CHRYSANTHEMUM" || pattern === "SATURN") {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    out.set(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi) * 0.95,
      Math.sin(phi) * Math.sin(theta)
    );
    return out.normalize();
  }

  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  out.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
  return out.normalize();
}

export class FireworkSystem {
  constructor(scene, renderer, { onExplode } = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.onExplode = typeof onExplode === "function" ? onExplode : () => {};

    this.cursor = 0;
    this.dirty = false;
    this.max = CONFIG.fireworks.maxParticles;

    this.geometry = new THREE.BufferGeometry();
    this.origin = new Float32Array(this.max * 3);
    this.velocity = new Float32Array(this.max * 3);
    this.color = new Float32Array(this.max * 3);
    this.startTime = new Float32Array(this.max);
    this.life = new Float32Array(this.max);
    this.size = new Float32Array(this.max);
    this.seed = new Float32Array(this.max);
    this.kind = new Float32Array(this.max);

    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.origin, 3));
    this.geometry.setAttribute("aVelocity", new THREE.BufferAttribute(this.velocity, 3));
    this.geometry.setAttribute("aColor", new THREE.BufferAttribute(this.color, 3));
    this.geometry.setAttribute("aStartTime", new THREE.BufferAttribute(this.startTime, 1));
    this.geometry.setAttribute("aLife", new THREE.BufferAttribute(this.life, 1));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    this.geometry.setAttribute("aSeed", new THREE.BufferAttribute(this.seed, 1));
    this.geometry.setAttribute("aKind", new THREE.BufferAttribute(this.kind, 1));

    for (const name of Object.keys(this.geometry.attributes)) {
      this.geometry.attributes[name].setUsage(THREE.DynamicDrawUsage);
    }

    this.material = createFireworkMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.shellMesh = createShellMesh();
    this.scene.add(this.shellMesh);

    this.shells = [];
    this.pendingExplosions = [];

    this.patterns = ["PEONY", "CHRYSANTHEMUM", "RING", "HEART", "SPIRAL", "WILLOW", "SATURN"];
  }

  launchShell({ originX = 0, originZ = 0, time, palette, pattern, isPhoto = false, photoData = null } = {}) {
    if (this.shells.length >= CONFIG.fireworks.maxShells - 6) return;

    const speed = CONFIG.fireworks.baseShellSpeed + Math.random() * CONFIG.fireworks.shellSpeedJitter;
    const vx = originX * 0.18 + (Math.random() - 0.5) * 0.9;
    const vz = originZ * 0.12 + (Math.random() - 0.5) * 0.7;

    this.shells.push({
      id: Math.random().toString(16).slice(2),
      pos: new THREE.Vector3(originX, CONFIG.fireworks.groundY, originZ),
      vel: new THREE.Vector3(vx, speed, vz),
      explodeAt: time + lerp(1.0, 1.6, Math.random()),
      pattern: pattern || randomChoice(this.patterns),
      palette,
      isPhoto,
      photoData,
      hasSecond: Math.random() < 0.35 && !isPhoto,
      secondDelay: lerp(0.18, 0.42, Math.random()),
    });
  }

  spawnExplosion({ center, palette, time, pattern, strength = 1.0, isPhoto = false } = {}) {
    const finalPattern = pattern || randomChoice(this.patterns);
    const baseCount = isPhoto ? 1700 : 1100;
    const count = Math.floor(baseCount * lerp(0.75, 1.25, Math.random()) * strength);
    const startIndex = this._alloc(count);

    const paletteVecs = palette?.length ? palette : buildPaletteFromHex(randomChoice(FALLBACK_PALETTES));
    const lifeMin = isPhoto ? 1.35 : 1.1;
    const lifeMax = isPhoto ? 2.05 : 1.65;
    const params = makePatternParams(finalPattern);
    const dir = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const idx = (startIndex + i) % this.max;
      sampleDirection(finalPattern, i, count, dir, params);
      const speed = sampleSpeed(finalPattern) * lerp(8.5, 13.5, Math.random()) * strength;

      const vx = dir.x * speed + (Math.random() - 0.5) * 1.8;
      const vy = dir.y * speed + (Math.random() - 0.5) * 1.4;
      const vz = dir.z * speed + (Math.random() - 0.5) * 1.8;

      const baseColor = randomChoice(paletteVecs);
      const amount = 0.08;
      const cr = clamp(baseColor.x + (Math.random() - 0.5) * amount, 0, 1);
      const cg = clamp(baseColor.y + (Math.random() - 0.5) * amount, 0, 1);
      const cb = clamp(baseColor.z + (Math.random() - 0.5) * amount, 0, 1);

      this._writeParticle(idx, {
        ox: center.x + (Math.random() - 0.5) * 0.6,
        oy: center.y + (Math.random() - 0.5) * 0.6,
        oz: center.z + (Math.random() - 0.5) * 0.6,
        vx,
        vy,
        vz,
        cr,
        cg,
        cb,
        startTime: time,
        life: lerp(lifeMin, lifeMax, Math.random()),
        size: lerp(6.5, 12.5, Math.random()) * (isPhoto ? 1.06 : 1.0),
        seed: Math.random() * 1000,
        kind: Math.random(),
      });
    }

    if (finalPattern === "SATURN") {
      this.spawnExplosion({
        center,
        palette: paletteVecs,
        time: time + 0.02,
        pattern: "RING",
        strength: 0.58 * strength,
        isPhoto,
      });
    }
  }

  update({ dt, time }) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uPointScale.value = this.renderer.getPixelRatio() * 160;

    for (let i = this.pendingExplosions.length - 1; i >= 0; i--) {
      const ev = this.pendingExplosions[i];
      if (time < ev.time) continue;
      this.spawnExplosion(ev);
      this.pendingExplosions.splice(i, 1);
    }

    const gravityY = CONFIG.fireworks.gravity.y;
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const shell = this.shells[i];
      shell.vel.y += gravityY * dt * 0.38;
      shell.pos.addScaledVector(shell.vel, dt);

      if (time < shell.explodeAt && shell.pos.y > CONFIG.fireworks.groundY) continue;

      const explodeCenter = shell.pos.clone();
      explodeCenter.y = Math.max(CONFIG.fireworks.groundY + 4, explodeCenter.y);

      this.spawnExplosion({
        center: explodeCenter,
        palette: shell.palette,
        time,
        pattern: shell.pattern,
        strength: shell.isPhoto ? 1.2 : 1.0,
        isPhoto: shell.isPhoto,
      });

      if (shell.hasSecond) {
        this.pendingExplosions.push({
          center: explodeCenter.clone().add(new THREE.Vector3(0, 0.6, 0)),
          palette: buildPaletteFromHex(["#ffffff", "#ffe86b", "#ffd000"]),
          time: time + shell.secondDelay,
          pattern: randomChoice(["PEONY", "CHRYSANTHEMUM", "RING"]),
          strength: 0.62,
        });
      }

      this.onExplode({ shell, center: explodeCenter, time });
      this.shells.splice(i, 1);
    }

    this._updateShellMesh();

    if (this.dirty) {
      for (const attr of Object.values(this.geometry.attributes)) attr.needsUpdate = true;
      this.dirty = false;
    }
  }

  _updateShellMesh() {
    const dummy = new THREE.Object3D();
    this.shellMesh.count = this.shells.length;

    for (let i = 0; i < this.shells.length; i++) {
      dummy.position.copy(this.shells[i].pos);
      dummy.updateMatrix();
      this.shellMesh.setMatrixAt(i, dummy.matrix);

      const palette = this.shells[i].palette?.length
        ? this.shells[i].palette
        : buildPaletteFromHex(randomChoice(FALLBACK_PALETTES));
      const c = randomChoice(palette);
      this.shellMesh.setColorAt(i, new THREE.Color(c.x, c.y, c.z));
    }

    this.shellMesh.instanceMatrix.needsUpdate = true;
    if (this.shellMesh.instanceColor) this.shellMesh.instanceColor.needsUpdate = true;
  }

  _alloc(count) {
    const start = this.cursor;
    this.cursor = (this.cursor + count) % this.max;
    this.dirty = true;
    return start;
  }

  _writeParticle(index, { ox, oy, oz, vx, vy, vz, cr, cg, cb, startTime, life, size, seed, kind }) {
    this.origin[index * 3 + 0] = ox;
    this.origin[index * 3 + 1] = oy;
    this.origin[index * 3 + 2] = oz;

    this.velocity[index * 3 + 0] = vx;
    this.velocity[index * 3 + 1] = vy;
    this.velocity[index * 3 + 2] = vz;

    this.color[index * 3 + 0] = cr;
    this.color[index * 3 + 1] = cg;
    this.color[index * 3 + 2] = cb;

    this.startTime[index] = startTime;
    this.life[index] = life;
    this.size[index] = size;
    this.seed[index] = seed;
    this.kind[index] = kind;
  }
}

import * as THREE from "three";

export class MosaicPool {
  constructor(scene, { poolSize = 4, maxPoints = 4096 } = {}) {
    this.scene = scene;
    this.pool = [];
    this.active = [];

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPointScale: { value: 1 },
      },
      vertexShader: `
        precision highp float;

        uniform float uTime;
        uniform float uPointScale;

        attribute vec3 aColor;
        attribute float aSeed;
        attribute float aStartTime;
        attribute float aLife;

        varying vec4 vColor;

        void main() {
          float age = uTime - aStartTime;
          float life = max(0.001, aLife);
          float t = clamp(age / life, 0.0, 1.0);
          float alive = step(0.0, age) * step(age, life);

          float appear = smoothstep(0.0, 0.2, t);
          float dissolve = smoothstep(0.55, 1.0, t);

          vec3 p = position;
          p *= appear;

          vec3 dir = normalize(vec3(p.x, p.y, 0.25));
          vec3 noise = vec3(
            sin(aSeed * 7.1 + t * 9.0),
            cos(aSeed * 5.3 + t * 7.0),
            sin(aSeed * 4.2 + t * 6.0)
          );
          p += dir * (0.95 * dissolve) + noise * (0.12 * dissolve);

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;

          float alpha = alive;
          alpha *= smoothstep(0.0, 0.12, t);
          alpha *= (1.0 - smoothstep(0.78, 1.0, t));
          alpha *= 0.85 + 0.15 * sin((t * 24.0) + aSeed * 12.0);

          gl_PointSize = ((2.4 + 1.4 * sin(aSeed * 9.0 + t * 18.0)) * uPointScale * alive) / max(1.0, -mv.z);
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
          core = pow(core, 1.6);

          float alpha = vColor.a * core;
          if (alpha < 0.01) discard;

          vec3 col = vColor.rgb * (1.15 + 0.65 * core);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    for (let i = 0; i < poolSize; i++) this.pool.push(this._createInstance(maxPoints));
  }

  _createInstance(maxPoints) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxPoints * 3);
    const colors = new Float32Array(maxPoints * 3);
    const seeds = new Float32Array(maxPoints);
    const startTimes = new Float32Array(maxPoints);
    const lifes = new Float32Array(maxPoints);

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aStartTime", new THREE.BufferAttribute(startTimes, 1));
    geometry.setAttribute("aLife", new THREE.BufferAttribute(lifes, 1));
    geometry.setDrawRange(0, 0);

    const points = new THREE.Points(geometry, this.material);
    points.visible = false;
    points.frustumCulled = false;
    this.scene.add(points);

    return { points, geometry, maxPoints, inUse: false, endTime: 0 };
  }

  spawn({ center, mosaic, time, size = 12.5, life = 1.35 }) {
    if (!mosaic?.points?.length) return;

    let instance = this.pool.find((p) => !p.inUse);
    if (!instance) {
      instance = this.pool.reduce((oldest, cur) => (cur.endTime < oldest.endTime ? cur : oldest), this.pool[0]);
    }

    const count = Math.min(instance.maxPoints, mosaic.points.length);
    const posAttr = instance.geometry.getAttribute("position");
    const colAttr = instance.geometry.getAttribute("aColor");
    const seedAttr = instance.geometry.getAttribute("aSeed");
    const startAttr = instance.geometry.getAttribute("aStartTime");
    const lifeAttr = instance.geometry.getAttribute("aLife");

    for (let i = 0; i < count; i++) {
      const p = mosaic.points[i];
      posAttr.array[i * 3 + 0] = p.x * size;
      posAttr.array[i * 3 + 1] = p.y * size;
      posAttr.array[i * 3 + 2] = 0;
      colAttr.array[i * 3 + 0] = p.color.x;
      colAttr.array[i * 3 + 1] = p.color.y;
      colAttr.array[i * 3 + 2] = p.color.z;
      seedAttr.array[i] = Math.random() * 1000;
      startAttr.array[i] = time;
      lifeAttr.array[i] = life;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    seedAttr.needsUpdate = true;
    startAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;

    instance.geometry.setDrawRange(0, count);
    instance.points.position.copy(center);
    instance.points.visible = true;
    instance.inUse = true;
    instance.endTime = time + life + 0.25;
    this.active.push(instance);
  }

  update({ time, camera, renderer }) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uPointScale.value = renderer.getPixelRatio() * 120;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const inst = this.active[i];
      if (time > inst.endTime) {
        inst.inUse = false;
        inst.points.visible = false;
        inst.geometry.setDrawRange(0, 0);
        this.active.splice(i, 1);
        continue;
      }
      inst.points.quaternion.copy(camera.quaternion);
    }
  }
}

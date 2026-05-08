# Tasks: Spring Festival Firework Edition

## Task Overview

| ID | Task | Priority | Estimate | Dependencies |
|----|------|----------|----------|--------------|
| T1 | Create new branch and copy base file | P0 | 5min | - |
| T2 | Update CONFIG color constants | P0 | 10min | T1 |
| T3 | Update CSS styles (red-gold theme) | P0 | 15min | T1 |
| T4 | Update HTML title and text | P0 | 5min | T1 |
| T5 | Modify STATE machine (remove TREE, add FIREWORK) | P0 | 10min | T2 |
| T6 | Implement FireworkSystem class | P1 | 45min | T5 |
| T7 | Implement Rocket class | P1 | 20min | T6 |
| T8 | Implement Explosion class with particle types | P1 | 40min | T7 |
| T9 | Create lantern decoration | P1 | 25min | T2 |
| T10 | Create Fu character decoration | P1 | 25min | T2 |
| T11 | Modify processGestures() for new mapping | P0 | 15min | T5 |
| T12 | Modify animate() loop for fireworks | P1 | 20min | T6, T8 |
| T13 | Remove TREE mode code (cleanup) | P0 | 15min | T5 |
| T14 | Modify Particle class (remove tree positioning) | P1 | 15min | T13 |
| T15 | Integration testing and adjustments | P1 | 30min | All |

---

## Detailed Tasks

### T1: Create new branch and copy base file
**File**: Git operations
**Actions**:
```bash
git checkout -b feature/spring-festival
# Work directly on christmas_tree_pro.html or copy to spring_festival.html
```

---

### T2: Update CONFIG color constants
**File**: `christmas_tree_pro.html` (lines 493-521)
**Changes**:
```javascript
const CONFIG = {
    colors: {
        bg: 0x050d1a,              // Keep
        fog: 0x050d1a,             // Keep
        champagneGold: 0xffd966,   // Keep
        deepGreen: 0x8b0000,       // CHANGE: green → dark red
        accentRed: 0xff4500,       // CHANGE: 0x990000 → bright red
        // NEW: Spring Festival colors
        chineseRed: 0xff2d2d,
        lanternRed: 0xcc0000,
        fuGold: 0xffd700,
    },
    particles: {
        count: 1500,               // Keep
        dustCount: 2000,           // Keep
        snowCount: 1000,           // Keep
        // REMOVE: treeHeight, treeRadius (no longer needed)
    },
    camera: { z: 50 },             // Keep
    // NEW: Firework config
    firework: {
        launchIntervalMin: 300,
        launchIntervalMax: 800,
        maxExplosions: 6,
        launchXRange: 15,
        targetHeightMin: 8,
        targetHeightMax: 18,
        colors: [0xff2d2d, 0xffd700, 0xffffff, 0x00ff7f, 0xda70d6, 0xff8c00],
        types: ['PEONY', 'WILLOW', 'CHRYSANTHEMUM', 'HEART', 'DOUBLE', 'RING']
    },
    preload: { ... }               // Keep unchanged
};
```

---

### T3: Update CSS styles (red-gold theme)
**File**: `christmas_tree_pro.html` (lines 14-420)
**Changes**:

1. Title gradient (line 61-68):
```css
h1 {
    color: #ff6347;  /* CHANGE */
    text-shadow: 0 0 50px rgba(255, 99, 71, 0.6);  /* CHANGE */
    background: linear-gradient(to bottom, #fff, #ff4500);  /* CHANGE */
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
```

2. Button styles (lines 90-110):
```css
.upload-btn {
    border: 1px solid rgba(255, 69, 0, 0.4);  /* CHANGE */
    color: #ff4500;  /* CHANGE */
}
.upload-btn:hover {
    background: #ff4500;  /* CHANGE */
    box-shadow: 0 0 20px rgba(255, 69, 0, 0.5);  /* CHANGE */
}
```

3. Loader text (line 49):
```css
.loader-text {
    color: #ff4500;  /* CHANGE from #d4af37 */
}
```

4. Spinner (lines 52-56):
```css
.spinner {
    border: 1px solid rgba(255, 69, 0, 0.2);  /* CHANGE */
    border-top: 1px solid #ff4500;  /* CHANGE */
}
```

5. Webcam border (line 131):
```css
#webcam-wrapper {
    border: 1px solid rgba(255, 69, 0, 0.5);  /* CHANGE */
}
```

6. Debug info (line 153):
```css
#debug-info {
    color: rgba(255, 69, 0, 0.8);  /* CHANGE */
}
```

7. Modal styles (lines 255-416): Update all `#d4af37` → `#ff4500`

---

### T4: Update HTML title and text
**File**: `christmas_tree_pro.html`
**Changes**:

1. Page title (line 13):
```html
<title>Grand Luxury Tree - Spring Festival Edition</title>
```

2. H1 title (line 443):
```html
<h1>Happy Spring Festival</h1>
```

3. Loader text (line 437):
```html
<div class="loader-text">Loading Memories</div>  <!-- Keep or change to "迎春纳福" -->
```

---

### T5: Modify STATE machine
**File**: `christmas_tree_pro.html` (lines 523-529)
**Changes**:
```javascript
const STATE = {
    mode: 'SCATTER',  // CHANGE: default from 'TREE' to 'SCATTER'
    focusIndex: -1,
    focusTarget: null,
    hand: { detected: false, x: 0, y: 0 },
    rotation: { x: 0, y: 0 }
};
```

---

### T6: Implement FireworkSystem class
**File**: `christmas_tree_pro.html` (NEW - insert after line 893)
**Code**:
```javascript
class FireworkSystem {
    constructor(scene) {
        this.scene = scene;
        this.rockets = [];
        this.explosions = [];
        this.lastLaunchTime = 0;
    }

    update(dt, currentTime, isActive) {
        // Launch new rockets if active
        if (isActive && this.explosions.length < CONFIG.firework.maxExplosions) {
            const interval = THREE.MathUtils.randInt(
                CONFIG.firework.launchIntervalMin,
                CONFIG.firework.launchIntervalMax
            );
            if (currentTime - this.lastLaunchTime > interval) {
                this.launchRocket();
                this.lastLaunchTime = currentTime;
            }
        }

        // Update rockets
        this.rockets = this.rockets.filter(rocket => {
            rocket.update(dt);
            if (rocket.position.y >= rocket.targetHeight) {
                this.createExplosion(rocket);
                rocket.dispose(this.scene);
                return false;
            }
            return rocket.alive;
        });

        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            explosion.update(dt);
            if (!explosion.alive) {
                explosion.dispose(this.scene);
                return false;
            }
            return true;
        });
    }

    launchRocket() {
        const x = THREE.MathUtils.randFloatSpread(CONFIG.firework.launchXRange * 2);
        const startPos = new THREE.Vector3(x, -15, THREE.MathUtils.randFloatSpread(10));
        const targetHeight = THREE.MathUtils.randFloat(
            CONFIG.firework.targetHeightMin,
            CONFIG.firework.targetHeightMax
        );
        const color = CONFIG.firework.colors[
            Math.floor(Math.random() * CONFIG.firework.colors.length)
        ];
        const type = CONFIG.firework.types[
            Math.floor(Math.random() * CONFIG.firework.types.length)
        ];

        const rocket = new Rocket(startPos, targetHeight, color, type, this.scene);
        this.rockets.push(rocket);
    }

    createExplosion(rocket) {
        const explosion = new Explosion(
            rocket.position,
            rocket.color,
            rocket.type,
            this.scene
        );
        this.explosions.push(explosion);
    }

    dispose() {
        this.rockets.forEach(r => r.dispose(this.scene));
        this.explosions.forEach(e => e.dispose(this.scene));
        this.rockets = [];
        this.explosions = [];
    }
}
```

---

### T7: Implement Rocket class
**File**: `christmas_tree_pro.html` (NEW - insert before FireworkSystem)
**Code**:
```javascript
class Rocket {
    constructor(startPos, targetHeight, color, type, scene) {
        this.position = startPos.clone();
        this.targetHeight = targetHeight;
        this.color = color;
        this.type = type;
        this.alive = true;
        this.velocity = new THREE.Vector3(0, 15, 0);  // Units per second

        // Create rocket mesh (small glowing sphere)
        const geo = new THREE.SphereGeometry(0.15, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);

        // Create trail
        this.trailPositions = [];
        this.trailGeometry = new THREE.BufferGeometry();
        this.trailMaterial = new THREE.PointsMaterial({
            color: color,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        this.trail = new THREE.Points(this.trailGeometry, this.trailMaterial);
        scene.add(this.trail);
    }

    update(dt) {
        this.position.add(this.velocity.clone().multiplyScalar(dt));
        this.mesh.position.copy(this.position);

        // Add trail point
        this.trailPositions.push(this.position.x, this.position.y, this.position.z);
        if (this.trailPositions.length > 60) {  // Max 20 trail points
            this.trailPositions.splice(0, 3);
        }
        this.trailGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(this.trailPositions, 3)
        );
    }

    dispose(scene) {
        scene.remove(this.mesh);
        scene.remove(this.trail);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.trailGeometry.dispose();
        this.trailMaterial.dispose();
    }
}
```

---

### T8: Implement Explosion class with particle types
**File**: `christmas_tree_pro.html` (NEW - insert before Rocket)
**Code**: See design.md for full implementation. Key methods:
- `constructor()`: Initialize particles based on type
- `getInitialVelocities(type)`: Return velocity array based on explosion pattern
- `update(dt)`: Apply gravity, fade, update positions
- `dispose(scene)`: Clean up Three.js objects

Particle counts by type:
- PEONY: 300 (spherical burst)
- WILLOW: 200 (downward trails)
- CHRYSANTHEMUM: 400 (dense rays)
- HEART: 250 (heart shape)
- DOUBLE: 500 (two-stage)
- RING: 200 (circular)

---

### T9: Create lantern decoration
**File**: `christmas_tree_pro.html` (NEW function)
**Code**:
```javascript
function createLanterns() {
    const positions = [
        new THREE.Vector3(-12, 8, -5),
        new THREE.Vector3(12, 8, -5)
    ];

    positions.forEach(pos => {
        const lantern = createLantern();
        lantern.position.copy(pos);
        lantern.userData.baseY = pos.y;
        lantern.userData.floatOffset = Math.random() * Math.PI * 2;
        scene.add(lantern);
        decorations.push(lantern);
    });
}

function createLantern() {
    const group = new THREE.Group();

    // Main body
    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xff2d2d,
        emissive: 0x660000,
        emissiveIntensity: 0.4
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Top ring
    const ringGeo = new THREE.TorusGeometry(0.65, 0.08, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2
    });
    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 0.6;
    group.add(topRing);

    // Bottom ring
    const bottomRing = topRing.clone();
    bottomRing.position.y = -0.6;
    group.add(bottomRing);

    // Tassel
    const tasselGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
    const tasselMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    for (let i = 0; i < 8; i++) {
        const tassel = new THREE.Mesh(tasselGeo, tasselMat);
        const angle = (i / 8) * Math.PI * 2;
        tassel.position.set(
            Math.cos(angle) * 0.3,
            -1.0,
            Math.sin(angle) * 0.3
        );
        group.add(tassel);
    }

    return group;
}
```

---

### T10: Create Fu character decoration
**File**: `christmas_tree_pro.html` (NEW function)
**Code**:
```javascript
function createFuCharacters() {
    const positions = [
        new THREE.Vector3(-10, -6, -3),
        new THREE.Vector3(10, -6, -3)
    ];

    // Create "福" texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Red background
    ctx.fillStyle = '#ff2d2d';
    ctx.fillRect(0, 0, 256, 256);

    // Gold border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 236);

    // "福" character
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 180px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('福', 128, 138);

    const texture = new THREE.CanvasTexture(canvas);

    positions.forEach(pos => {
        const geo = new THREE.PlaneGeometry(2, 2);
        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });
        const fu = new THREE.Mesh(geo, mat);
        fu.position.copy(pos);
        fu.rotation.z = Math.PI;  // Inverted (福到)
        fu.userData.baseRotation = Math.PI;
        fu.userData.rotateOffset = Math.random() * Math.PI * 2;
        scene.add(fu);
        decorations.push(fu);
    });
}
```

---

### T11: Modify processGestures()
**File**: `christmas_tree_pro.html` (lines 1410-1465)
**Changes**:
```javascript
function processGestures(result) {
    if (result.landmarks && result.landmarks.length > 0) {
        STATE.hand.detected = true;
        // ... (keep landmark calculations)

        // NEW gesture mapping
        if (extensionRatio < 1.5) {
            // Fist → SCATTER with hand control
            STATE.mode = 'SCATTER';
            STATE.focusTarget = null;
        } else if (pinchRatio < 0.35) {
            // Pinch → FOCUS (unchanged)
            if (STATE.mode !== 'FOCUS') {
                STATE.mode = 'FOCUS';
                const photos = particleSystem.filter(p => p.type === 'PHOTO');
                if (photos.length) {
                    STATE.focusTarget = photos[Math.floor(Math.random()*photos.length)].mesh;
                }
            }
        } else if (extensionRatio > 1.7) {
            // Open hand → FIREWORK (NEW)
            STATE.mode = 'FIREWORK';
            STATE.focusTarget = null;
        }
    } else {
        STATE.hand.detected = false;
        // No hand → maintain SCATTER (don't change mode)
        debugInfo.innerText = "No hand detected";
    }
}
```

---

### T12: Modify animate() loop
**File**: `christmas_tree_pro.html` (lines 1504-1532)
**Changes**:
```javascript
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const currentTime = performance.now();

    // Rotation Logic (modified)
    if ((STATE.mode === 'SCATTER' || STATE.mode === 'FIREWORK') && STATE.hand.detected) {
        const targetRotY = STATE.hand.x * Math.PI * 0.9;
        const targetRotX = STATE.hand.y * Math.PI * 0.25;
        STATE.rotation.y += (targetRotY - STATE.rotation.y) * 3.0 * dt;
        STATE.rotation.x += (targetRotX - STATE.rotation.x) * 3.0 * dt;
    } else {
        // Auto slow rotation when no hand
        STATE.rotation.y += 0.1 * dt;
        STATE.rotation.x += (0 - STATE.rotation.x) * 2.0 * dt;
    }

    mainGroup.rotation.y = STATE.rotation.y;
    mainGroup.rotation.x = STATE.rotation.x;

    // Update particles
    particleSystem.forEach(p => p.update(dt, STATE.mode, STATE.focusTarget));

    // Update snow
    updateSnow();

    // Update fireworks (NEW)
    fireworkSystem.update(dt, currentTime, STATE.mode === 'FIREWORK');

    // Update decorations (NEW)
    updateDecorations(dt);

    composer.render();
}

function updateDecorations(dt) {
    const time = clock.elapsedTime;
    decorations.forEach(dec => {
        if (dec.userData.baseY !== undefined) {
            // Lantern float
            dec.position.y = dec.userData.baseY + Math.sin(time * 0.5 + dec.userData.floatOffset) * 0.3;
        }
        if (dec.userData.baseRotation !== undefined) {
            // Fu rotation
            dec.rotation.z = dec.userData.baseRotation + Math.sin(time * 0.3 + dec.userData.rotateOffset) * 0.1;
        }
    });
}
```

---

### T13: Remove TREE mode code
**File**: `christmas_tree_pro.html`
**Actions**:
1. Remove star creation in `createParticles()` (lines 1091-1121)
2. Remove TREE case in `Particle.update()` (lines 974-982)
3. Remove `posTree` calculations for non-PHOTO particles
4. Remove `updatePhotoLayout()` tree-based positioning

---

### T14: Modify Particle class
**File**: `christmas_tree_pro.html` (lines 895-1002)
**Changes**:
- Remove `posTree` for non-PHOTO particles
- Simplify `calculatePositions()` to only use scatter positions
- Update `update()` to handle SCATTER, FOCUS, FIREWORK modes

---

### T15: Integration testing
**Actions**:
1. Test all three gesture modes
2. Verify firework performance (target 60fps)
3. Check decoration animations
4. Verify color scheme consistency
5. Test photo loading and display
6. Test on different screen sizes

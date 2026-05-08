# Design: Spring Festival Firework Edition

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    spring_festival.html                         │
│                     (Single-file Application)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Three.js  │    │  MediaPipe  │    │    DOM      │         │
│  │  3D Render  │    │   Gesture   │    │   UI Layer  │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │                    STATE Machine                     │       │
│  │  mode: 'SCATTER' | 'FOCUS' | 'FIREWORK'             │       │
│  └─────────────────────────────────────────────────────┘       │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         ▼                 ▼                 ▼                  │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐            │
│  │ Firework  │     │   Snow    │     │Decorations│            │
│  │  System   │     │  System   │     │ (Lantern  │            │
│  │  (NEW)    │     │ (retain)  │     │  + Fu)    │            │
│  └───────────┘     └───────────┘     └───────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine Design

### State Transitions

```
                    ┌─────────────┐
                    │   SCATTER   │ ◀─── Default state
                    │  (散开照片)  │      No gesture → maintain
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │   SCATTER   │  │    FOCUS    │  │  FIREWORK   │
   │   (Fist)    │  │   (Pinch)   │  │ (Open Hand) │
   │ Hand rotate │  │ Photo zoom  │  │  Fireworks  │
   └─────────────┘  └─────────────┘  └─────────────┘
```

### Gesture Detection Thresholds
| Gesture | Condition | Target State |
|---------|-----------|--------------|
| Fist | extensionRatio < 1.5 | SCATTER (with hand rotation control) |
| Pinch | pinchRatio < 0.35 | FOCUS |
| Open Hand | extensionRatio > 1.7 | FIREWORK |
| No Hand | !STATE.hand.detected | SCATTER (auto slow rotation) |

## Component Designs

### 1. FireworkSystem Class

```javascript
class FireworkSystem {
    constructor(scene) {
        this.scene = scene;
        this.rockets = [];           // Active rockets
        this.explosions = [];        // Active explosions
        this.lastLaunchTime = 0;
        this.launchInterval = 500;   // Base interval (randomized)
        this.maxExplosions = 6;      // Performance limit
    }

    // Color palette for Spring Festival
    static COLORS = [
        0xff2d2d,  // Chinese red
        0xffd700,  // Gold
        0xffffff,  // Silver white
        0x00ff7f,  // Emerald green
        0xda70d6,  // Purple
        0xff8c00   // Orange
    ];

    // Firework types
    static TYPES = ['PEONY', 'WILLOW', 'CHRYSANTHEMUM', 'HEART', 'DOUBLE', 'RING'];
}
```

### 2. Rocket Class

```javascript
class Rocket {
    constructor(startPos, targetHeight, color, type) {
        this.position = startPos.clone();
        this.velocity = new THREE.Vector3(0, 0.8, 0);  // Upward
        this.targetHeight = targetHeight;
        this.color = color;
        this.type = type;
        this.trail = null;  // Trail particle system
        this.alive = true;
    }
}
```

### 3. Explosion Class

```javascript
class Explosion {
    constructor(position, color, type) {
        this.position = position.clone();
        this.color = color;
        this.type = type;
        this.particles = null;      // THREE.Points
        this.velocities = [];       // Per-particle velocities
        this.life = 2.0;            // Seconds
        this.gravity = -0.3;
        this.alive = true;
    }

    // Particle count by type
    static PARTICLE_COUNTS = {
        PEONY: 300,
        WILLOW: 200,
        CHRYSANTHEMUM: 400,
        HEART: 250,
        DOUBLE: 500,
        RING: 200
    };
}
```

### 4. Decoration Objects

#### Lantern (灯笼)
```javascript
function createLantern(position) {
    const group = new THREE.Group();

    // Main body (red cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xff2d2d,
        emissive: 0x660000,
        emissiveIntensity: 0.3
    });

    // Top/bottom rings (gold)
    const ringGeo = new THREE.TorusGeometry(0.85, 0.1, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8
    });

    // Tassels (gold strands)
    // ... tassel geometry

    return group;
}
```

#### Fu Character (福字)
```javascript
function createFuCharacter(position) {
    const group = new THREE.Group();

    // Red square background
    const bgGeo = new THREE.PlaneGeometry(2, 2);
    const bgMat = new THREE.MeshStandardMaterial({
        color: 0xff2d2d,
        side: THREE.DoubleSide
    });

    // Gold "福" character (using texture or geometry)
    // Rotated 180° for "福到" (fortune arrives)

    group.rotation.z = Math.PI;  // Inverted
    return group;
}
```

### 5. Decoration Layout

```
Screen Layout:
┌─────────────────────────────────────────────────────────────┐
│  🏮 (-12, 8, -5)                      🏮 (12, 8, -5)        │
│                                                             │
│                    [Photo Display Area]                     │
│                                                             │
│  福 (-10, -6, -3)                      福 (10, -6, -3)      │
└─────────────────────────────────────────────────────────────┘
```

## Color Scheme Constants

```javascript
const SPRING_COLORS = {
    // UI Colors
    primary: '#ff4500',           // Buttons, accents
    primaryHover: '#ff6347',      // Button hover
    gold: '#ffd700',              // Photo borders, highlights

    // Title gradient
    titleGradient: 'linear-gradient(to bottom, #fff, #ff4500)',

    // Particle colors
    particleDarkRed: 0x8b0000,    // Replace green
    particleBrightRed: 0xff4500,  // Replace old red
    particleGold: 0xffd966,       // Keep gold

    // Background (unchanged)
    bg: 0x050d1a,
    fog: 0x050d1a
};
```

## Animation Specifications

### Lantern Float Animation
```javascript
// Gentle up-down oscillation
lantern.position.y = baseY + Math.sin(time * 0.5) * 0.3;
```

### Fu Character Rotation Animation
```javascript
// Gentle rotation oscillation
fu.rotation.z = Math.PI + Math.sin(time * 0.3) * 0.1;
```

### Firework Lifecycle
1. **Launch** (0-1.5s): Rocket rises with glowing trail
2. **Explosion** (instant): Rocket disappears, particles spawn
3. **Bloom** (0-2s): Particles expand outward, gravity pulls down
4. **Fade** (0.5-1s): Particles shrink, fade to transparent

## Performance Considerations

- Maximum 6 simultaneous explosions
- Each explosion: 200-500 particles
- Total firework particles: ~3000 max
- Use `THREE.Points` with `BufferGeometry` for GPU efficiency
- Dispose completed explosions immediately
- Snow system unchanged (1000 particles)

## File Structure

```
spring_festival.html (single file, ~1800 lines)
├── CSS Styles (lines 14-420)
│   └── Updated color scheme
├── HTML Structure (lines 433-483)
│   └── Updated title text
└── JavaScript Module (lines 484-end)
    ├── CONFIG (updated colors)
    ├── STATE (remove TREE, add FIREWORK)
    ├── FireworkSystem class (NEW)
    ├── Rocket class (NEW)
    ├── Explosion class (NEW)
    ├── createLanterns() (NEW)
    ├── createFuCharacters() (NEW)
    ├── Particle class (modified)
    ├── processGestures() (modified)
    └── animate() (modified)
```

# Proposal: Enhance Firework Effects & Decoration Overhaul

## Summary
Overhaul the firework particle system for realistic, visually stunning effects, and redesign lantern/福 decorations with proper geometry, larger size, and responsive camera-frustum-anchored positioning. Fix FIREWORK mode to hide scene particles while preserving background elements.

## Motivation
Current implementation has three critical visual deficiencies:
1. FIREWORK mode displays scattered photo particles alongside fireworks, creating visual clutter
2. Firework explosions are small, monochromatic, lack trails, and visually indistinguishable across types
3. Lanterns use cylindrical geometry (not lantern-shaped), 福 characters are too small, and both are occluded by particles due to z-depth positioning

## Requirements

### R1: FIREWORK Mode Particle Visibility
- **Target file**: `spring_festival.html` — `Particle.update()` method (line ~1161)
- **State machine** for each particle: `VISIBLE → FADING_OUT → HIDDEN → FADING_IN → VISIBLE`
- When `STATE.mode` enters `'FIREWORK'`:
  - All particles transition to `FADING_OUT`: scale lerps toward 0 over 0.5s
  - Once scale < 0.01: set `mesh.visible = false`, transition to `HIDDEN`
  - In `HIDDEN` state: **skip all position/rotation/scale updates** (CPU saving)
- When `STATE.mode` exits `'FIREWORK'`:
  - All particles transition to `FADING_IN`: set `mesh.visible = true`, scale lerps back to **`baseScale`** over 0.5s
  - Once scale reaches `baseScale`: transition to `VISIBLE`, then normal mode-dependent scaling logic resumes in subsequent frames (e.g., PHOTO 2.5x in SCATTER, FOCUS sizing, dust breathing)
- **Hidden particle types**: ALL in `particleSystem` — BOX, GOLD_BOX, GOLD_SPHERE, RED, CANE, PHOTO, DUST (including dust)
- **Remains visible in FIREWORK mode**: lanterns, 福 characters, snow, fog, lights, UI overlay

### R2: Firework Visual Overhaul
- **Target file**: `spring_festival.html` — `Explosion` class (line ~912), `Rocket` class (line ~1002), `FireworkSystem` (line ~1044)

#### R2.1: Particle Count & Size
| Type | Current Count | New Count | Point Size |
|------|-------------|-----------|------------|
| PEONY | 150 | 600 | 0.5 base, randomized ±0.2 |
| WILLOW | 100 | 400 | 0.4, elongated via shader |
| CHRYSANTHEMUM | 180 | 800 | 0.35, dense ray pattern |
| HEART | 120 | 500 | 0.45 |
| DOUBLE | 200 | 600+300 (two-stage) | 0.5 then 0.35 |
| RING | 100 | 400 | 0.4 |
- **Max concurrent core explosion particles**: 5000 (excluding trail ghosts and rocket trails; trail ghosts managed by per-explosion ring-buffer cap of 2000 vertices)

#### R2.2: Color System
- Each explosion uses a **primary color** from palette: `[0xff2d2d, 0xffd700, 0xffffff, 0x00ff7f, 0xda70d6, 0xff8c00]`
- Per-particle color variation: HSL hue shift ±15°, saturation ±10% from primary
- **Vertex colors** via `BufferGeometry.setAttribute('color', ...)` with custom `ShaderMaterial` (canonical path)
- Core particles (low initial speed) brighter, outer particles (high speed) fade toward white
- **Custom `ShaderMaterial`** for all explosion particles — supports: per-particle color (attribute `aColor`), per-particle alpha (attribute `aAlpha`), per-particle size (attribute `aSize`), sparkle phase (attribute `aPhase`), and time uniform for WILLOW elongation

#### R2.3: Trail / Tail Effects
- **Approach**: "Trail particles" — NOT geometric `LineSegments` (performance prohibitive at scale)
- Each explosion particle spawns **2 trail ghost particles per frame** at its previous position
- Trail ghosts: inherit parent color at reduced brightness (50%), initial size = parent size × 0.6
- Trail ghost lifetime: 0.15s, rapid linear fade to 0
- All trail ghosts batched into a **single preallocated `Points` BufferGeometry per explosion** (ring-buffer, max 2000 trail vertices)
- No per-trail-particle physics — they stay at spawn position and just fade
- Rocket trail: increase from 20 points to 40 points, `PointsMaterial` size from 0.1 to 0.3, add slight position spread (±0.05)

#### R2.4: Sparkle / Flicker
- 30% of particles in each explosion flagged as "sparkle" (via per-particle attribute `aPhase`)
- Sparkle particles: scintillation effect `opacity = pow(max(0, sin(time * 10 + phase)), 10.0)` — sharp bright flashes with long dark intervals, mimicking real magnesium-based firework stars
- Non-sparkle particles: smooth non-linear fade only

#### R2.5: Physics
- **Gravity**: type-dependent — WILLOW: 12, PEONY: 6, CHRYSANTHEMUM: 4, HEART: 5, RING: 3
- **Air drag**: `velocity.multiplyScalar(0.96)` (was 0.98, faster deceleration for more natural arc)
- **Speed distribution**: `speed = 3 + Math.random() * 8` (was `4 + random * 4`, wider spread)
- **Turbulence**: per-frame random offset `±0.1` on x/z velocity for organic movement
- **Fade curve**: `opacity = Math.pow(life / maxLife, 1.5)` — slow start, rapid end (non-linear)
- **Size decay**: particles shrink to 60% of original size over lifetime

#### R2.6: DOUBLE Type Two-Stage Explosion
- Stage 1: 600 particles, normal PEONY-style explosion, `maxLife = 2.5s`
- Trigger: when `progress >= 0.4` (i.e., `life <= maxLife * 0.6`), spawn secondaries **once** (guard flag `secondarySpawned`)
- Spawn 6 secondary sub-explosions at 6 random active particle positions
- Each sub-explosion: 50 particles, speed = 2 + random * 3 (smaller radius), lifetime = 1.0s
- Secondary color: randomly picked from palette, different from primary
- Secondary particles use same physics as PEONY (gravity=6, drag=0.96)
- Secondary particles **count toward the 5000 cap** — if cap reached, reduce secondary count proportionally

#### R2.7: Launch Enhancements
- Launch interval: 200-600ms (was 300-800ms, denser)
- Target height range: 5-22 (was 8-18, wider vertical spread)
- Launch X range: ±20 (was ±15, wider horizontal spread)
- Rocket speed: 18 units/s (was 15, faster ascent)

### R3: Lantern Redesign
- **Target file**: `spring_festival.html` — `createLantern()` (line ~1316), `createLanterns()` (line ~1300)

#### R3.1: Geometry
- Replace `CylinderGeometry(0.6, 0.6, 1.2)` with **`LatheGeometry`** using a parametric oval profile:
  ```
  points = []; for i in 0..20: t = (i/20)*PI; points.push(Vector2(sin(t)*1.8, -cos(t)*2.5))
  ```
- Lathe segments: 24
- Add gold top cap ring and bottom cap ring using `TorusGeometry(1.9, 0.12, 8, 24)`
- Tassels: 12 strands, length 1.5, using `CylinderGeometry(0.04, 0.02, 1.5)` with slight random rotation
- Hanging rope: single cylinder from top ring upward, length 1.0

#### R3.2: Material
- Body: `MeshStandardMaterial` with `color: 0xcc0000, emissive: 0x880000, emissiveIntensity: 0.6, transparent: true, opacity: 0.85`
- Add `PointLight` inside each lantern: `color: 0xff6600, intensity: 2, distance: 8` for warm glow

#### R3.3: Positioning (Camera Frustum Anchored)
- Decorations added to **`scene` directly** (NOT `mainGroup`) — they do NOT rotate with gesture-controlled mainGroup
- Compute world positions via **NDC unprojection**: map NDC corners to world-space at target depth plane
- Position: top-left and top-right of visible frustum, inset 15% from edges
- Depth plane: `z = 25` (between camera z=50 and particles z=0)
- On window resize: **recalculate in resize handler** using updated `camera.projectionMatrixInverse`
- Float animation retained: `±0.5` vertical oscillation

### R4: 福 Character Redesign
- **Target file**: `spring_festival.html` — `createFuCharacters()` (line ~1353)

#### R4.1: Size & Resolution
- Canvas texture: **512×512** (was 256×256)
- `PlaneGeometry(4, 4)` (was 2×2, doubled)
- Gold border: lineWidth 12 (was 8)
- Font: `bold 360px serif` (was 180px)

#### R4.2: Positioning (Camera Frustum Anchored)
- Bottom-left and bottom-right corners of the visible frustum, inset 15% from edges
- Depth: `z = 25` (same as lanterns, in front of particles)
- On window resize: recalculate positions
- Rotation animation retained: `±0.1 rad` gentle sway

### R5: Decoration Rendering Order (Anti-Occlusion)
- Set `material.depthTest = false` on all decoration meshes (lanterns, 福) — guarantees they render on top regardless of scene geometry
- Set `renderOrder = 999` on all decoration meshes — ensures they draw after all other objects
- Combined with z=25 positioning, this provides double guarantee against occlusion

## Scope

### In Scope
- `Particle.update()` FIREWORK mode branch rewrite
- `Explosion` class complete rewrite (particles, colors, trails, physics)
- `Rocket` class trail enhancement
- `FireworkSystem` parameter tuning
- `createLantern()` geometry replacement
- `createLanterns()` frustum-based positioning
- `createFuCharacters()` size/position upgrade
- `updateDecorations()` frustum recalculation on resize

### Out of Scope
- Audio / sound effects
- New firework types beyond existing 6
- Gesture threshold changes
- Mobile-specific adaptations beyond responsive positioning
- Snow system changes

## Success Criteria
1. FIREWORK mode: zero particles visible after 0.5s fade, only fireworks + decorations + snow + background
2. Each firework type visually distinct and recognizable
3. All explosions have visible particle trails
4. Lanterns are oval-shaped, visually prominent, never occluded by particles
5. 福 characters clearly readable, never occluded
6. Decorations reposition correctly on window resize
7. Smooth 60fps on mid-range desktop hardware

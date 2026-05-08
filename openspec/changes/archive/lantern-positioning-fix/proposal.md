# Proposal: Lantern Positioning and Visual Enhancement Fix

## Summary
Fix the lantern positioning bug where all four lanterns appear in the browser center instead of being distributed in the corners (top-left: 2, top-right: 2). Replace vector-style canvas lanterns with high-quality realistic texture images and implement gentle floating sway animation.

## Motivation
- Current implementation has a camera matrix initialization bug causing lanterns to cluster in center
- Canvas-drawn vector lanterns lack visual appeal and realism
- Sway animation is too mechanical (linear oscillation) rather than natural floating
- User requires aesthetic improvement for Spring Festival themed photo display

## Requirements

### R1: Lantern Positioning Fix
**Problem**: `camera.matrixWorld` is not updated before first `unproject()` call, causing NDC coordinates to collapse toward center.

**Root Cause**: In `initThree()`, camera is created but `updateMatrixWorld()` is not called before `createLanterns()` executes `ndcToWorld()`.

**Solution**:
- Add `camera.updateMatrixWorld(true)` after camera position set in `initThree()`
- Add `camera.updateMatrixWorld(true)` at start of `ndcToWorld()` function
- Modify `targetZ` from 25 to 35 for better foreground presence

### R2: Corner Layout Configuration
**Layout**: Arc-shaped hanging (outer lanterns slightly higher, inner lanterns slightly lower)

| Position | NDC X | NDC Y | Character | Scale |
|----------|-------|-------|-----------|-------|
| Far-Left | -0.92 | 0.90 | 春 | 1.00 |
| Mid-Left | -0.72 | 0.84 | 节 | 0.94 |
| Mid-Right | 0.72 | 0.84 | 快 | 0.94 |
| Far-Right | 0.92 | 0.90 | 乐 | 1.00 |

**Constants**:
```javascript
const LANTERN_TARGET_Z = 35;  // Moved from 25 for closer foreground
const LANTERN_LAYOUT = [
    { ndc: [-0.92, 0.90], char: '春', scale: 1.00 },
    { ndc: [-0.72, 0.84], char: '节', scale: 0.94 },
    { ndc: [0.72, 0.84], char: '快', scale: 0.94 },
    { ndc: [0.92, 0.90], char: '乐', scale: 1.00 }
];
```

### R3: Lantern Image Texture
**Primary Source** (Realistic Texture):
- URL: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Chinese_Lantern.png/800px-Chinese_Lantern.png`
- License: Public Domain (Wikimedia Commons)
- Resolution: 800x600 PNG with transparency
- Format: Direct CDN link

**Fallback Source**:
- URL: `https://pngimg.com/uploads/chinese_new_year/chinese_new_year_PNG88.png`
- Resolution: 667x1000 PNG with transparency

**Loading Strategy**:
1. Attempt to load primary image URL
2. On failure, fall back to canvas-drawn lantern
3. Use `THREE.TextureLoader` with `crossOrigin = 'anonymous'`
4. Cache loaded texture to avoid re-fetch

### R4: Gentle Floating Sway Animation
**Style**: Soft floating (gentle vertical bob + light rotation)

**Physics Parameters**:
```javascript
// Per-lantern variation
swayOffset: i * 0.75 + random * 0.18  // Phase offset
swayAmplitude: 0.09 ~ 0.11              // Horizontal sway range
swaySpeed: 0.78 ~ 0.88                  // Oscillation frequency
floatAmplitude: 0.035 ~ 0.047          // Vertical bob range
restTilt: -0.08 ~ 0.08                  // Natural resting tilt
```

**Animation Formula**:
```javascript
// Time-based smooth oscillation
const swing = Math.sin(time * speed + phase) * amp
            + Math.sin(time * speed * 2.1 + phase * 1.3) * amp * 0.22;

position.x = anchor.x + swing;
position.y = anchor.y + Math.sin(time * 0.55 + phase) * floatAmplitude;
rotation.z = restTilt + swing;
rotation.y = Math.sin(time * speed * 0.45 + phase) * 0.035;  // Slight 3D wobble
```

### R5: Lantern Rendering Enhancements
**Glow Effect**:
- Add radial gradient glow sprite behind each lantern
- Color: Warm orange (`0xffb56a`)
- Opacity: 0.24
- Scale: 4.4 x 5.9

**Material Configuration**:
- `transparent: true`
- `alphaTest: 0.08` (cleaner transparency edges)
- `depthTest: false`
- `depthWrite: false`
- `renderOrder: 999`

**Character Badge**:
- Separate mesh for Chinese character
- Positioned at front of lantern body
- Size: 0.9 x 0.9
- Uses `drawLanternBadgeCanvas()` for fallback

## Scope

### In Scope
- Camera matrix initialization fix
- NDC coordinate reconfiguration for corner layout
- Network image texture loading with fallback
- Sway animation physics refinement
- Glow sprite addition
- Character badge overlay

### Out of Scope
- Audio/sound effects
- Interactive lantern behaviors (click, drag)
- Mobile-specific optimizations (beyond existing responsive code)
- Backend changes

## Success Criteria
1. All four lanterns visible in correct corners on initial page load
2. Outer lanterns (春/乐) positioned higher than inner lanterns (节/快)
3. Realistic lantern texture displays correctly (not canvas fallback)
4. Sway animation is smooth and gentle (no jarring movements)
5. No console errors related to texture loading
6. Visual consistency across resize events

## Technical Constraints

### File Changes
- **File**: `spring_festival.html`
- **Functions to modify**:
  - `initThree()` - Add camera matrix update
  - `ndcToWorld()` - Add camera matrix update
  - `createLantern()` - Refactor for image loading
  - `createLanterns()` - Use new layout configuration
  - `repositionLanterns()` - Apply arc layout
  - `updateDecorations()` - Implement floating animation

### Browser Compatibility
- CORS handling for cross-origin images
- Fallback to canvas if image load fails
- Existing browser support maintained

### Performance
- Texture caching to avoid re-fetch
- Minimal impact on frame rate (60fps target)
- No additional network requests after initial load

# Design: Lantern Positioning and Visual Enhancement Fix

## Context

Current implementation in `spring_festival.html` has a camera matrix bug where `camera.matrixWorld` is not updated before the first `unproject()` call, causing all four lanterns to cluster in the screen center instead of being positioned in corners. Additionally, the canvas-drawn vector lanterns lack visual appeal, and the sway animation is mechanically linear.

**Technical Stack:**
- Three.js v0.160.0 (locked in project)
- Single HTML file architecture
- No build process
- Certificate-based HTTPS for camera access

## Goals / Non-Goals

**Goals:**
- Fix camera matrix initialization for correct NDC-to-world projection
- Implement arc-shaped corner layout (outer lanterns higher, inner lower)
- Replace canvas lanterns with realistic PNG texture + fallback chain
- Implement gentle floating sway animation with natural physics
- Add warm glow sprite behind each lantern
- Add character badge overlay for PNG textures

**Non-Goals:**
- Interactive lantern behaviors (click, drag)
- Audio/sound effects
- Mobile-specific optimizations beyond existing responsive code
- Backend changes

## Decisions

### D1: Camera Matrix Update Locations

**Decision**: Add `camera.updateMatrixWorld(true)` at two locations:
1. After camera position setup in `initThree()`
2. At the start of `ndcToWorld()` function

**Rationale**: The first call ensures the matrix is initialized before any `unproject()` operations. The second call acts as a defensive measure—whenever NDC conversion is requested, the matrix is guaranteed current. This dual-location approach prevents future regressions if code is refactored.

**Alternative considered**: Single update in `initThree()` only.
**Rejected**: Vulnerable to timing issues if `createLanterns()` is called elsewhere or initialization order changes.

### D2: Texture Loading Fallback Strategy

**Decision**: Three-tier fallback chain: Wikimedia CDN → pngimg.com → Canvas drawing.

**Rationale**:
- Primary source (Wikimedia) offers high quality and reliable availability
- Secondary source (pngimg) provides different CDN geography for resilience
- Canvas fallback ensures zero visual breakage even with total network failure

**Timeout**: 8 seconds per source (not cumulative). Each source gets its own timeout to keep total wait bounded.

**Alternative considered**: Preload all sources in parallel, use first success.
**Rejected**: Wastes bandwidth; sequential fallback is sufficient for static assets.

### D3: Animation Parameter Sampling

**Decision**: Sample all animation parameters once per lantern at creation time, store in `userData`.

**Rationale**:
- Ensures consistent animation throughout session
- Avoids "jitter" from re-sampling on resize
- Simpler state management (no drift correction needed)

**Parameters per lantern**:
```javascript
{
  swayOffset: i * 0.75 + Math.random() * 0.18,  // Phase
  swaySpeed: 0.78 + Math.random() * 0.10,        // [0.78, 0.88]
  swayAmp: 0.09 + Math.random() * 0.02,          // [0.09, 0.11]
  floatAmp: 0.035 + Math.random() * 0.012,       // [0.035, 0.047]
  restTilt: -0.08 + Math.random() * 0.16         // [-0.08, 0.08]
}
```

### D4: Group Structure for Lantern Elements

**Decision**: Each lantern is a `THREE.Group` containing three children:

| Child | Type | renderOrder | Purpose |
|-------|------|-------------|---------|
| glow | Sprite | 997 | Background glow |
| body | Mesh | 999 | Main lantern texture |
| badge | Mesh | 1000 | Character (PNG only) |

**Rationale**: Group-level transforms ensure synchronized animation. All child elements move together without individual position updates.

**Alternative considered**: Single mesh with combined texture.
**Rejected**: Limits animation flexibility (cannot independently rotate/position glow vs body).

### D5: Character Badge Conditional

**Decision**: Add character badge only when using PNG texture. Canvas texture already includes the character.

**Rationale**:
- Canvas drawing function `drawLanternCanvas(char)` renders full lantern with character
- PNG texture is generic (no character), requires overlay
- Avoids visual duplication

## Risks / Trade-offs

**Risk**: CORS failure on image loading
**Mitigation**: Three-tier fallback chain; Canvas fallback guaranteed to work. Log warnings for debugging.

**Risk**: Texture load delay causing visible "pop-in"
**Mitigation**: Lantern Group added to scene only after texture resolves. Consider loading indicator if user reports issues (not in initial scope).

**Trade-off**: Network dependency for optimal visuals
**Acceptance**: Canvas fallback provides acceptable quality; network dependency justified by significant visual improvement.

**Risk**: Animation performance impact on low-end devices
**Mitigation**: Animation uses only `Math.sin()`—no complex physics. 60fps target is conservative; actual performance impact is negligible.

## Implementation Notes

### Modified Functions

| Function | Change Type | Description |
|----------|-------------|-------------|
| `initThree()` | Add | `camera.updateMatrixWorld(true)` after position |
| `ndcToWorld()` | Add | `camera.updateMatrixWorld(true)` at start |
| `createLanterns()` | Modify | Use `LANTERN_LAYOUT` constant, store animation params in `userData` |
| `createLantern()` | Refactor | Implement PNG loading chain, create Group structure |
| `updateDecorations()` | Modify | Apply floating animation formula to Group |
| `repositionLanterns()` | Modify | Apply arc layout with aspect ratio clamping |

### New Constants

```javascript
const LANTERN_TARGET_Z = 35;
const LANTERN_LAYOUT = [
    { ndc: [-0.92, 0.90], char: '春', scale: 1.00 },
    { ndc: [-0.72, 0.84], char: '节', scale: 0.94 },
    { ndc: [0.72, 0.84], char: '快', scale: 0.94 },
    { ndc: [0.92, 0.90], char: '乐', scale: 1.00 }
];
const LANTERN_IMAGE_URL = 'https://upload.wikimedia.org/...';
const LANTERN_FALLBACK_URL = 'https://pngimg.com/...';
const TEXTURE_TIMEOUT = 8000;
```

### New Helper Functions

- `loadLanternTexture(char)`: Orchestrates three-tier fallback
- `getLanternGlowTexture()`: Cached radial gradient texture
- `drawLanternBadgeCanvas(char)`: Character badge texture

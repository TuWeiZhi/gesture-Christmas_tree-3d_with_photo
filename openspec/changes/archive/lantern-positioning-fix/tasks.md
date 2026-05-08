## 1. Constants and Configuration

- [x] 1.1 Add `LANTERN_TARGET_Z = 35` constant
- [x] 1.2 Add `LANTERN_LAYOUT` array with NDC coordinates, characters, and scales
- [x] 1.3 Add `LANTERN_IMAGE_URL` (Wikimedia CDN) and `LANTERN_FALLBACK_URL` (pngimg.com)
- [x] 1.4 Add `TEXTURE_TIMEOUT = 8000` constant

## 2. Camera Matrix Fix

- [x] 2.1 Add `camera.updateMatrixWorld(true)` after camera position setup in `initThree()`
- [x] 2.2 Add `camera.updateMatrixWorld(true)` at start of `ndcToWorld()` function

## 3. Texture Loading Infrastructure

- [x] 3.1 Create `textureCache` Map for shared texture storage
- [x] 3.2 Create `loadLanternTexture(url, timeout)` function with Promise-based timeout
- [x] 3.3 Implement three-tier fallback: primary URL → fallback URL → canvas
- [x] 3.4 Add console logging for fallback events (warn for fallback, info for canvas)

## 4. Glow Sprite

- [x] 4.1 Create `getLanternGlowTexture()` cached singleton function
- [x] 4.2 Implement radial gradient canvas with warm orange color (0xffb56a)
- [x] 4.3 Configure Sprite with opacity 0.24, scale 4.4×5.9

## 5. Character Badge

- [x] 5.1 Create `drawLanternBadgeCanvas(char)` function
- [x] 5.2 Generate canvas texture with centered Chinese character

## 6. Lantern Group Structure

- [x] 6.1 Refactor `createLantern(char, imageUrl)` to return `THREE.Group`
- [x] 6.2 Add glow Sprite child (renderOrder: 997, y: -2.65)
- [x] 6.3 Add body Mesh child with PNG/Canvas texture (renderOrder: 999)
- [x] 6.4 Add badge Mesh child for PNG textures only (renderOrder: 1000, y: -2.3, z: 0.02)
- [x] 6.5 Configure material: transparent, alphaTest: 0.08, depthTest: false, depthWrite: false

## 7. Animation Parameters

- [x] 7.1 Store animation parameters in `userData` during lantern creation
- [x] 7.2 Generate per-lantern randomized values: swayOffset, swaySpeed, swayAmp, floatAmp, restTilt
- [x] 7.3 Store `anchor` position for each lantern

## 8. Lantern Creation and Layout

- [x] 8.1 Modify `createLanterns()` to use `LANTERN_LAYOUT` constant
- [x] 8.2 Update `createLanterns()` to generate and store animation parameters
- [x] 8.3 Modify `repositionLanterns()` to apply arc-shaped layout
- [x] 8.4 Add aspect ratio clamping for portrait mode (X: ±0.85)
- [x] 8.5 Apply target Z position (35) for foreground presence

## 9. Sway Animation

- [x] 9.1 Update `updateDecorations(dt)` to implement floating sway formula
- [x] 9.2 Apply primary sway: `sin(time * speed + phase) * transAmp`
- [x] 9.3 Add secondary harmonic: `sin(time * speed * 2.1 + phase * 1.3) * transAmp * 0.22`
- [x] 9.4 Add vertical float: `sin(time * 0.55 + phase) * floatAmp`
- [x] 9.5 Apply rotation: z-axis tilt and y-axis slight 3D wobble

## 10. Verification

- [ ] 10.1 Test all four lanterns appear in correct corners on page load
- [ ] 10.2 Verify outer lanterns (春/乐) are higher than inner lanterns (节/快)
- [ ] 10.3 Confirm PNG texture loads and displays correctly
- [ ] 10.4 Test texture fallback chain (block primary URL, verify fallback)
- [ ] 10.5 Verify sway animation is smooth and natural
- [ ] 10.6 Test window resize maintains correct positioning
- [ ] 10.7 Confirm no console errors related to texture loading

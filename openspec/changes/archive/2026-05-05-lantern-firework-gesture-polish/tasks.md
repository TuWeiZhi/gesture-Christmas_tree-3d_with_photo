## 1. Lantern Rewrite

- [x] 1.1 Implement `drawLanternCanvas(char, size)`: Canvas2D draws red oval body + gold outline + gold character + gold tassel strands + gold hook on 512×512 canvas, returns CanvasTexture
- [x] 1.2 Rewrite `createLantern(char)`: replace all 3D geometry (LatheGeometry/TorusGeometry/ribs/tassels/hanger/hook/PointLight/character planes) with single PlaneGeometry + lantern texture material (transparent, depthTest:false, renderOrder:999, side:DoubleSide)
- [x] 1.3 Rewrite `createLanterns()`: create 4 lanterns with chars ['春','节','快','乐'], each with independent swayOffset/swayAmplitude userData
- [x] 1.4 Rewrite `repositionLanterns()`: position left pair at NDC x ∈ [-0.85, -0.55] y=0.75 z=25, right pair at NDC x ∈ [0.55, 0.85] y=0.75 z=25
- [x] 1.5 Add horizontal connecting lines (THREE.Line): left line from viewport edge through left pair tops, right line through right pair tops; depthTest:false; update in repositionLanterns()
- [x] 1.6 Update `updateDecorations()`: apply sway animation to all 4 lanterns with independent phase/amplitude
- [x] 1.7 Remove old `createLanternCharacterTexture()` function

## 2. Firework Enhancement

- [x] 2.1 Multi-color explosion: in `_initParticles()`, select 2-4 colors from palette, assign to particles by index segment (i % colorCount)
- [x] 2.2 Increase explosion size: speed range `4 + random * 12` (was `3 + random * 8`), baseSizes *= 1.5
- [x] 2.3 Enhance post-bloom trails: trail lifetime 0.4s (was 0.15s), size factor 0.8× (was 0.6×), brightness 70% (was 50%)

## 3. Gesture Fallback

- [x] 3.1 In `processGestures()` else branch: set `STATE.mode = 'SCATTER'` and `STATE.focusTarget = null` when no hand detected

## 4. Cleanup

- [x] 4.1 Remove unused CONFIG.colors entries if any (lanternGold no longer needed if not used by lantern Canvas2D)
- [x] 4.2 Verify resize handler calls repositionLanterns() and line update

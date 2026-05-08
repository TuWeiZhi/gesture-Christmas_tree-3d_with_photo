# Tasks: Enhance Firework Effects & Decoration Overhaul

## Task Overview

| ID | Task | Status |
|----|------|--------|
| T1 | FIREWORK mode particle visibility state machine | Done |
| T2 | Explosion class rewrite with ShaderMaterial | Done |
| T3 | Trail system (ring-buffer per explosion) | Done |
| T4 | Sparkle/flicker effect | Done |
| T5 | Type-dependent physics | Done |
| T6 | DOUBLE two-stage explosion | Done |
| T7 | Launch parameter tuning | Done |
| T8 | Rocket trail enhancement | Done |
| T9 | Lantern geometry redesign (LatheGeometry) | Done |
| T10 | Lantern NDC frustum-anchored positioning | Done |
| T11 | Decoration rendering order (anti-occlusion) | Done |
| T12 | 福 character handling | Done (deviation) |

## Checklist

- [x] T1: Particle.update() — visState state machine (VISIBLE/FADING_OUT/HIDDEN/FADING_IN), prevMode tracking
- [x] T2: Explosion._initParticles() — custom ShaderMaterial with aColor/aAlpha/aSize/aPhase attributes, per-particle HSL color variation
- [x] T3: Explosion._initTrails() / _updateTrails() — preallocated ring-buffer (3000 vertices), 50% brightness, 0.6× size, 0.15s fade
- [x] T4: 30% sparkle via aPhase attribute, pow(sin(time*10+phase), 10.0) scintillation in fragment shader
- [x] T5: Type-dependent gravity (WILLOW:12, PEONY:6, CHRYSANTHEMUM:4, HEART:5, RING:3, DOUBLE:6), drag 0.96, speed 3+rand*8, turbulence, pow(progress,1.5) fade, 60% size decay
- [x] T6: secondStageTriggered guard at 40% progress, 6 sub-explosions (50 particles each, 1.0s life)
- [x] T7: Interval 200-600ms, height 5-22, X ±20, maxExplosions 5
- [x] T8: Rocket TRAIL_LEN=40, ring-buffer, size 0.3, spread ±0.1, setDrawRange
- [x] T9: LatheGeometry (28-point profile, 48 segments), gold bands/ribs/tassels/hanger/hook, 春/福 character textures
- [x] T10: ndcToWorld() NDC→world unprojection, repositionLanterns() in resize handler, z=25 depth plane
- [x] T11: depthTest:false + renderOrder:999/1000 on all decoration meshes
- [x] T12: 福 character integrated into lantern body (accepted deviation from proposal R4 — no separate bottom-corner decorations)

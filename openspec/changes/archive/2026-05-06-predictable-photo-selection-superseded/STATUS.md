---
SUPERSEDED: 2026-05-06
SUPERSEDED_BY: focus-cycle-navigation (FOCUS 模式改为手势驱动顺序循环)
REASON: 视觉反馈不足 — 候选呼吸效果在 3D 场景中可见度偏低,用户决定放弃"屏幕中心选片+视觉高亮"路径,改为每次进入 FOCUS 顺序展示下一张
---

# Status

This change was implemented but its visual-feedback approach (breathing pulse + emissive border highlight on the screen-center candidate photo) was rejected by the user during validation. The breathing effect was deemed too subtle in the dynamic 3D scene.

# Outcome

- **Removed** in supersession: HIGHLIGHT_* constants, applyHighlight/removeHighlight/updateCandidateHighlightPulse functions, getPhotoBorder helper, isBorder/borderMesh/isHighlighted userData markers, scale-based candidate inflation in Particle.update, animate() pulse call.
- **Retained** as internal data-only feature: candidateTarget tracking, updateCandidatePhoto/updateCandidateTarget, worldToScreen, debounce constants. Used as starting anchor for the new cycle pointer.
- **Added** by superseding change: STATE.focusIndex as persistent cycle cursor, sequential cycle on each FOCUS entry, photo-deletion safe index correction.

See spring_festival.html for current implementation. The original spec deltas under specs/ are no longer authoritative — the candidate-visual-feedback capability is abandoned, candidate-photo-tracking survives only as internal data feeding the cycle entry point.

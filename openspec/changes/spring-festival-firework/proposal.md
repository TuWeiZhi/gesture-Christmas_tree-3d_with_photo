# Proposal: Spring Festival Firework Edition

## Summary
Transform the Christmas tree gesture-controlled photo display into a Spring Festival (Chinese New Year) themed version with firework effects, replacing the tree aggregation with scattered photo display and adding festive decorations.

## Motivation
- Adapt the existing project for Spring Festival holiday use
- Showcase photography works with a festive Chinese New Year atmosphere
- Provide an engaging interactive experience with firework effects triggered by hand gestures

## Requirements

### R1: Gesture Mapping Adjustment
- **Fist gesture** (extensionRatio < 1.5) → `SCATTER` mode: Photos scatter, gesture controls viewport rotation
- **Pinch gesture** (pinchRatio < 0.35) → `FOCUS` mode: Random photo enlarges to center (unchanged)
- **Open hand gesture** (extensionRatio > 1.7) → `FIREWORK` mode: Continuous firework launch, gesture position does NOT affect launch position
- **No gesture detected** → Maintain `SCATTER` mode, photos remain scattered

### R2: Visual Effects Adjustment
- Remove Christmas tree aggregation shape (completely remove `TREE` mode)
- Remove top star decoration
- Add lantern decorations (four corners layout, slight floating animation)
- Add Fu (福) character decorations (inverted Fu, four corners layout, slight rotation animation)
- Retain snow system
- Retain deep blue night sky background

### R3: Color Scheme Change (Gold-Black → Red-Gold)
| Element | Current (Gold-Black) | Spring Festival (Red-Gold) |
|---------|---------------------|---------------------------|
| Title text | Gold gradient | Red-gold gradient |
| UI buttons border | rgba(212,175,55) | rgba(255,69,0) |
| UI buttons text | #d4af37 | #ff4500 |
| UI buttons hover | #d4af37 background | #ff4500 background |
| Particle green | #03180a | #8b0000 (dark red) |
| Particle red | #990000 | #ff4500 (bright red) |
| Photo border | #FFD700 (gold) | #FFD700 (gold) - retain |

### R4: Title Text Change
- Change from "Merry Christmas" to "Happy Spring Festival"

### R5: Firework System (New Feature)
- **Firework types**: Peony (spherical), Willow, Chrysanthemum, Heart, Double explosion, Ring
- **Color palette**: Chinese red #ff2d2d, Gold #ffd700, Silver white #ffffff, Emerald green #00ff7f, Purple #da70d6, Orange #ff8c00
- **Launch interval**: 300-800ms random
- **Launch position**: Random X position at bottom of screen (-15 to +15)
- **Target height**: Random (8 to 18)
- **Simultaneous explosion limit**: Maximum 5-8

### R6: File Changes
- Base file: `christmas_tree_pro.html`
- Create new branch and modify in place, or create `spring_festival.html`

## Scope

### In Scope
- Gesture mapping logic modification
- State machine adjustment (remove TREE, add FIREWORK)
- CSS color scheme update
- Firework particle system implementation
- Lantern and Fu character 3D decorations
- Title and UI text changes

### Out of Scope
- Backend changes (none required - pure frontend)
- New photo loading mechanisms
- Mobile gesture support changes
- Audio/sound effects

## Success Criteria
1. Open hand gesture triggers continuous firework display
2. Fist gesture scatters photos with rotation control
3. Pinch gesture focuses on random photo (unchanged behavior)
4. No gesture maintains scattered photo state
5. Lanterns and Fu characters visible at four corners with animations
6. Red-gold color scheme applied consistently
7. Snow continues falling in background
8. Performance remains smooth (60fps target)

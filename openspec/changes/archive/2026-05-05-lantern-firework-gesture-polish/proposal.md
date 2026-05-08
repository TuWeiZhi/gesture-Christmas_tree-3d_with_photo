## Why

当前 `spring_festival.html` 存在四个视觉/交互缺陷：
1. **灯笼造型不匹配**：当前使用复杂 3D LatheGeometry，与目标扁平插画风格（参考截图）差异巨大
2. **福字冗余**：融入灯笼体的"福"字视觉效果不佳，用户明确要求移除
3. **烟花效果不足**：爆炸半径偏小，缺乏真实的绽放后拖尾下坠效果，且每个烟花仅单色
4. **手势丢失无回退**：摄像头丢失手势或无法识别时，STATE.mode 停留在上一状态（如 FIREWORK），无自动回退机制

## What Changes

- **替换灯笼实现**：移除 `createLantern()` 的 3D LatheGeometry/TorusGeometry/ribs/tassels 实现，改为 Canvas2D 绘制完整灯笼贴图（红色椭圆体 + 金色描边 + 金色文字 + 金色流苏 + 金色挂钩），渲染在 `PlaneGeometry` 上
- **灯笼数量与文字**：从 2 个增至 4 个，左侧 "春""节"、右侧 "快""乐"，通过 NDC 视锥定位分布在画面上方
- **灯笼连接线**：在画面顶部添加水平连接线（Line/LineSegments），将同侧两个灯笼串联
- **移除福字**：删除 `createLanternCharacterTexture()` 中的福字生成逻辑及相关调用
- **烟花多色爆炸**：每次爆炸从调色板随机选取 2-4 种颜色，粒子按区段分配不同颜色
- **烟花尺寸增大**：提升初始速度范围（4-12，原 3-8）和粒子基础尺寸（+50%）
- **爆炸后拖尾增强**：延长 trail 存活时间（0.4s，原 0.15s），增大 trail 粒子尺寸（0.8×，原 0.6×），提高亮度（70%，原 50%）
- **手势丢失自动回退**：`processGestures()` 在未检测到手势时自动切换 `STATE.mode = 'SCATTER'`

## Capabilities

### New Capabilities
- `flat-lantern-rendering`: Canvas2D 绘制扁平风格灯笼贴图，包括灯笼体、文字、流苏、挂钩，渲染在 PlaneGeometry 上并支持 NDC 视锥定位与摇摆动画

### Modified Capabilities
- `firework-visual`: 烟花爆炸多色分配、尺寸增大、爆炸后拖尾增强
- `gesture-handling`: 手势丢失时自动回退到 SCATTER 模式

## Impact

- **文件**：仅修改 `spring_festival.html`
- **函数重写**：`createLantern()`、`createLanterns()`、`repositionLanterns()`、`createLanternCharacterTexture()`
- **函数修改**：`Explosion._initParticles()`、`Explosion._updateTrails()`、`processGestures()`、`updateDecorations()`
- **CONFIG 变更**：`firework` 配置区段（速度范围、trail 参数）
- **无 API/依赖变更**：纯前端修改

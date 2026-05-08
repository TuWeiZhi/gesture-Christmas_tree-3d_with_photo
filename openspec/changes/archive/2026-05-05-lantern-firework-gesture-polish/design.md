## Context

`spring_festival.html` 是一个基于 Three.js 的手势交互春节主题页面。当前灯笼使用 3D LatheGeometry 实现（约 50+ draw calls / 2 灯笼），视觉风格与目标扁平插画风格不匹配。烟花系统使用自定义 ShaderMaterial 渲染，单色爆炸，post-bloom 拖尾效果薄弱。手势处理在丢失追踪时不改变 STATE.mode。

## Goals / Non-Goals

**Goals:**
- 灯笼视觉完全匹配参考截图的扁平 2D 插画风格
- 4 个灯笼 + 连接线，响应式定位
- 烟花爆炸多色、更大、拖尾更明显
- 手势丢失时自动回退 SCATTER

**Non-Goals:**
- 不改变烟花类型（PEONY/WILLOW 等 6 种保持不变）
- 不改变手势识别阈值
- 不添加音效
- 不改变雪花/粒子系统

## Decisions

### D1: Canvas2D 绘制灯笼贴图 → PlaneGeometry

**选择**: 用 Canvas2D 在 offscreen canvas 上绘制完整灯笼图案（椭圆体、描边、文字、流苏、挂钩），生成 CanvasTexture 贴到 PlaneGeometry 上。

**理由**: 参考图是扁平插画风格，2D 贴图天然匹配；相比 3D 几何体大幅减少 draw calls（4 个灯笼 = 4 draw calls vs 原来 50+）；Canvas2D 绘制灵活可控。

**替代方案**: HTML/CSS 覆盖层（无法随 Three.js 场景联动）、简化 3D（仍无法匹配 2D 风格）。

### D2: 灯笼定位保持 NDC 视锥投影

**选择**: 复用现有 `ndcToWorld()` 方案，4 个灯笼定位在上方区域，resize 时重新计算。

**理由**: 已验证可行，无需引入新坐标系统。

### D3: 连接线使用 Line 几何体

**选择**: 在画面顶部边缘绘制水平 `THREE.Line`，从左侧灯笼组延伸到画面左边缘，右侧同理。

**理由**: 简单直接，匹配参考图中细线效果。

### D4: 烟花多色 — 按角度区段分配颜色

**选择**: 每次爆炸从调色板随机选取 2-4 种颜色，粒子按发射角度均匀分配到各颜色区段。

**理由**: 真实烟花呈现多色扇区效果，按角度分配比随机分配更有规律感。CONFIG 中已预留 `palettePerExplosionMin/Max` 参数。

### D5: 拖尾增强 — 调整 trail 参数

**选择**: trail 存活时间 0.15s → 0.4s，尺寸系数 0.6× → 0.8×，亮度 50% → 70%。

**理由**: 当前 trail 消失太快，视觉上几乎不可见。延长存活时间和增大尺寸使下坠拖尾效果显著。

## Risks / Trade-offs

- **Canvas2D 灯笼清晰度** → 使用 512×512 canvas 确保高 DPI 清晰度，设置 `texture.colorSpace = SRGBColorSpace`
- **4 灯笼 + 连接线增加 draw calls** → 仅增加 6 个 draw calls（4 plane + 2 line），远少于原方案的 50+
- **多色烟花 ShaderMaterial 兼容** → 颜色仍通过 aColor attribute 传递，shader 无需修改
- **trail 存活时间延长可能增加 GPU 压力** → ring buffer 上限 (TRAIL_MAX=3000) 不变，仅调整衰减速度

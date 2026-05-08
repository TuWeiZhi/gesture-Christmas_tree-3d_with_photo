# firework-visual Specification

## Purpose

约束 `spring_festival.html` 中烟花爆炸（Explosion）粒子系统的视觉表现：多色分配、爆炸尺寸、爆炸后拖尾下坠。来源：`changes/lantern-firework-gesture-polish` 已实施并归档。

## Requirements

### Requirement: Multi-color explosion

每次烟花爆炸 SHALL 从 `CONFIG.firework.colors` 调色板中随机选取 2-4 种颜色（数量由 `palettePerExplosionMin` / `palettePerExplosionMax` 控制）。粒子按发射索引均匀分配到各颜色区段，每个区段内仍保留 HSL 微调（色相 ±15°，饱和度 ±10%）。

#### Scenario: 爆炸多色分布

- **WHEN** 一个 Explosion 被创建
- **THEN** 其粒子呈现 2-4 种不同的主色调，按区段分布

### Requirement: Enlarged explosion radius

烟花爆炸粒子的初始速度范围 SHALL 为 `4 + random * 12`（替代旧值 `3 + random * 8`）。粒子基础尺寸 SHALL 增大 50%（`baseSizes` 乘以 1.5）。

#### Scenario: 爆炸视觉尺寸增大

- **WHEN** 烟花爆炸绽放
- **THEN** 爆炸覆盖范围明显大于增强前

### Requirement: Enhanced post-bloom particle trails

爆炸后粒子拖尾（trail ghost）的参数 SHALL 满足：

- 存活时间：0.4s（`tAlp[i] - dt / 0.4`）
- 尺寸系数：0.8×
- 亮度系数：70%

拖尾粒子在重力作用下随主粒子下坠，呈现真实的绽放后拖尾下坠效果。

#### Scenario: 拖尾可见性

- **WHEN** 烟花粒子在爆炸后下坠
- **THEN** 每个粒子身后留下明显可见的发光拖尾，拖尾随重力下坠

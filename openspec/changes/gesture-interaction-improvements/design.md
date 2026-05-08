# 设计文档

## 架构决策

### 1. 呼吸效果实现路径

**决策**：在 `animate()` 中调用 `updateCandidateHighlightPulse()`，通过 `userData.targetScale` 写入

**理由**：
- 现有架构中，`Particle.update()` 负责将 `targetScale` 插值到 `mesh.scale`
- 直接修改 `mesh.scale` 会与插值逻辑冲突
- 保持单一职责：呼吸效果只负责更新目标值，插值由粒子系统统一处理

**替代方案（已拒绝）**：
- ❌ 直接在 `applyHighlight()` 中修改 scale：无法实现动态效果
- ❌ 在 `Particle.update()` 中处理：职责不清晰，耦合度高

### 2. 增量旋转计算位置

**决策**：在 `processGestures()` 中计算 deltaX 并累加到 `STATE.rotation.y`

**理由**：
- `processGestures()` 按摄像头帧触发（~30fps）
- `animate()` 按渲染帧触发（~60fps）
- 如果在 `animate()` 中计算，会重复消费同一帧手势数据，导致过旋

**关键代码**：
```javascript
function updateRotationFromHand(currentHandX) {
    if (STATE.hand.lastRotateX === null) {
        STATE.hand.lastRotateX = currentHandX;
        return; // 首次检测，仅记录起点
    }
    
    let deltaX = currentHandX - STATE.hand.lastRotateX;
    STATE.hand.lastRotateX = currentHandX;
    
    // 死区和限幅
    if (Math.abs(deltaX) < ROTATION_DELTA_DEADZONE) return;
    deltaX = THREE.MathUtils.clamp(deltaX, -ROTATION_DELTA_MAX, ROTATION_DELTA_MAX);
    
    STATE.rotation.y += deltaX * ROTATION_Y_SENSITIVITY;
}
```

### 3. 手势判定优先级

**决策**：比耶手势 > 握拳/张掌粗分类

**理由**：
- 比耶手势的 extensionRatio 在 1.5-1.7 之间，会被粗分类误判
- 必须先检测精确手势，再回退到粗分类

**判定流程**：
```
1. 检测比耶手势（精确）
   ├─ 是 → 进入 FOCUS
   └─ 否 → 继续
2. 检测 extensionRatio < 1.5（握拳）
   └─ 是 → SCATTER
3. 检测 extensionRatio > 1.7（张掌）
   └─ 是 → FIREWORK
```

## 状态管理

### 新增状态字段

```javascript
STATE.hand.lastRotateX: null | number  // 上一帧手掌 x 坐标，用于增量旋转
```

### 状态重置时机

`resetHandRotationTracking()` 在以下情况调用：
1. 手消失（`landmarks.length === 0`）
2. handSize 无效（`< 0.02`）
3. 进入 FOCUS 模式
4. 离开 SCATTER/FIREWORK 模式

## 性能优化

### 1. 边框引用缓存

**问题**：每次高亮更新都调用 `children.find()`
**方案**：首次查找后缓存到 `userData.borderMesh`

```javascript
function getPhotoBorder(photoMesh) {
    if (!photoMesh.userData.borderMesh) {
        photoMesh.userData.borderMesh = photoMesh.children.find(
            child => child.userData.isBorder === true
        );
    }
    return photoMesh.userData.borderMesh;
}
```

### 2. 呼吸效果条件检查

只在以下条件同时满足时更新：
- `STATE.candidateTarget` 存在
- `photoMesh.userData.isHighlighted === true`
- `STATE.mode === 'SCATTER'`

## 参数调优

### 呼吸效果参数

| 参数 | 值 | 理由 |
|------|-----|------|
| HIGHLIGHT_PULSE_SPEED | 4.5 | 约 1.4 秒一个周期，节奏适中 |
| HIGHLIGHT_EMISSIVE_MIN | 0.25 | 避免触发 Bloom（阈值 0.95） |
| HIGHLIGHT_EMISSIVE_MAX | 0.75 | 保持明显对比，不过度发光 |
| HIGHLIGHT_SCALE_MIN | 1.15 | 与原有高亮一致 |
| HIGHLIGHT_SCALE_MAX | 1.22 | 微动幅度，不影响布局 |

### 旋转控制参数

| 参数 | 值 | 理由 |
|------|-----|------|
| ROTATION_Y_SENSITIVITY | π * 1.35 | 手掌移动 50% 屏幕宽度 ≈ 旋转 135° |
| ROTATION_DELTA_DEADZONE | 0.01 | 过滤 MediaPipe 微抖 |
| ROTATION_DELTA_MAX | 0.12 | 防止突变（约 50°/帧） |

### 比耶手势阈值

| 参数 | 值 | 理由 |
|------|-----|------|
| 食指距离 | > handSize * 1.55 | 完全伸直 |
| 中指距离 | > handSize * 1.60 | 中指略长 |
| 无名指距离 | < handSize * 1.45 | 弯曲状态 |
| 小指距离 | < handSize * 1.35 | 弯曲状态 |
| 两指间距 | > handSize * 0.35 | 避免并拢误判 |

## 边界情况处理

### 1. 手势快速切换
- 使用 `focusGestureFrameCount >= 2` 防抖
- 模式切换时清空计数器

### 2. 手掌部分遮挡
- `handSize < 0.02` 时完全重置状态
- 避免残留输入导致幽灵旋转

### 3. 候选照片切换
- 新候选高亮时，旧候选自动移除高亮
- 进入 FOCUS 时，`candidateTarget` 置空，避免呼吸效果误打

### 4. 旋转累积溢出
- `STATE.rotation.y` 无限累加，Three.js 自动处理周期性
- 不需要手动取模

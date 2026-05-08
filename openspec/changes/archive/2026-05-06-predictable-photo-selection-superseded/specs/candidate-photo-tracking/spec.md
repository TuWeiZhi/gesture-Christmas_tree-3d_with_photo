## ADDED Requirements

### Requirement: Calculate candidate photo based on screen center distance
系统 SHALL 在 SCATTER 模式下，每帧计算所有符合资格的照片到屏幕中心的距离，并选择距离最近的照片作为候选照片。

**坐标系统约束**：
- 使用 NDC（归一化设备坐标），范围 [-1, 1]
- 屏幕中心定义为 Three.js 渲染视口中心，坐标 (0, 0)
- 投影点使用照片 Group 的 `position` 属性（世界坐标）
- 距离计算公式：`Math.hypot(ndcX, ndcY)`

**候选资格规则**：
- 必须满足：`particle.type === 'PHOTO'`
- 必须满足：`particle.visState === 'VISIBLE'`
- 必须满足：投影后 `z < 1`（在相机前方）

**Property-Based Testing 不变量**：
- **[INVARIANT]** 候选照片始终是所有符合资格照片中距离屏幕中心最近的
- **[INVARIANT]** 如果存在符合资格的照片，候选照片不能为 null
- **[INVARIANT]** 候选照片必须在 particleSystem 中且符合资格规则

#### Scenario: Multiple photos in scene
- **WHEN** SCATTER 模式激活且场景中有多张符合资格的照片
- **THEN** 系统使用 `Vector3.project(camera)` 将每张照片的世界坐标投影到 NDC 空间
- **THEN** 系统过滤掉 `z >= 1` 的照片（相机后方或远平面外）
- **THEN** 系统计算每张照片到屏幕中心点 (0, 0) 的欧几里得距离
- **THEN** 系统选择距离最小的照片作为候选照片

#### Scenario: Single photo in scene
- **WHEN** SCATTER 模式激活且场景中只有1张符合资格的照片
- **THEN** 该照片持续被选为候选照片
- **THEN** 防抖机制不影响该照片的候选状态

#### Scenario: No photos in scene
- **WHEN** SCATTER 模式激活且场景中没有符合资格的照片
- **THEN** 候选照片为 null，不显示任何高亮效果
- **THEN** `STATE.candidateTarget === null`

#### Scenario: Photo behind camera
- **WHEN** 照片在相机后方（投影后 `z >= 1`）
- **THEN** 该照片不符合候选资格
- **THEN** 即使该照片距离屏幕中心最近，也不会被选为候选

### Requirement: Update candidate photo in real-time during rotation
系统 SHALL 在握拳移动旋转场景时，实时更新候选照片，使其始终反映当前屏幕中心最近的照片。

#### Scenario: User rotates scene left
- **WHEN** 用户握拳并向左移动手部，导致场景向左旋转
- **THEN** 候选照片随着旋转实时更新
- **THEN** 当新的照片移动到更接近屏幕中心的位置时，候选照片切换到该照片

#### Scenario: User rotates scene right
- **WHEN** 用户握拳并向右移动手部，导致场景向右旋转
- **THEN** 候选照片随着旋转实时更新
- **THEN** 当新的照片移动到更接近屏幕中心的位置时，候选照片切换到该照片

### Requirement: Implement debounce mechanism to prevent jittering
系统 SHALL 实现防抖机制，避免候选照片在旋转过程中频繁抖动切换。

**防抖参数约束**：
- 距离阈值：`0.08` NDC 单位
- 冷却时间：`300` 毫秒
- 时间源：`performance.now()`

**防抖执行顺序**：
1. 先检查冷却时间（如果 `now - lastSwitchTime < 300`，返回）
2. 再检查距离阈值（如果 `|oldDist - newDist| < 0.08`，返回）
3. 两者都通过才执行切换

**绕过防抖的情况**：
- 首次选择候选照片（`STATE.candidateTarget === null`）
- 当前候选被删除（在 `removePhotoFromScene` 中触发）
- 从 FIREWORK 模式返回 SCATTER 模式

**Property-Based Testing 不变量**：
- **[INVARIANT]** 两次候选切换的时间间隔 >= 300ms（除非绕过防抖）
- **[INVARIANT]** 候选切换时，新旧候选的距离差 >= 0.08 NDC（除非绕过防抖）
- **[INVARIANT]** 首次选择候选照片时，防抖不生效

#### Scenario: Candidate switch with threshold
- **WHEN** 新照片的屏幕中心距离比当前候选照片更近
- **THEN** 系统计算距离差 `|oldDist - newDist|`
- **THEN** 仅在距离差 >= 0.08 NDC 单位时才切换候选照片
- **THEN** 如果距离差 < 0.08，保持当前候选不变

#### Scenario: Candidate switch with cooldown
- **WHEN** 候选照片刚刚切换完成
- **THEN** 系统记录切换时间 `lastCandidateSwitchTime = performance.now()`
- **THEN** 在接下来的 300 毫秒内，任何切换请求都被拒绝
- **THEN** 300 毫秒后，恢复正常的候选照片更新逻辑

#### Scenario: First candidate selection bypasses debounce
- **WHEN** `STATE.candidateTarget === null` 且找到符合资格的照片
- **THEN** 立即设置该照片为候选，不检查冷却时间和距离阈值
- **THEN** 记录切换时间，后续切换应用防抖

### Requirement: Maintain candidate state across mode transitions
系统 SHALL 在模式切换时正确维护候选照片状态。

**模式切换行为约束**：
- **进入 SCATTER**：立即重新计算候选照片，绕过防抖
- **进入 FOCUS**：保持候选照片状态（`STATE.candidateTarget` 不变），但不显示高亮
- **进入 FIREWORK**：清空候选照片（`STATE.candidateTarget = null`），移除高亮
- **从 FIREWORK 返回 SCATTER**：立即重新计算候选照片，绕过防抖

**Property-Based Testing 不变量**：
- **[INVARIANT]** SCATTER 模式下，`STATE.candidateTarget` 始终是当前最优候选或 null
- **[INVARIANT]** FOCUS 模式下，`STATE.candidateTarget` 保持不变
- **[INVARIANT]** FIREWORK 模式下，`STATE.candidateTarget === null`

#### Scenario: Enter SCATTER mode from FOCUS
- **WHEN** 用户从 FOCUS 模式返回 SCATTER 模式
- **THEN** 系统立即调用 `updateCandidatePhoto()`，绕过防抖
- **THEN** 候选照片基于当前屏幕中心距离选择
- **THEN** 如果新候选与之前的候选不同，立即切换并应用高亮

#### Scenario: Enter FOCUS mode from SCATTER
- **WHEN** 用户从 SCATTER 模式进入 FOCUS 模式（做OK手势）
- **THEN** 系统使用当前候选照片作为聚焦目标（`STATE.focusTarget = STATE.candidateTarget`）
- **THEN** `STATE.candidateTarget` 保持不变
- **THEN** 候选照片的高亮效果保持显示（不移除）

#### Scenario: Enter FIREWORK mode
- **WHEN** 用户进入 FIREWORK 模式（张开手掌）
- **THEN** 系统调用 `removeHighlight(STATE.candidateTarget)` 移除高亮
- **THEN** 系统设置 `STATE.candidateTarget = null`
- **THEN** 不显示任何候选高亮效果

#### Scenario: Return to SCATTER from FIREWORK
- **WHEN** 用户从 FIREWORK 模式返回 SCATTER 模式
- **THEN** 系统立即调用 `updateCandidatePhoto()`，绕过防抖
- **THEN** 重新计算并设置候选照片
- **THEN** 应用高亮效果

### Requirement: Provide world-to-screen coordinate conversion
系统 SHALL 提供将3D世界坐标转换为2D屏幕坐标的工具函数。

**函数签名**：
```javascript
function worldToScreen(worldPos: THREE.Vector3): { x: number, y: number, z: number }
```

**输出格式约束**：
- 返回 NDC（归一化设备坐标）
- `x` 和 `y` 范围：[-1, 1]
- `z` 范围：[0, 1]（0 = 近平面，1 = 远平面）
- 屏幕中心坐标：(0, 0)

**执行时机约束**：
- 必须在 `camera.updateMatrixWorld()` 之后调用
- 必须在场景旋转逻辑之后调用
- 确保使用当前帧的相机矩阵

**Property-Based Testing 不变量**：
- **[INVARIANT]** 相机位置的投影结果接近 (0, 0, 0)
- **[INVARIANT]** 相机前方物体的 `z < 1`
- **[INVARIANT]** 相机后方物体的 `z >= 1`
- **[INVARIANT]** 屏幕中心物体的 `x ≈ 0` 且 `y ≈ 0`

#### Scenario: Convert photo position to screen space
- **WHEN** 系统需要计算照片到屏幕中心的距离
- **THEN** 系统克隆照片的世界坐标 `worldPos.clone()`
- **THEN** 系统调用 `vector.project(camera)` 将世界坐标转换为 NDC
- **THEN** 系统返回 `{ x: vector.x, y: vector.y, z: vector.z }`
- **THEN** 屏幕中心坐标为 (0, 0)，范围为 [-1, 1]

#### Scenario: Photo at screen center
- **WHEN** 照片位于屏幕中心
- **THEN** `worldToScreen()` 返回的 `x ≈ 0` 且 `y ≈ 0`（误差 < 0.01）
- **THEN** 距离 `Math.hypot(x, y) ≈ 0`

#### Scenario: Photo behind camera
- **WHEN** 照片在相机后方
- **THEN** `worldToScreen()` 返回的 `z >= 1`
- **THEN** 该照片不符合候选资格

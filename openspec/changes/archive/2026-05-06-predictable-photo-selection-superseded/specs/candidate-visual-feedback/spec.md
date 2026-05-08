## ADDED Requirements

### Requirement: Apply border glow effect to candidate photo
系统 SHALL 为候选照片的金色边框应用发光效果，使其在视觉上明显区别于其他照片。

**边框识别约束**：
- 使用 `mesh.userData.isBorder === true` 识别边框 Mesh
- 在照片创建时（`addPhotoToScene`）必须设置此标记

**材质独立性约束**：
- 每张照片的边框材质必须是独立实例（使用 `material.clone()`）
- 避免多张照片共享同一材质导致高亮"泄漏"

**发光参数约束**：
- emissiveIntensity：从 `0.05` 提升到 `0.5`
- emissive 颜色：`0xFFD700`（金色）
- 变化方式：瞬间切换（snap），不使用动画
- 恢复时 emissive 颜色：`0x443300`（原始颜色）

**Property-Based Testing 不变量**：
- **[INVARIANT]** 候选照片的边框 emissiveIntensity === 0.5
- **[INVARIANT]** 非候选照片的边框 emissiveIntensity === 0.05
- **[INVARIANT]** 修改一张照片的边框材质不影响其他照片

#### Scenario: Candidate photo is selected
- **WHEN** 照片被选为候选照片
- **THEN** 系统查找 `mesh.userData.isBorder === true` 的子 Mesh
- **THEN** 该边框的 emissiveIntensity 从 0.05 瞬间提升到 0.5
- **THEN** 边框的 emissive 颜色设置为 0xFFD700（金色）
- **THEN** 发光效果在下一帧渲染时可见

#### Scenario: Candidate photo is deselected
- **WHEN** 照片不再是候选照片（候选切换到其他照片）
- **THEN** 该照片的金色边框 emissiveIntensity 瞬间恢复到 0.05
- **THEN** 边框的 emissive 颜色恢复到 0x443300（原始颜色）
- **THEN** 发光效果在下一帧渲染时消失

#### Scenario: Border mesh not found
- **WHEN** 照片 Group 中没有 `userData.isBorder === true` 的子 Mesh
- **THEN** `applyHighlight()` 和 `removeHighlight()` 函数不执行任何操作
- **THEN** 不抛出错误，静默失败

### Requirement: Apply scale effect to candidate photo
系统 SHALL 为候选照片应用轻微缩放效果，使其在视觉上更加突出。

**缩放参数约束**：
- 缩放基准：使用 `userData.baseScale`（在照片创建时存储）
- 缩放公式：`targetScale = baseScale * 1.15`
- 动画方式：使用 lerp 平滑插值
- 目标时长：`0.2` 秒
- lerp alpha 计算：`Math.min(1, dt / 0.2)`

**初始化约束**：
- 在 `addPhotoToScene()` 中必须设置 `group.userData.baseScale`
- baseScale 存储照片创建时的初始缩放值（例如 0.8）

**Property-Based Testing 不变量**：
- **[INVARIANT]** 候选照片的目标缩放 === baseScale * 1.15
- **[INVARIANT]** 非候选照片的目标缩放 === baseScale
- **[INVARIANT]** 缩放动画在 0.2 秒内完成（误差 ±10%）

#### Scenario: Candidate photo scale up
- **WHEN** 照片被选为候选照片
- **THEN** 系统读取 `userData.baseScale`（例如 0.8）
- **THEN** 系统设置 `userData.targetScale = baseScale * 1.15`（例如 0.92）
- **THEN** `Particle.update()` 使用 lerp 平滑插值到目标缩放
- **THEN** 缩放动画在约 0.2 秒内完成

#### Scenario: Candidate photo scale down
- **WHEN** 照片不再是候选照片
- **THEN** 系统设置 `userData.targetScale = baseScale`
- **THEN** `Particle.update()` 使用 lerp 平滑插值到基础缩放
- **THEN** 缩放动画在约 0.2 秒内完成

#### Scenario: Base scale not initialized
- **WHEN** 照片的 `userData.baseScale` 未设置
- **THEN** 系统使用默认值 `0.8` 作为 baseScale
- **THEN** 高亮效果仍然正常工作

### Requirement: Maintain highlight state consistency
系统 SHALL 确保同一时刻只有一张照片处于候选高亮状态。

**状态一致性约束**：
- 任意时刻，最多只有一张照片的边框 emissiveIntensity === 0.5
- 候选切换时，旧候选的高亮必须在新候选高亮应用前移除
- 切换过程不允许出现空白帧（无候选高亮）

**Property-Based Testing 不变量**：
- **[INVARIANT]** `count(photos where emissiveIntensity === 0.5) <= 1`
- **[INVARIANT]** 如果 `STATE.candidateTarget !== null`，则存在一张照片的 emissiveIntensity === 0.5
- **[INVARIANT]** 如果 `STATE.candidateTarget === null`，则所有照片的 emissiveIntensity === 0.05

#### Scenario: Switch candidate from photo A to photo B
- **WHEN** 候选照片从照片A切换到照片B
- **THEN** 系统先调用 `removeHighlight(photoA)`
- **THEN** 照片A的边框 emissiveIntensity 恢复到 0.05
- **THEN** 照片A的 targetScale 恢复到 baseScale
- **THEN** 系统再调用 `applyHighlight(photoB)`
- **THEN** 照片B的边框 emissiveIntensity 提升到 0.5
- **THEN** 照片B的 targetScale 设置为 baseScale * 1.15
- **THEN** 切换在同一帧内完成，无闪烁

#### Scenario: Clear candidate highlight
- **WHEN** 候选照片被设置为 null（例如进入 FIREWORK 模式）
- **THEN** 系统调用 `removeHighlight(STATE.candidateTarget)`
- **THEN** 当前候选照片的高亮效果被移除
- **THEN** `STATE.candidateTarget = null`
- **THEN** 场景中没有照片处于高亮状态

#### Scenario: Concurrent highlight requests
- **WHEN** 在同一帧内多次调用 `applyHighlight()` 或 `removeHighlight()`
- **THEN** 最后一次调用的结果生效
- **THEN** 不会出现状态不一致

### Requirement: Highlight persists during SCATTER mode
系统 SHALL 在整个 SCATTER 模式期间持续显示候选照片的高亮效果。

#### Scenario: User holds fist gesture
- **WHEN** 用户保持握拳手势（SCATTER 模式）
- **THEN** 候选照片的高亮效果持续显示
- **THEN** 即使用户不移动手部，高亮效果也不会消失

#### Scenario: User rotates scene in SCATTER mode
- **WHEN** 用户握拳并旋转场景
- **THEN** 当前候选照片的高亮效果持续显示
- **THEN** 当候选照片切换时，高亮效果平滑转移到新的候选照片

### Requirement: Highlight does not interfere with other visual effects
系统 SHALL 确保候选照片的高亮效果不会干扰其他照片或场景元素的视觉效果。

#### Scenario: Non-candidate photos remain unaffected
- **WHEN** 某张照片被选为候选照片
- **THEN** 其他非候选照片的边框和缩放保持原始状态
- **THEN** 其他照片的视觉效果不受影响

#### Scenario: Highlight works with existing particle effects
- **WHEN** 候选照片高亮效果激活
- **THEN** 照片的旋转动画（spinSpeed）继续正常工作
- **THEN** 照片的位置插值（lerp）继续正常工作
- **THEN** 高亮效果与现有动画叠加，不产生冲突

### Requirement: Optimize highlight rendering performance
系统 SHALL 优化高亮效果的渲染性能，避免影响整体帧率。

#### Scenario: Highlight update per frame
- **WHEN** 系统每帧更新候选照片高亮效果
- **THEN** 仅更新候选照片和上一帧候选照片的材质属性（最多2张照片）
- **THEN** 不遍历所有照片进行不必要的更新

#### Scenario: Smooth transition without performance drop
- **WHEN** 候选照片切换时应用平滑过渡动画
- **THEN** 使用 lerp 插值而非逐帧重新计算
- **THEN** 帧率保持稳定，无明显卡顿

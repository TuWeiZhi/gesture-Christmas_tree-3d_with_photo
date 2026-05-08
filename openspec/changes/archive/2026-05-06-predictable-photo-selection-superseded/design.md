## Context

当前 `spring_festival.html` 使用 MediaPipe 手势识别实现三种交互模式：
- **SCATTER 模式**（握拳）：照片分散在球形空间，用户可旋转场景
- **FOCUS 模式**（OK手势/捏合）：单张照片聚焦到屏幕中心
- **FIREWORK 模式**（张开手掌）：触发烟花效果

**当前问题**：FOCUS 模式使用随机选择算法（`Math.floor(Math.random()*photos.length)`），导致用户无法预测将展示哪张照片。

**技术栈**：
- Three.js r160：3D 渲染引擎
- MediaPipe Hand Landmarker 0.10.3：手势识别
- 单页 HTML 应用，所有逻辑在 `<script type="module">` 中

**约束**：
- 必须保持 60fps 性能（测试环境：Chrome 最新版，1920x1080 分辨率，Intel i5-8代或同等性能，200 张照片）
- 不能影响现有的 SCATTER/FOCUS/FIREWORK 模式切换逻辑
- 视觉效果需要与现有的金色边框、Bloom 后处理协调

## Goals / Non-Goals

**Goals:**
- 实现可预测的照片选择：用户通过握拳旋转场景来"瞄准"想要查看的照片
- 提供清晰的视觉反馈：候选照片在 SCATTER 模式下持续高亮显示
- 保持性能：候选照片计算和高亮渲染不影响帧率
- 平滑的用户体验：候选切换无抖动，高亮效果过渡自然

**Non-Goals:**
- 不改变 FIREWORK 模式的行为
- 不修改照片的布局算法（updatePhotoLayout）
- 不引入新的手势识别逻辑
- 不改变现有的 Particle 类的核心动画逻辑

## Decisions

### Decision 1: 候选照片选择算法 - 屏幕中心距离

**选择**：使用屏幕中心距离算法（Screen Center Distance）

**理由**：
- **直观性**：用户"看到的就是候选"，符合自然交互预期
- **实时性**：随着场景旋转，候选照片平滑切换，提供即时反馈
- **实现简单**：Three.js 提供 `Vector3.project()` 方法，可直接将世界坐标投影到 NDC 空间

**备选方案**：
- **相机正对角度算法**：计算照片法向量与相机方向的夹角。缺点：照片是平面，法向量固定，不适合动态旋转场景
- **旋转角度分区算法**：将 360° 分成 N 个扇区。缺点：照片数量动态变化，分区难以预先定义

**坐标系统规范**：
- **输出格式**：NDC（归一化设备坐标），范围 [-1, 1]
- **屏幕中心**：Three.js 渲染视口中心，坐标为 (0, 0)
- **投影点**：照片 Group 的 `position` 属性（世界坐标）
- **相机前方检查**：投影后 `z < 1` 的照片才有效

**候选资格规则**：
- 必须满足：`type === 'PHOTO'`
- 必须满足：`visState === 'VISIBLE'`
- 必须满足：投影后 `z < 1`（在相机前方）
- 不检查：屏幕视口边界（允许屏幕外照片）
- 不检查：遮挡关系（允许被遮挡照片）

**实现细节**：
```javascript
function worldToScreen(worldPos) {
    const vector = worldPos.clone();
    vector.project(camera);
    // 返回 NDC 坐标 [-1, 1]，屏幕中心为 (0, 0)
    return { x: vector.x, y: vector.y, z: vector.z };
}

function updateCandidatePhoto() {
    // 过滤符合资格的照片
    const photos = particleSystem.filter(p => {
        if (p.type !== 'PHOTO') return false;
        if (p.visState !== 'VISIBLE') return false;
        
        // 检查是否在相机前方
        const screenPos = worldToScreen(p.mesh.position);
        return screenPos.z < 1;
    });
    
    if (photos.length === 0) {
        STATE.candidateTarget = null;
        return;
    }
    
    let closest = null;
    let minDist = Infinity;
    
    photos.forEach(p => {
        const screenPos = worldToScreen(p.mesh.position);
        const dist = Math.hypot(screenPos.x, screenPos.y);
        if (dist < minDist) {
            minDist = dist;
            closest = p.mesh;
        }
    });
    
    if (closest !== STATE.candidateTarget) {
        // 应用防抖逻辑（见 Decision 2）
        updateCandidateTarget(closest);
    }
}
```

### Decision 2: 防抖机制 - 距离阈值 + 冷却时间

**选择**：组合使用距离阈值（Distance Threshold）和冷却时间（Cooldown）

**理由**：
- **距离阈值**：避免两张距离相近的照片频繁切换（阈值 0.08 NDC 单位）
- **冷却时间**：候选切换后 300 毫秒内不再切换，给用户稳定的视觉反馈
- **组合效果**：既保证响应性，又避免抖动

**备选方案**：
- **仅距离阈值**：在快速旋转时仍可能抖动
- **仅冷却时间**：可能导致响应延迟，用户感觉"迟钝"

**防抖执行顺序**：
1. 先检查冷却时间（如果未过冷却期，直接返回）
2. 再检查距离阈值（如果距离差小于阈值，直接返回）
3. 两者都通过才执行切换

**绕过防抖的特殊情况**：
- 首次选择候选照片（`STATE.candidateTarget === null`）
- 当前候选被删除（在 `removePhotoFromScene` 中触发）
- 从 FIREWORK 模式返回 SCATTER 模式

**实现细节**：
```javascript
const CANDIDATE_SWITCH_THRESHOLD = 0.08; // NDC 单位
const CANDIDATE_COOLDOWN = 300; // 毫秒

let lastCandidateSwitchTime = 0;

function updateCandidateTarget(newTarget, bypassDebounce = false) {
    const now = performance.now();
    
    // 首次选择绕过防抖
    if (STATE.candidateTarget === null) {
        bypassDebounce = true;
    }
    
    if (!bypassDebounce) {
        // 1. 冷却时间检查（先执行）
        if (now - lastCandidateSwitchTime < CANDIDATE_COOLDOWN) {
            return;
        }
        
        // 2. 距离阈值检查（后执行）
        if (STATE.candidateTarget) {
            const oldPos = worldToScreen(STATE.candidateTarget.position);
            const newPos = worldToScreen(newTarget.position);
            const oldDist = Math.hypot(oldPos.x, oldPos.y);
            const newDist = Math.hypot(newPos.x, newPos.y);
            
            if (Math.abs(oldDist - newDist) < CANDIDATE_SWITCH_THRESHOLD) {
                return;
            }
        }
    }
    
    // 执行切换
    const oldCandidate = STATE.candidateTarget;
    STATE.candidateTarget = newTarget;
    lastCandidateSwitchTime = now;
    
    // 更新高亮效果
    if (oldCandidate) removeHighlight(oldCandidate);
    if (newTarget) applyHighlight(newTarget);
}
```

### Decision 3: 高亮效果 - 边框发光 + 轻微缩放

**选择**：组合使用边框 emissive 发光和 15% 缩放

**理由**：
- **边框发光**：利用现有的金色边框材质，提升 emissiveIntensity 从 0.05 到 0.5，与场景的金色主题一致
- **轻微缩放**：15% 缩放（基于 `baseScale`）足够明显但不夸张，不会遮挡其他照片
- **性能友好**：仅修改材质属性和 scale，无需额外几何体或纹理

**备选方案**：
- **脉冲动画**：边框大小随时间变化。缺点：增加计算开销，可能分散注意力
- **颜色变化**：边框变为橙红色。缺点：与金色主题不协调
- **外发光后处理**：使用 OutlinePass。缺点：需要额外的渲染 pass，性能开销大

**高亮参数规范**：
- **边框识别**：使用 `mesh.userData.isBorder === true`（需要在照片创建时设置）
- **材质独立性**：每张照片的边框材质必须是独立实例（使用 `material.clone()`）
- **emissive 变化**：瞬间切换（snap），不使用动画
- **缩放基准**：使用 `userData.baseScale`（在照片创建时存储）
- **缩放动画**：使用 lerp 平滑过渡，目标时长 0.2 秒
- **缩放公式**：`targetScale = baseScale * 1.15`

**实现细节**：
```javascript
// 在 addPhotoToScene() 中初始化
function addPhotoToScene(texture, sourceUrl = null) {
    // ... 现有代码 ...
    
    // 标记边框 Mesh
    border.userData.isBorder = true;
    
    // 确保材质独立
    border.material = border.material.clone();
    
    // 存储基础缩放
    group.userData.baseScale = s; // s 是初始缩放值（例如 0.8）
    
    // ... 现有代码 ...
}

function applyHighlight(photoMesh) {
    // photoMesh 是 Group，包含 border 和 photo 两个子 Mesh
    const border = photoMesh.children.find(child => child.userData.isBorder === true);
    if (border) {
        // emissive 瞬间切换
        border.material.emissiveIntensity = 0.5;
        border.material.emissive.setHex(0xFFD700);
    }
    
    // 设置目标缩放（动画通过 Particle.update() 中的 lerp 实现）
    const baseScale = photoMesh.userData.baseScale || 0.8;
    photoMesh.userData.targetScale = baseScale * 1.15;
}

function removeHighlight(photoMesh) {
    const border = photoMesh.children.find(child => child.userData.isBorder === true);
    if (border) {
        // 恢复原始 emissive
        border.material.emissiveIntensity = 0.05;
        border.material.emissive.setHex(0x443300); // 原始颜色
    }
    
    // 恢复基础缩放
    const baseScale = photoMesh.userData.baseScale || 0.8;
    photoMesh.userData.targetScale = baseScale;
}

// 在 Particle.update() 中添加缩放动画
// 目标时长 0.2 秒，使用帧率无关的 lerp
const targetScale = this.mesh.userData.targetScale || this.baseScale;
const lerpAlpha = Math.min(1, dt / 0.2); // 0.2 秒目标时长
this.mesh.scale.lerp(
    new THREE.Vector3(targetScale, targetScale, targetScale),
    lerpAlpha
);
```

### Decision 4: 状态管理 - 扩展现有 STATE 对象

**选择**：在现有的 `STATE` 对象中添加 `candidateTarget` 字段

**理由**：
- **一致性**：与现有的 `focusTarget` 字段保持一致
- **简单性**：无需引入新的状态管理系统
- **可追踪性**：便于调试和日志记录

**实现细节**：
```javascript
const STATE = {
    mode: 'SCATTER',
    focusIndex: -1,
    focusTarget: null,
    candidateTarget: null,  // 新增：当前候选照片 Mesh
    hand: { detected: false, x: 0, y: 0 },
    rotation: { x: 0, y: 0 }
};
```

### Decision 5: 集成点 - animate() 函数中调用

**选择**：在 `animate()` 函数中，仅在 SCATTER 模式下调用 `updateCandidatePhoto()`

**理由**：
- **性能优化**：仅在需要时计算候选照片
- **逻辑清晰**：候选照片仅在 SCATTER 模式下有意义
- **最小侵入**：不影响 FOCUS 和 FIREWORK 模式的逻辑

**执行时机规范**：
- 在 `camera.updateMatrixWorld()` 和场景旋转逻辑之后执行
- 在 `particleSystem.forEach()` 之前执行
- 确保投影计算使用当前帧的相机矩阵

**模式切换行为**：
- **进入 SCATTER**：立即重新计算候选照片（绕过防抖）
- **进入 FOCUS**：保持候选照片状态，但不显示高亮
- **进入 FIREWORK**：清空候选照片（`STATE.candidateTarget = null`），移除高亮
- **从 FIREWORK 返回 SCATTER**：立即重新计算候选照片（绕过防抖）

**实现细节**：
```javascript
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const currentTime = performance.now();

    // 现有的旋转逻辑
    if ((STATE.mode === 'SCATTER' || STATE.mode === 'FIREWORK') && STATE.hand.detected) {
        const targetRotY = STATE.hand.x * Math.PI * 0.9;
        const targetRotX = STATE.hand.y * Math.PI * 0.25;
        STATE.rotation.y += (targetRotY - STATE.rotation.y) * 3.0 * dt;
        STATE.rotation.x += (targetRotX - STATE.rotation.x) * 3.0 * dt;
    } else {
        STATE.rotation.y += 0.1 * dt;
        STATE.rotation.x += (0 - STATE.rotation.x) * 2.0 * dt;
    }

    mainGroup.rotation.y = STATE.rotation.y;
    mainGroup.rotation.x = STATE.rotation.x;
    
    // 确保相机矩阵更新
    camera.updateMatrixWorld();

    // 新增：更新候选照片（仅在 SCATTER 模式）
    if (STATE.mode === 'SCATTER') {
        updateCandidatePhoto();
    } else if (STATE.mode === 'FIREWORK' && STATE.candidateTarget !== null) {
        // 进入 FIREWORK 时清空候选
        if (STATE.candidateTarget) removeHighlight(STATE.candidateTarget);
        STATE.candidateTarget = null;
    }

    particleSystem.forEach(p => p.update(dt, STATE.mode, STATE.focusTarget));

    updateSnow();
    fireworkSystem.update(dt, currentTime, STATE.mode === 'FIREWORK');

    composer.render();
}
```

### Decision 6: FOCUS 模式触发修改 - 使用候选照片

**选择**：修改 `processGestures()` 中的 FOCUS 模式触发逻辑，使用 `STATE.candidateTarget` 而非随机选择

**理由**：
- **可预测性**：用户看到的高亮照片就是将要聚焦的照片
- **一致性**：与候选照片系统无缝集成
- **明确行为**：如果 `candidateTarget` 为 null，忽略 OK 手势，保持 SCATTER 模式

**无候选照片时的行为规范**：
- 当 `STATE.candidateTarget === null` 时，用户做 OK 手势（pinchRatio < 0.35）
- 系统忽略该手势，保持在 SCATTER 模式
- 不进入 FOCUS 模式，不显示任何错误或提示

**OK 手势稳定性要求**：
- pinchRatio 必须连续 2 帧低于 0.35 才触发 FOCUS 模式
- 避免手部抖动导致的误触发

**实现细节**：
```javascript
// 在 processGestures() 函数中添加帧计数器
let pinchFrameCount = 0;

// 原代码（第1801-1807行）
} else if (pinchRatio < 0.35) {
    if (STATE.mode !== 'FOCUS') {
        STATE.mode = 'FOCUS';
        const photos = particleSystem.filter(p => p.type === 'PHOTO');
        if (photos.length) STATE.focusTarget = photos[Math.floor(Math.random()*photos.length)].mesh;
    }
}

// 修改后
} else if (pinchRatio < 0.35) {
    pinchFrameCount++;
    
    // 要求连续 2 帧检测到 OK 手势
    if (pinchFrameCount >= 2 && STATE.mode !== 'FOCUS') {
        // 使用候选照片，如果不存在则忽略手势
        if (STATE.candidateTarget) {
            STATE.mode = 'FOCUS';
            STATE.focusTarget = STATE.candidateTarget;
        }
        // 如果 candidateTarget 为 null，保持 SCATTER 模式，不做任何操作
    }
} else {
    // 重置帧计数器
    pinchFrameCount = 0;
}
```

## Risks / Trade-offs

### Risk 1: 性能影响 - 每帧计算所有照片的屏幕坐标
**影响**：当照片数量达到 200 张时，每帧 O(n) 的投影计算可能影响帧率

**缓解措施**：
- 仅在 SCATTER 模式下计算（FOCUS 和 FIREWORK 模式跳过）
- 使用防抖机制减少实际切换次数
- 利用 Three.js 的矩阵缓存，`Vector3.project()` 已优化
- **降级策略**：如果帧率低于 55fps 持续 1 秒，自动切换到每 2 帧计算一次

**监控指标**：
- 测试环境：Chrome 最新版，1920x1080，Intel i5-8代或同等性能
- 目标：200 张照片时保持 60fps（允许偶尔降至 55fps）
- 测量窗口：连续 5 秒的平均帧率

**降级实现**：
```javascript
let frameCount = 0;
let lowFpsFrames = 0;
let skipFrames = false;

function animate() {
    // ... 现有代码 ...
    
    // 性能监控
    const fps = 1 / dt;
    if (fps < 55) {
        lowFpsFrames++;
        if (lowFpsFrames > 60) { // 约 1 秒
            skipFrames = true;
        }
    } else {
        lowFpsFrames = 0;
    }
    
    // 候选照片更新（带降级）
    if (STATE.mode === 'SCATTER') {
        if (!skipFrames || frameCount % 2 === 0) {
            updateCandidatePhoto();
        }
        frameCount++;
    }
}
```

### Risk 2: 高亮效果与 Bloom 后处理冲突
**影响**：边框 emissiveIntensity 提升到 0.5 可能触发 Bloom 效果，导致照片过度发光

**缓解措施**：
- 当前 Bloom 阈值为 0.95（第801行），0.5 的 emissive 不会触发
- **验证标准**：候选照片边框应有明显金色发光，但照片内容不应过度曝光
- 如果仍有问题，降低 emissiveIntensity 到 0.35

### Risk 3: 快速旋转时候选切换延迟
**影响**：冷却时间（300ms）可能导致快速旋转时候选照片"跟不上"用户意图

**缓解措施**：
- 当前参数（阈值 0.08 NDC，冷却 300ms）已经过优化
- 如果用户反馈延迟，可调整冷却时间为 200ms
- **不建议**低于 200ms，会导致抖动

### Risk 4: 边界情况处理不当
**影响**：照片动态添加/删除时，候选照片可能指向已删除的 Mesh

**缓解措施**：
- 在 `removePhotoFromScene()` 中检查并清空 `STATE.candidateTarget`
- 在 `updateCandidatePhoto()` 中过滤 `visState === 'VISIBLE'` 的照片
- 添加空值检查，避免访问 null 对象

```javascript
function removePhotoFromScene(photoData) {
    // ... 现有逻辑 ...
    
    // 新增：清空候选照片引用
    if (STATE.candidateTarget === photoData.particle.mesh) {
        if (STATE.candidateTarget) removeHighlight(STATE.candidateTarget);
        STATE.candidateTarget = null;
        // 立即重新计算候选（绕过防抖）
        if (STATE.mode === 'SCATTER') {
            updateCandidatePhoto();
        }
    }
    
    // 清空聚焦照片引用
    if (STATE.focusTarget === photoData.particle.mesh) {
        STATE.focusTarget = null;
        STATE.mode = 'SCATTER';
    }
}
```

## Open Questions

无待解决的问题。所有技术决策已明确，可直接进入实现阶段。

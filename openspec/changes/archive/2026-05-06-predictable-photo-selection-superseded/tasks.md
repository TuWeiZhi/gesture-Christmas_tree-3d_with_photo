## 1. 状态管理和工具函数

- [x] 1.1 在 STATE 对象（约第535行）中添加 candidateTarget 字段（初始值为 null）
- [x] 1.2 添加防抖相关的全局常量：CANDIDATE_SWITCH_THRESHOLD = 0.08, CANDIDATE_COOLDOWN = 300
- [x] 1.3 添加防抖相关的全局变量：lastCandidateSwitchTime = 0, pinchFrameCount = 0
- [x] 1.4 实现 worldToScreen(worldPos) 函数，返回 {x, y, z} NDC 坐标，使用 vector.project(camera)
- [ ] 1.5 验证 worldToScreen() 正确性：相机前方物体 z < 1，屏幕中心物体 x ≈ 0 且 y ≈ 0

## 2. 候选照片计算系统

- [x] 2.1 实现 updateCandidatePhoto() 函数，过滤符合资格的照片（type === 'PHOTO', visState === 'VISIBLE', z < 1）
- [x] 2.2 在 updateCandidatePhoto() 中计算每张照片到屏幕中心的距离（Math.hypot(x, y)）
- [x] 2.3 选择距离最小的照片，调用 updateCandidateTarget(closest)
- [x] 2.4 处理边界情况：无符合资格照片时设置 candidateTarget 为 null
- [x] 2.5 实现 updateCandidateTarget(newTarget, bypassDebounce) 函数
- [x] 2.6 在 updateCandidateTarget() 中实现防抖逻辑：先检查冷却时间（300ms），再检查距离阈值（0.08 NDC）
- [x] 2.7 在 updateCandidateTarget() 中处理绕过防抖的情况：首次选择（candidateTarget === null）
- [x] 2.8 在 animate() 函数中，仅在 SCATTER 模式下调用 updateCandidatePhoto()
- [x] 2.9 在 animate() 中确保 updateCandidatePhoto() 在 camera.updateMatrixWorld() 之后执行

## 3. 视觉高亮效果

- [x] 3.1 修改 addPhotoToScene() 函数，为边框 Mesh 设置 userData.isBorder = true
- [x] 3.2 修改 addPhotoToScene() 函数，克隆边框材质确保独立性（border.material = border.material.clone()）
- [x] 3.3 修改 addPhotoToScene() 函数，存储基础缩放（group.userData.baseScale = s）
- [x] 3.4 实现 applyHighlight(photoMesh) 函数，查找 userData.isBorder === true 的子 Mesh
- [x] 3.5 在 applyHighlight() 中设置边框 emissiveIntensity = 0.5，emissive.setHex(0xFFD700)
- [x] 3.6 在 applyHighlight() 中设置 userData.targetScale = baseScale * 1.15
- [x] 3.7 实现 removeHighlight(photoMesh) 函数，恢复 emissiveIntensity = 0.05，emissive.setHex(0x443300)
- [x] 3.8 在 removeHighlight() 中恢复 userData.targetScale = baseScale
- [x] 3.9 修改 Particle.update() 方法，添加缩放动画：lerp alpha = Math.min(1, dt / 0.2)
- [x] 3.10 在 Particle.update() 中使用 mesh.scale.lerp(targetScale, alpha) 实现平滑过渡

## 4. FOCUS 模式集成

- [x] 4.1 在 processGestures() 函数中添加 pinchFrameCount 变量（函数外部声明）
- [x] 4.2 修改 FOCUS 模式触发逻辑（约第1801-1807行），要求连续 2 帧检测到 pinchRatio < 0.35
- [x] 4.3 将随机选择算法替换为：if (STATE.candidateTarget) { STATE.focusTarget = STATE.candidateTarget; }
- [x] 4.4 添加空值检查：如果 candidateTarget 为 null，保持 SCATTER 模式，不做任何操作
- [x] 4.5 在 else 分支中重置 pinchFrameCount = 0
- [ ] 4.6 验证 FOCUS 模式展示的照片与 SCATTER 模式高亮的候选照片一致

## 5. 边界情况处理

- [x] 5.1 修改 removePhotoFromScene() 函数，检查被删除照片是否是 candidateTarget
- [x] 5.2 如果是 candidateTarget，调用 removeHighlight() 并设置 candidateTarget = null
- [x] 5.3 如果 SCATTER 模式，立即调用 updateCandidatePhoto() 重新计算候选（绕过防抖）
- [x] 5.4 修改 removePhotoFromScene() 函数，检查被删除照片是否是 focusTarget
- [x] 5.5 如果是 focusTarget，设置 focusTarget = null 并切换到 SCATTER 模式
- [x] 5.6 在 animate() 函数中，检测进入 FIREWORK 模式时清空 candidateTarget
- [x] 5.7 在 animate() 中，FIREWORK 模式下如果 candidateTarget 不为 null，调用 removeHighlight() 并设置为 null
- [ ] 5.8 验证从 FIREWORK 返回 SCATTER 时，updateCandidatePhoto() 自动重新计算候选

## 6. 测试和验证

- [ ] 6.1 测试多张照片场景：握拳旋转场景，验证候选照片实时更新且高亮显示（边框发光 + 缩放）
- [ ] 6.2 测试单张照片场景：验证该照片持续被候选且高亮，防抖不影响
- [ ] 6.3 测试无照片场景：验证 candidateTarget === null，无高亮效果，OK手势保持 SCATTER 模式
- [ ] 6.4 测试候选切换平滑性：快速旋转场景，验证切换间隔 >= 300ms，距离差 >= 0.08 NDC
- [ ] 6.5 测试 FOCUS 模式一致性：验证聚焦的照片与之前高亮的候选照片完全一致
- [ ] 6.6 测试照片动态删除：删除当前候选照片，验证 candidateTarget 清空并重新计算
- [ ] 6.7 测试性能：使用 200 张照片，验证帧率保持 >= 55fps（测试环境：Chrome 最新版，1920x1080，i5-8代）
- [ ] 6.8 测试高亮效果：验证边框 emissiveIntensity === 0.5，缩放 === baseScale * 1.15，Bloom 不过度
- [ ] 6.9 测试模式切换：验证 SCATTER → FOCUS（候选保持），SCATTER → FIREWORK（候选清空），FIREWORK → SCATTER（候选重新计算）
- [ ] 6.10 测试 OK 手势稳定性：验证需要连续 2 帧 pinchRatio < 0.35 才触发 FOCUS
- [ ] 6.11 测试相机后方照片：验证 z >= 1 的照片不被选为候选
- [ ] 6.12 测试材质独立性：验证修改一张照片的边框材质不影响其他照片

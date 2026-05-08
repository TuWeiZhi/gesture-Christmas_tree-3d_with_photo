# 任务清单

## ✅ 已完成

### 1. 状态与配置初始化
- [x] 添加 `STATE.hand.lastRotateX` 字段
- [x] 将 `pinchFrameCount` 重命名为 `focusGestureFrameCount`
- [x] 添加呼吸效果配置常量（HIGHLIGHT_PULSE_SPEED 等）
- [x] 添加旋转控制配置常量（ROTATION_Y_SENSITIVITY 等）

### 2. 辅助函数实现
- [x] 实现 `getPhotoBorder()` - 边框引用缓存
- [x] 实现 `resetHandRotationTracking()` - 重置旋转追踪
- [x] 实现 `updateRotationFromHand()` - 增量旋转计算
- [x] 实现 `isVGesture()` - 比耶手势检测
- [x] 实现 `updateCandidateHighlightPulse()` - 呼吸效果更新

### 3. 核心逻辑重构
- [x] 重构 `applyHighlight()` - 使用配置常量和缓存
- [x] 重构 `removeHighlight()` - 使用配置常量和缓存
- [x] 重构 `processGestures()` - 比耶手势优先判定
- [x] 重构 `processGestures()` - 增量旋转调用
- [x] 重构 `processGestures()` - 完善状态重置逻辑
- [x] 重构 `animate()` - 移除 Y 轴绝对映射
- [x] 重构 `animate()` - 添加呼吸效果调用

### 4. 测试与验证
- [x] 代码静态审查（Codex）
- [x] 前端方案验证（Gemini）
- [x] 架构兼容性检查

## 📝 实施细节

### 文件修改
- `spring_festival.html` (行 535-2047)
  - 状态定义区域：+26 行
  - 辅助函数区域：+93 行
  - 手势处理函数：重构 71 行
  - 动画循环函数：重构 20 行

### 代码统计
- 新增函数：5 个
- 重构函数：4 个
- 新增常量：10 个
- 总变更：约 140 行

## 🎯 验收标准

### 1. 呼吸效果
- [ ] 候选照片边框有明显的金色光晕脉动
- [ ] 脉动周期约 1.4 秒
- [ ] 缩放幅度在 1.15-1.22 之间
- [ ] 不触发 Bloom 泛光

### 2. 连续旋转
- [ ] 握拳向左滑动，画面向左旋转
- [ ] 手离开摄像头范围
- [ ] 手从右侧回来，继续向左滑动
- [ ] 画面从当前角度继续向左旋转（不跳回）

### 3. 比耶手势
- [ ] 做"✌️"手势，候选照片进入 FOCUS
- [ ] 食指和中指必须伸直
- [ ] 无名指和小指必须弯曲
- [ ] 两指必须有间距（不能并拢）
- [ ] 不与握拳/张掌手势冲突

### 4. 边界情况
- [ ] 手快速进出摄像头范围，不产生幽灵旋转
- [ ] 候选照片切换时，呼吸效果正确转移
- [ ] 进入 FOCUS 后，呼吸效果停止
- [ ] 手势快速切换，不产生误触

## 📊 性能指标

- 呼吸效果 CPU 开销：< 0.1ms/frame
- 边框缓存命中率：> 99%
- 手势检测延迟：< 50ms
- 旋转响应延迟：< 33ms（1 摄像头帧）

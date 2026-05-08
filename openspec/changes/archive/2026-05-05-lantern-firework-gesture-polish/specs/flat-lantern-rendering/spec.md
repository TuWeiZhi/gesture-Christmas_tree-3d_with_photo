## ADDED Requirements

### Requirement: Canvas2D flat-style lantern texture generation
系统 SHALL 使用 Canvas2D 在 offscreen canvas (512×512) 上绘制完整灯笼图案，包含：红色椭圆体、金色描边轮廓、金色汉字、底部金色流苏（3-5 条短线）、顶部金色挂钩（弧形）。生成 `THREE.CanvasTexture` 并设置 `colorSpace = THREE.SRGBColorSpace`。

#### Scenario: 灯笼贴图生成
- **WHEN** 调用灯笼创建函数并传入字符（如 "春"）
- **THEN** 返回一个 512×512 的 CanvasTexture，包含红色椭圆体、金色描边、金色字符、金色流苏和挂钩

### Requirement: 4 lanterns with specific characters
系统 SHALL 创建 4 个灯笼，左侧 2 个显示 "春""节"，右侧 2 个显示 "快""乐"。每个灯笼为 `THREE.PlaneGeometry` + 灯笼贴图材质，设置 `transparent: true`、`depthTest: false`、`renderOrder: 999`。

#### Scenario: 灯笼创建与字符分配
- **WHEN** `createLanterns()` 被调用
- **THEN** 场景中出现 4 个灯笼 Plane，左侧显示"春""节"，右侧显示"快""乐"

### Requirement: NDC frustum-anchored positioning
系统 SHALL 通过 `ndcToWorld()` 将 4 个灯笼定位在画面上方区域：左侧 2 个在 NDC x ∈ [-0.85, -0.55] 区域，右侧 2 个在 NDC x ∈ [0.55, 0.85] 区域，y 约 0.75，深度 z=25。窗口 resize 时 MUST 重新计算位置。

#### Scenario: 窗口缩放后灯笼重定位
- **WHEN** 浏览器窗口大小改变
- **THEN** 4 个灯笼重新计算世界坐标，保持在画面上方左右两侧

### Requirement: Horizontal connecting string
系统 SHALL 在每组灯笼（左侧 2 个、右侧 2 个）顶部之间绘制水平连接线（`THREE.Line`），线条从画面边缘延伸经过两个灯笼顶部。线条颜色为暗金色，`depthTest: false`。窗口 resize 时 MUST 跟随灯笼位置更新。

#### Scenario: 连接线跟随灯笼
- **WHEN** 灯笼位置因 resize 而更新
- **THEN** 连接线端点同步更新

### Requirement: Gentle swaying animation
系统 SHALL 为每个灯笼施加轻微左右摇摆动画：position.x 偏移 `sin(time * 0.85 + phase) * amplitude`，rotation.z 偏移 `sin(time * 0.85 + phase) * 0.12`。每个灯笼的 phase 和 amplitude 随机化以避免同步。

#### Scenario: 灯笼摇摆独立性
- **WHEN** 动画循环运行
- **THEN** 4 个灯笼各自独立摇摆，不同步

### Requirement: Remove 福 character
系统 SHALL 移除灯笼中的"福"字。`createLanterns()` 不再生成任何包含"福"字的灯笼。

#### Scenario: 无福字灯笼
- **WHEN** 场景初始化完成
- **THEN** 场景中不存在显示"福"字的灯笼或装饰物

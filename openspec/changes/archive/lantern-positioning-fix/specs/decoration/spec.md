## MODIFIED Requirements

### Requirement: Camera matrix initialization for correct NDC projection
系统 SHALL 在 `initThree()` 函数中相机位置设置后立即调用 `camera.updateMatrixWorld(true)`，并在 `ndcToWorld()` 函数开始处同样调用 `camera.updateMatrixWorld(true)`。此修复确保 `unproject()` 使用最新的相机变换矩阵，避免灯笼定位因矩阵过期而聚集在屏幕中心。

**约束**：
- Three.js 版本：`three@0.160.0`（项目已锁定）
- `updateMatrixWorld(true)` 参数 `true` 强制递归更新子对象

#### Scenario: 灯笼正确定位在页面初始加载
- **WHEN** 用户打开使用自定义证书的 HTML 页面
- **THEN** 四个灯笼正确分布在屏幕四角位置
- **AND** 灯笼不会聚集在浏览器中央

#### Scenario: 窗口缩放后灯笼保持正确位置
- **GIVEN** 灯笼已正确定位在场景中
- **WHEN** 用户调整浏览器窗口大小
- **THEN** `camera.updateProjectionMatrix()` 被调用
- **AND** `repositionLanterns()` 重新计算所有灯笼位置
- **AND** 灯笼保持在屏幕四角区域

---

### Requirement: Arc-shaped corner layout configuration
系统 SHALL 将灯笼布局配置改为弧形垂挂：外层灯笼（春、乐）NDC Y 坐标为 0.90，内层灯笼（节、快）NDC Y 坐标为 0.84；NDC X 坐标分别为 -0.92、-0.72、0.72、0.92；`targetZ` 从 25 改为 35 以增强前景存在感。

**约束**：
- 基础 NDC 坐标：`LANTERN_BASE_NDC = [[-0.92, 0.90], [-0.72, 0.84], [0.72, 0.84], [0.92, 0.90]]`
- 竖屏模式（aspect < 1.0）：动态限制 X 坐标为 `clamp(x, -0.85, 0.85)`
- `LANTERN_TARGET_Z = 35`
- 每个灯笼的缩放：外层 1.00，内层 0.94

#### Scenario: 灯笼呈现优雅弧形布局
- **WHEN** 灯笼定位系统执行 `repositionLanterns()`
- **THEN** 左侧灯笼（春、节）位于左上角区域
- **AND** 右侧灯笼（快、乐）位于右上角区域
- **AND** 外层灯笼（春、乐）位置略高于内层灯笼（节、快）
- **AND** 整体形成优雅的弧线而非水平直线

#### Scenario: 竖屏模式动态适配
- **GIVEN** 浏览器窗口宽高比小于 1.0（竖屏）
- **WHEN** 执行 `repositionLanterns()`
- **THEN** NDC X 坐标被限制在 ±0.85 范围内
- **AND** 灯笼不会被屏幕边缘切割
- **AND** 灯笼不与中央标题重叠

---

## ADDED Requirements

### Requirement: Realistic PNG texture loading with cascading fallback
系统 SHALL 实现三级回退链加载策略：主源（Wikimedia Commons）→ 备用源（pngimg.com）→ Canvas 绘制。使用 `THREE.TextureLoader` 设置 `crossOrigin = 'anonymous'`。所有纹理请求 MUST 在 8 秒内完成，否则触发下一级回退。加载成功后纹理 MUST 缓存在共享 Map 中供四个灯笼复用。

**约束**：
- 主源 URL：`https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Chinese_Lantern.png/800px-Chinese_Lantern.png`
- 备用源 URL：`https://pngimg.com/uploads/chinese_new_year/chinese_new_year_PNG88.png`
- 超时阈值：8000ms
- 缓存结构：`Map<url, Promise<Texture>>`
- 生命周期：等待纹理加载完成后再将灯笼 Group 添加到 scene

**失败触发条件**：
- CORS `SecurityError`
- 网络 `Error` 事件
- 8 秒超时
- 图片解码失败

#### Scenario: 从主CDN成功加载
- **GIVEN** 网络连接正常且 Wikimedia CDN 可访问
- **WHEN** 系统请求灯笼纹理
- **THEN** 从 Wikimedia 加载 800x600 PNG 图片
- **AND** 纹理缓存存储成功结果
- **AND** 四个灯笼共享同一纹理实例
- **AND** 灯笼显示真实质感纹理

#### Scenario: 主源失败回退到备用源
- **GIVEN** Wikimedia CDN 请求失败（CORS/网络/超时）
- **WHEN** 主源加载触发错误回调
- **THEN** 立即请求备用源（pngimg.com）
- **AND** 备用源加载成功后使用其纹理
- **AND** 控制台记录回退事件（警告级别）

#### Scenario: 双源失败回退到Canvas
- **GIVEN** 主源和备用源均失败
- **WHEN** 备用源加载触发错误回调
- **THEN** 调用 `drawLanternCanvas(char)` 生成 Canvas 纹理
- **AND** Canvas 纹理包含完整灯笼图案（含字符）
- **AND** 不添加额外的字符徽章 Mesh
- **AND** 控制台记录回退事件（信息级别）

---

### Requirement: Lantern Group structure with child elements
系统 SHALL 为每个灯笼创建 `THREE.Group` 容器，包含三个子元素：body Mesh（灯笼主体）、glow Sprite（后置光晕）、badge Mesh（前置字符徽章，仅PNG纹理时）。动画和定位操作应用于 Group 级别，确保所有子元素同步运动。

**约束**：
- Group 结构：`lanternGroup = { body, glow, badge? }`
- body：`PlaneGeometry(3.1, 4.8)` + PNG/Canvas 纹理
- glow：`Sprite` + 径向渐变纹理，位置 `y = -2.65`
- badge：`PlaneGeometry(0.9, 0.9)` + Canvas 字符纹理，位置 `y = -2.3, z = 0.02`（仅PNG）
- renderOrder：glow=997, body=999, badge=1000
- PNG纹理时：添加badge；Canvas回退时：不添加badge（Canvas已含字符）

#### Scenario: Group结构正确创建
- **WHEN** `createLantern(char, imageUrl)` 被调用
- **THEN** 返回包含 body、glow 的 Group
- **AND** 若使用PNG纹理，额外添加 badge 子元素
- **AND** 所有子元素的 renderOrder 正确设置

#### Scenario: 动画应用于Group级别
- **GIVEN** lantern Group 已添加到 scene
- **WHEN** 执行 `updateDecorations(dt)`
- **THEN** position 和 rotation 修改应用于 Group
- **AND** body、glow、badge 同步运动
- **AND** 无需单独更新子元素

---

### Requirement: Gentle floating sway animation with separated parameters
系统 SHALL 实现轻柔漂浮式摇摆动画，使用分离的平移幅度和倾斜幅度参数。动画公式：主摆动 `sin(time * speed + phase) * transAmp`，次级谐波 `sin(time * speed * 2.1 + phase * 1.3) * transAmp * 0.22`，垂直浮动 `sin(time * 0.55 + phase) * floatAmp`，轻微 3D 摇晃 `rotation.y = sin(time * speed * 0.45 + phase) * 0.035`，倾斜 `rotation.z = restTilt + sin(time * speed + phase) * tiltAmp`。

**约束**：
- `swayOffset`：相位偏移，范围 `[0, 2π)`
- `transAmp`：平移幅度（世界单位），范围 `[0.09, 0.11]`
- `tiltAmp`：倾斜幅度（弧度），范围 `[0.08, 0.12]`
- `swaySpeed`：摇摆频率，范围 `[0.78, 0.88]`
- `floatAmp`：浮动幅度，范围 `[0.035, 0.047]`
- `restTilt`：静止倾斜，范围 `[-0.08, 0.08]`
- 采样策略：每个灯笼创建时采样一次，存储在 `userData`，resize时不重新采样

#### Scenario: 摇摆动画自然流畅
- **GIVEN** 灯笼装饰物已显示在场景中
- **WHEN** 动画循环运行数秒
- **THEN** 灯笼摇摆动作轻柔自然
- **AND** 无突兀或机械感明显的运动
- **AND** 每个灯笼的时序和幅度略有差异
- **AND** 整体呈现悬挂于微风中漂浮的感觉

#### Scenario: 参数在创建时采样一次
- **WHEN** `createLanterns()` 创建灯笼
- **THEN** 每个灯笼的动画参数随机采样并存储在 `userData`
- **AND** 后续动画帧使用存储的参数
- **AND** 窗口 resize 不会改变动画参数

---

### Requirement: Warm radial glow sprite
系统 SHALL 在每个灯笼 Group 中创建暖橙色径向渐变光晕 Sprite（颜色 `0xffb56a`，不透明度 0.24，尺寸 4.4×5.9），位置为 `y = -2.65`（相对于 Group 中心），`renderOrder = 997`（在灯笼 body 之后渲染）。光晕纹理 MUST 缓存为单例供所有灯笼共享。

**约束**：
- 颜色：`0xffb56a`（暖橙色）
- 不透明度：`0.24`
- 尺寸：`scale.set(4.4, 5.9, 1)`
- 位置：`position.set(0, -2.65, 0)`
- renderOrder：`997`
- 深度设置：`depthTest: false, depthWrite: false`
- 纹理缓存：全局单例 `getLanternGlowTexture()`

#### Scenario: 光晕增强视觉氛围
- **GIVEN** 灯笼显示在深色背景前
- **WHEN** 用户查看灯笼装饰
- **THEN** 每个灯笼后方有微妙的暖色光晕
- **AND** 光晕不会过度遮挡灯笼纹理
- **AND** 所有灯笼共享同一光晕纹理实例

---

### Requirement: Character badge overlay (PNG texture only)
系统 SHALL 为 PNG 纹理灯笼创建单独的字符徽章 Mesh（使用 `drawLanternBadgeCanvas(char)` 函数），尺寸 0.9×0.9，位置 `x=0, y=-2.3, z=0.02`（略微靠前），`renderOrder = 1000`（最高渲染优先级）。Canvas 回退时 MUST NOT 添加徽章（Canvas 已包含字符）。

**约束**：
- 创建条件：`if (textureSource === 'png')`
- 几何体：`PlaneGeometry(0.9, 0.9)`
- 纹理：`drawLanternBadgeCanvas(char)` 返回的 CanvasTexture
- 位置：`position.set(0, -2.3, 0.02)`
- renderOrder：`1000`
- 深度设置：`depthTest: false, depthWrite: false`

#### Scenario: PNG纹理时显示字符徽章
- **GIVEN** 灯笼使用 PNG 纹理
- **WHEN** 灯笼 Group 创建完成
- **THEN** Group 包含字符徽章 Mesh
- **AND** 徽章显示中文字符（春/节/快/乐）
- **AND** 徽章位于灯笼主体前方

#### Scenario: Canvas回退时不显示徽章
- **GIVEN** 灯笼使用 Canvas 纹理（回退模式）
- **WHEN** 灯笼 Group 创建完成
- **THEN** Group 不包含字符徽章 Mesh
- **AND** 字符直接显示在 Canvas 纹理中

---

## Property-Based Testing Properties

### PBT-001: Lantern Position Invariant
**属性**：灯笼的世界坐标位置 MUST 满足 NDC 边界约束

**数学描述**：
```
∀ lantern ∈ lanterns:
  ndc = worldToNDC(lantern.position)
  aspect = windowWidth / windowHeight
  if aspect < 1.0:
    assert(ndc.x ∈ [-0.85, 0.85])
  else:
    assert(ndc.x ∈ [-0.92, 0.92])
  assert(ndc.y ∈ [0.84, 0.90])
```

**证伪策略**：
1. 生成随机窗口尺寸（320×480 到 3840×2160）
2. 调用 `repositionLanterns()`
3. 计算每个灯笼的 NDC 坐标
4. 验证是否在允许范围内
5. 边界情况：极端宽高比（0.5, 2.0）

---

### PBT-002: Texture Loading Monotonicity
**属性**：纹理加载状态只能从 pending → success 或 pending → failure，不能逆向

**数学描述**：
```
∀ texture ∈ textureCache:
  stateTransition ∈ {
    (pending → success),
    (pending → failure),
    (pending → pending)  // 超时前
  }
  stateTransition ∉ {
    (success → pending),
    (success → failure),
    (failure → pending),
    (failure → success)
  }
```

**证伪策略**：
1. 模拟网络延迟和失败场景
2. 多次调用纹理加载
3. 验证状态转换的单向性
4. 边界情况：8秒超时边界、CORS 错误

---

### PBT-003: Sway Animation Boundedness
**属性**：灯笼摇摆位移 MUST 始终在定义的幅度范围内

**数学描述**：
```
∀ lantern, ∀ t ∈ time:
  dx = |lantern.position.x - lantern.userData.anchor.x|
  dy = |lantern.position.y - lantern.userData.anchor.y|
  dRotZ = |lantern.rotation.z - lantern.userData.restTilt|

  assert(dx ≤ transAmp × 1.5)  // 允许谐波叠加
  assert(dy ≤ floatAmp × 1.5)
  assert(dRotZ ≤ tiltAmp × 1.5)
```

**证伪策略**：
1. 随机采样动画参数
2. 模拟 10000 帧动画
3. 验证位移永不超出边界
4. 边界情况：极端参数组合（所有参数取最大值）

---

### PBT-004: Group Synchronization Invariant
**属性**：Group 的 position/rotation 变化 MUST 同步应用于所有子元素

**数学描述**：
```
∀ lanternGroup, ∀ child ∈ lanternGroup.children:
  childWorldPos = lanternGroup.position + child.localPosition
  assert(|childWorldPos - expectedChildPos| < ε)
```

**证伪策略**：
1. 创建包含 body/glow/badge 的 Group
2. 应用 1000 次随机 position/rotation 变化
3. 验证子元素的世界坐标符合预期
4. 边界情况：大幅度旋转（接近 ±π/4）

---

### PBT-005: Render Order Total Ordering
**属性**：所有灯笼相关元素的 renderOrder MUST 形成严格的全序

**数学描述**：
```
renderOrderSequence = [
  photoBorder: 998,
  photoBody: 999,
  lanternGlow: 997,
  lanternBody: 999,
  lanternBadge: 1000
]
assert ∀ i < j: renderOrderSequence[i] ≤ renderOrderSequence[j]
```

**证伪策略**：
1. 收集所有可渲染元素的 renderOrder
2. 验证 lantern 系列元素不与现有 photo 元素冲突
3. 验证 lantern 内部元素顺序正确
4. 边界情况：添加新元素时的顺序维护

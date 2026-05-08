# 待验证清单

记录已实施但未在浏览器中手动验证的功能。**阻塞原因**：用户暂无摄像头，无法触发手势识别。

恢复验证后请逐项核对，通过后将本文件对应小节移除（或整体删除），并归档对应的 OpenSpec change。

---

## A. focus-cycle-navigation (2026-05-06 实施,本次会话)

**位置**: `spring_festival.html` line 2025-2043 (FOCUS 进入循环)、line 1810-1816 (照片删除索引修正)

**改动摘要**: 删除候选呼吸/边框高亮视觉效果；FOCUS 改为手势驱动顺序循环；保留 candidateTarget 仅作首次进入起点的内部数据。

**未正式建 OpenSpec change**: 改动小且属于 `predictable-photo-selection` 的反向精简,直接记录在 archive/2026-05-06-predictable-photo-selection-superseded/STATUS.md。如恢复正式流程,可补建。

### 验证步骤

| # | 操作 | 期望 |
|---|---|---|
| 1 | SCATTER 模式下做"✌️"持续 ≥2 帧 | 进入 FOCUS,展示**屏幕中心最近的那张**(首次起点 = candidate) |
| 2 | 释放比耶 → 等 ≥2 帧 | 自动退出回 SCATTER |
| 3 | 再做"✌️" | 进入 FOCUS,展示**下一张**(顺序循环) |
| 4 | 重复 #3 至循环一周 | 到末尾后回到第 1 张 |
| 5 | FOCUS 模式下做握拳 / 张掌 | 立即退出到 SCATTER / FIREWORK |
| 6 | 进 FOCUS → 退 → 进 FIREWORK → 退 → 再做比耶 | focusIndex 持久,展示**循环序列下一张**(不重置) |
| 7 | 候选不为空时**首次**进 FOCUS | 起点 = 屏幕中心那张;之后顺序循环 |
| 8 | 当前焦点为 photos[N], 从 UI 删除 photos[0] | 下次进 FOCUS 仍展示原 photos[N+1] (cursor 已位移) |
| 9 | focusIndex=0 时删除 photos[0] (Codex 发现的 bug 修复点) | 下次进 FOCUS 重新以候选/photos[0] 为起点,不跳过新 photos[0] |
| 10 | 删空所有照片再做比耶 | 保持 SCATTER, 无报错 |
| 11 | DevTools 检查照片边框 | emissive 无变化、scale 始终 = baseScale·2.5, 无残留高亮副作用 |

---

## B. gesture-interaction-improvements (changes/gesture-interaction-improvements/)

**实施状态**: 全部代码完成。**但呼吸效果一项已被 A 节 supersession 删除**, 该项验证不再适用。

### 仍需验证的项

| # | 操作 | 期望 | 失败征兆 |
|---|---|---|---|
| B1 | 握拳从屏幕中心向左滑、出画面, 从右侧回来再向左滑 | 场景**继续向左**旋转,不跳回 | 跳回原角度 → lastRotateX 未在手势丢失时重置 |
| B2 | 快速将手扇出/扇入摄像头边缘 | 无"幽灵旋转",旋转停止时画面静止 | 出现非用户意图的旋转 → handSize<0.02 未触发 reset |
| B3 | 做"✌️"(食/中指伸直、其余弯曲、两指张开)保持 ≥2 帧 | 进入 FOCUS | 不响应或误判为张掌 → isVGesture 阈值过严/过宽 |
| B4 | 食/中指**并拢**做出 V 字 | **不应**进入 FOCUS(被两指间距判据排除) | 仍进入 FOCUS → 间距阈值检测失效 |
| B5 | DevTools Performance tab 录制 5s | 帧率稳定 ≥55fps | 帧率掉到 < 50fps |

### 失效的验证项 (已随 A 节删除)

- ~~呼吸效果(候选金边脉动 1.4s 周期)~~ — 代码已删
- ~~呼吸停止于 FOCUS~~ — 代码已删
- ~~Bloom 阈值 (emissive 不超过 0.75)~~ — 高亮代码已删

---


---

## D. firework-gesture-sensitivity (2026-05-07 实施)

**位置**: `spring_festival.html`
- 常量声明: line 552 (`fireworkGestureFrameCount`)、line 564 (`FIREWORK_ENTER_FRAMES`)、line 567-568 (阈值)
- 重置路径: line 2009 (no-hand) / line 2029 (handSize<0.02) / line 2064 (vGesture true) / line 2099 (SCATTER 区) / line 2114 (dead zone 非 candidate)
- 候选计算: line 2050-2053
- 进入累计: line 2104-2113

**改动摘要**:
- `FIREWORK_EXTENSION_THRESHOLD` 从 `1.85` 降为 `1.65`(原值要求四指完全平行摄像头才能触发,实测平均不可达)
- 新增 `FIREWORK_ENTER_FRAMES = 2` + `fireworkGestureFrameCount`,与 FOCUS 防抖模式对齐,防止单帧尖峰直接锁定 FIREWORK
- 新增 per-finger 刚性下限 `FIREWORK_MIN_FINGER_THRESHOLD = 1.25`,要求四指尖各自距腕 >handSize·1.25,防止单指拉高均值误触
- SCATTER/FOCUS 分支零改动,SCATTER 阈值 1.45 不变,死区由 `[1.45, 1.85]` 收窄为 `[1.45, 1.65]`

### 验证步骤

| # | 操作 | 期望 | 失败征兆 |
|---|---|---|---|
| D1 | 自然张开手掌(略松弛、非完全绷直)持 ≥2 帧 | 进入 FIREWORK | 不进 → 阈值仍偏严或 per-finger 1.25 卡住 pinky |
| D2 | 完全张开手掌然后稍微弯曲手指 | 仍保持 FIREWORK(在 [1.45,1.65] 死区内) | 立即跳回 SCATTER → 死区失效 |
| D3 | 单帧把手伸直然后立即握拳(<2 帧停留) | **不应**进入 FIREWORK | 进入 → 帧累计未生效 |
| D4 | 张掌时只伸中指、其他指弯曲(模拟均值偶然过线) | **不应**进入 FIREWORK | 进入 → per-finger guard 失效 |
| D5 | SCATTER ↔ FIREWORK 边界附近(extensionRatio≈1.55)缓慢移动 | 不闪烁,保持当前 mode | 频繁跳变 → 死区失效 |
| D6 | 比耶 → 释放 → 立即张掌 | FOCUS 退出后再 2 帧才进 FIREWORK(不是同帧瞬切) | 同帧瞬切 → 计数器残值 |
| D7 | 比耶切换 FOCUS 期间 | FOCUS 行为完全不变,无副作用 | FOCUS 异常 → vGesture 分支清零干扰 |
| D8 | 握拳深度握(extensionRatio<1.0) | 立即 SCATTER | 不退出 → SCATTER 阈值被影响 |
| D9 | DevTools 监控 `debugInfo` 文本 `Ext` 字段 | 张掌时通常 1.65~1.85,完全绷直时 >1.85 | 数值异常偏低 → handSize 计算异常 |
| D10 | 整体测 30 秒交替三种手势 | 三模式切换灵敏、不抖、不误触 | 任一异常 → 报告 D# 编号定位 |

### 调参提示

如仍偏钝:`FIREWORK_EXTENSION_THRESHOLD` 可降到 `1.62`(不要先动 SCATTER 侧)
如误触发:`FIREWORK_MIN_FINGER_THRESHOLD` 抬到 `1.30`,或 `FIREWORK_ENTER_FRAMES` 抬到 `3`

---

## C. firework-visuals-realistic (2026-05-06 实施,本次会话)

**位置**: `spring_festival.html`
- CONFIG.firework.colors/types: line 511-528
- FIREWORK_FS shader: line ~1100-1117
- Explosion.TYPE_TABLE / SUB_CONFIG: line ~1115-1130
- _initParticles / _getDirection / update / _updateTrails: 内联

**改动摘要**:
- 调色板换为真实金属盐光谱: Sr 红 / Ba 绿 / Cu 蓝 / Na 黄 / Mg 白 / Sr+Cu 紫 / Sr+Na 橙 / 金 (8 色)
- 类型从 6 改 8: 移除 HEART/DOUBLE,新增 PALM/CROSSETTE/STROBE/PISTIL,保留 PEONY/CHRYSANTHEMUM/WILLOW/RING
- Fragment shader 重写: 强亮内核 (pow(1-r, 25)*2.5) + 软光晕 (pow(1-r, 4)) + HDR 输出 (vColor*3.0) 让粒子超过 Bloom threshold 0.95 自然发光,不需调全局 bloom
- Strobe 频率从 sin(uTime*10)~1.6Hz 提到 sin(uTime*45)~7Hz,真实闪烁感
- 粒子色 lightness 从 lerp(0.8→0.4) 反向调暗修正为 0.78~0.90 均匀亮
- 类型化物理: gravity (0.012 willow ~5.5 palm) / drag / 速度 / 寿命 / sparkle 比例 / trail 寿命全表驱动
- PISTIL: 70% 外壳 + 30% 内核 (不同色,半速,稍小)
- CROSSETTE: 复用 secondStageTriggered 机制,8 弧分裂
- WILLOW: 长寿命 5.5s + 极轻重力 1.2 + 长 trail 1.6s,模拟金线下垂
- PALM: 上抛冲量 (y > 0.55) + 强重力 5.5 + spread, 模拟棕榈树形

### 验证步骤

| # | 操作 | 期望表现 | 失败征兆 |
|---|---|---|---|
| C1 | 张掌进入 FIREWORK 模式,观察 30 秒 | 看到 6+ 种不同形态的烟花交替出现 | 全是球形 → 类型 dispatch 失效 |
| C2 | 出现 WILLOW 型时观察 | 短时间散开后金线下垂,持续 5+ 秒 | 一闪即逝 / 无下垂感 → trailLife/life 不对 |
| C3 | 出现 PALM 型时观察 | 明显上抛后向下散开成"叶片",树状轮廓 | 球形对称 → direction 函数失效 |
| C4 | 出现 STROBE 型时观察 | 粒子高频闪烁(每秒约 7 次),不连续发光 | 平滑发光 → blink shader 未触发 |
| C5 | 出现 CROSSETTE 型时观察 | 飞出后约一半时间二次分裂成多个小爆 | 单次爆炸 → secondStageTriggered 触发条件未生效 |
| C6 | 出现 PISTIL 型时观察 | 外圈大花瓣 + 中央较小且不同色花心 | 单层 → pistilStart/pistilColor 逻辑未生效 |
| C7 | 出现 RING 型时观察 | 平面圆环展开,非球形 | 球形 → direction 未限制到 xz 平面 |
| C8 | 任意烟花的颜色 | 红/绿/蓝/黄/紫/橙等纯度高的金属盐色,非杂色 | 暗淡/泛白 → palette 未替换或 lightness 未修正 |
| C9 | 任意烟花的发光强度 | 粒子亮度明显比改前更"耀眼"(HDR + bloom 触发) | 同改前一样发暗 → vColor*3.0 HDR 未生效 |
| C10 | DevTools Performance 录 5 秒 (FIREWORK 模式) | 帧率 ≥45fps,粒子数峰值 < 6000 | 严重掉帧 → count 太大,需调 TYPE_TABLE.count |
| C11 | 检查照片是否仍正常显示(与改前一致) | 照片不会因 firework HDR 改动而过曝 | 照片发白 → bloom threshold 失效或材质泄漏 |
| C12 | DevTools Console 检查 `Explosion.TYPE_TABLE` | 8 个类型 + SUB_CONFIG 都存在 | undefined → 静态字段写入异常 |

### 调参提示 (无需测试,仅参考)

如果验证后觉得某类型需调:
- 太大/太密 → 减 `count` 或 `baseSize`
- 拖尾过长/过短 → 调 `trailLife`
- 下落太快/太慢 → 调 `gravity`
- 颜色饱和度不足 → 加 lightness 范围下限到 0.82
- HDR 过曝 → fragment shader `vColor * 3.0` 改为 `vColor * 2.0`

---

## 工作流

1. 用户拿到摄像头后逐项执行 A / B / C / D 四组验证
2. 每项打勾或记录 issue
3. 通过则:
   - A 节通过 → 删除本文件 A 节;改动已合入主代码,无需归档
   - B 节通过 → 把 `changes/gesture-interaction-improvements/` 移到 `archive/2026-XX-XX-gesture-interaction-improvements/`,或合并 spec 到主 specs
   - C 节通过 → 删除本文件 C 节;改动已合入主代码,无需归档
   - D 节通过 → 删除本文件 D 节;改动已合入主代码,无需归档
4. 不通过 → 把失败项编号(A1/B3/C5/D2...)告诉 Claude,定位修复

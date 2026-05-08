## MODIFIED Requirements

### Requirement: Auto-fallback to SCATTER on gesture loss
`processGestures()` 函数 SHALL 在未检测到手部 landmark 时（`result.landmarks` 为空或长度为 0），自动将 `STATE.mode` 设置为 `'SCATTER'` 并清除 `STATE.focusTarget`。

#### Scenario: 手势丢失回退
- **WHEN** 摄像头连续帧未检测到手部
- **THEN** STATE.mode 自动变为 'SCATTER'，STATE.focusTarget 为 null

#### Scenario: 从 FIREWORK 模式丢失手势
- **WHEN** 用户在 FIREWORK 模式中将手移出摄像头范围
- **THEN** 模式自动切换到 SCATTER，烟花停止发射，场景粒子淡入恢复显示

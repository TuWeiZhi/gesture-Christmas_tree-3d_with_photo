## MODIFIED Requirements

### Requirement: FOCUS 模式照片选择使用候选照片系统
`spring_festival.html` 的 FOCUS 模式（OK手势/捏合）SHALL 使用候选照片系统选择要聚焦的照片，而非随机选择算法。

#### Scenario: 用户从 SCATTER 进入 FOCUS 模式
- **WHEN** 用户在 SCATTER 模式下做 OK 手势（捏合，pinchRatio < 0.35）
- **THEN** 系统检查当前候选照片（STATE.candidateTarget）
- **THEN** 如果候选照片存在，系统将其设置为 FOCUS 目标（STATE.focusTarget = STATE.candidateTarget）
- **THEN** 如果候选照片不存在（null），系统不进入 FOCUS 模式或保持当前状态

#### Scenario: FOCUS 模式展示的照片与候选一致
- **WHEN** 用户在 SCATTER 模式下看到高亮的候选照片
- **THEN** 用户做 OK 手势后，聚焦展示的照片与之前高亮的候选照片完全一致
- **THEN** 用户体验到可预测的照片选择行为

#### Scenario: 无候选照片时 OK 手势无效
- **WHEN** 场景中没有照片（photoDataArray 为空）
- **THEN** 候选照片为 null
- **THEN** 用户做 OK 手势时，系统不进入 FOCUS 模式
- **THEN** 系统保持在 SCATTER 模式

#### Scenario: 单张照片时 FOCUS 行为一致
- **WHEN** 场景中只有1张照片
- **THEN** 该照片持续被选为候选照片
- **THEN** 用户做 OK 手势时，系统聚焦该照片
- **THEN** 行为与多张照片时一致

## REMOVED Requirements

无移除的需求。

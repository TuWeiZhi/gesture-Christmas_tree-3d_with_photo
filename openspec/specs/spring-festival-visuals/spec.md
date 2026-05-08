# spring-festival-visuals Specification

## Purpose

约束 `spring_festival.html`（春节版 3D 树单页）的视觉装饰边界：禁止出现灯笼相关对象、资源与文字；保留既有的烟花、雪花、粒子树、照片、手势、UI 与标题。

## Requirements

### Requirement: 春节版页面不得渲染灯笼装饰

`spring_festival.html` 在加载与运行期间 SHALL NOT 创建、加载或显示任何灯笼相关的 3D 对象、贴图、连接线或摆动动画。

#### Scenario: 页面初始加载无灯笼

- **WHEN** 用户打开 `spring_festival.html`
- **THEN** 场景中不存在任何灯笼 Mesh/Sprite
- **AND** 浏览器 Network 面板不发出对 `upload.wikimedia.org` 或 `pngimg.com` 的灯笼贴图请求
- **AND** 控制台无 `[Lantern]` 前缀日志

#### Scenario: 窗口 resize 不触发灯笼重布局

- **WHEN** 用户调整浏览器窗口尺寸
- **THEN** 不调用任何灯笼位置更新逻辑
- **AND** 不抛出 JavaScript 错误

### Requirement: 灯笼文字不得出现

春节版页面 SHALL NOT 显示 "春"、"节"、"快"、"乐" 四字组成的灯笼文字贴图。

#### Scenario: 画面无中文灯笼文字

- **WHEN** 页面完成加载
- **THEN** 场景中不存在通过 canvas 或图片生成的 "春/节/快/乐" 字符贴图
- **AND** 源码 `grep -E "lantern|Lantern|灯笼|LANTERN"` 在 `spring_festival.html` 中返回 0 行

### Requirement: 其他春节版视觉元素保持不变

移除灯笼 SHALL NOT 影响烟花、雪花、粒子圣诞/春节树、照片挂载、手势识别与现有 UI 控件；既有标题 SHALL 保持原样。

#### Scenario: 烟花/雪花/树/照片/手势功能正常

- **WHEN** 用户在移除灯笼后正常交互（上传照片、张手炸裂、握拳聚合、触发烟花）
- **THEN** 所有既有功能行为与移除前一致
- **AND** H 键仍可隐藏 UI

#### Scenario: 屏幕顶部标题保留

- **WHEN** 页面加载完成
- **THEN** 顶部保留 `<h1>Happy Spring Festival</h1>` 文案
- **AND** `<title>` 保留为 `Grand Luxury Tree - Spring Festival Edition`

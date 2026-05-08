## Why

当前 `spring_festival.html`（春节版 3D 树单页）在画面顶部悬挂了 4 个中文灯笼（"春/节/快/乐"），用户决定完全去除灯笼装饰及其承载的中文文字，以简化画面并删除冗余代码路径（外链贴图、canvas 回退、摆动动画、resize 重布局）。

## What Changes

- **BREAKING**: 移除 `spring_festival.html` 中的全部灯笼功能与资源引用
- 删除常量 `LANTERN_TARGET_Z` / `LANTERN_LAYOUT` / `LANTERN_IMAGE_URL` / `LANTERN_FALLBACK_URL` / `TEXTURE_TIMEOUT`
- 删除全局变量 `lanternLines`、`decorations`
- 删除函数 `loadLanternTexture` / `getLanternGlowTexture` / `drawLanternBadgeCanvas` / `drawLanternCanvas` / `createLantern` / `createLanterns` / `createLanternLines` / `repositionLanterns` / `updateDecorations`
- 移除 `init()` 内 `await createLanterns()` 调用
- 移除 resize handler 内 `repositionLanterns()` 调用
- 移除动画循环内 `updateDecorations(dt)` 调用（若存在）
- 归档已被推翻的 `lantern-positioning-fix` 变更

## Impact

- Affected specs: `spring-festival-visuals`（新建，覆盖春节版视觉装饰约束）
- Affected code: `spring_festival.html`（单文件）
- Affected openspec changes: `lantern-positioning-fix`（归档）
- 对烟花、雪花、粒子树、照片系统、手势识别、UI 控件、`<h1>Happy Spring Festival</h1>` 标题均无影响

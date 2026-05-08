## 1. 代码删除

- [x] 1.1 删除 `spring_festival.html` 535–544 行：常量 `LANTERN_TARGET_Z`、`LANTERN_LAYOUT`、`LANTERN_IMAGE_URL`、`LANTERN_FALLBACK_URL`、`TEXTURE_TIMEOUT`
- [x] 1.2 删除 565–566 行：`const decorations = []` 与 `let lanternLines = []`
- [x] 1.3 删除 `init()` 内 `await createLanterns();` 调用
- [x] 1.4 删除函数定义：`loadLanternTexture`、`getLanternGlowTexture`、`drawLanternBadgeCanvas`、`drawLanternCanvas`、`createLantern`、`createLanterns`、`createLanternLines`、`repositionLanterns`
- [x] 1.5 删除 `updateDecorations(dt)` 函数整体（仅灯笼使用）及其调用点
- [x] 1.6 删除 resize 回调中 `repositionLanterns()` 调用（约 2131 行）

## 2. 验收

- [x] 2.1 `grep -E "lantern|Lantern|灯笼|LANTERN|decorations|TEXTURE_TIMEOUT" spring_festival.html` 返回 0 行
- [x] 2.2 浏览器打开页面无 JS 报错，Network 面板无 Wikipedia/pngimg 灯笼贴图请求
- [x] 2.3 烟花、雪花、粒子树、照片上传/管理、手势识别、H 键隐藏 UI 功能全部正常
- [x] 2.4 窗口 resize 不抛异常

## 3. Spec 同步

- [x] 3.1 归档 `openspec/changes/lantern-positioning-fix`

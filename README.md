# 新年烟花相册（Photo Fireworks）

把照片点燃成烟花：爆炸粒子颜色来自照片采样，并在爆炸后短暂用粒子拼出照片的马赛克轮廓。手机与 iPad 优先适配。

## 功能

- 手势连发：张开手掌连发烟花；握拳停止；捏合点燃照片烟花
- 照片烟花：颜色采样调色板 + “马赛克轮廓”短暂显形
- 图片来源：支持 `./images/` + `images.json` 自动加载，或页面内直接上传文件/文件夹
- 无摄像头模式：点击/触摸屏幕放烟花

## 入口

- 入口页：`index.html`
- 主页面：`fireworks.html`

## 运行

由于使用了 ES Modules，必须通过本地服务器访问。

### 方式 1：Python

```bash
python -m http.server 8000
```

浏览器访问 `http://localhost:8000/`。

### 方式 2：Node.js

```bash
npx http-server .
```

### 手机/iPad（推荐）

手机端摄像头更依赖 HTTPS 环境，请参考：`HTTPS_SETUP_GUIDE.md`

## 批量加载图片（可选）

1. 创建 `./images/` 并放入你的照片
2. 运行：

```bash
npm run build:images
```

会生成 `images.json`，页面将优先读取它来加载任意文件名/子目录的图片。


# TK Wallpaper 项目当前记录

日期：2026-06-10

## 本轮已完成

- AI 定制页子类目改为独立导航，并在最前面增加 `All`。
- `All` 会聚合全部 AI 定制样品，包括文生图、图生图、图生视频、AI 视频人物替换、AI 双人合影。
- AI 定制页隐藏静态/动态壁纸的通用分类栏，避免被旧分类过滤导致刷新后看不到内容。
- 修复 `#custom-image-video` 被旧路由误判成 `Photo to CG` 的问题，刷新和 F5 后应保持正确栏目。
- AI 定制页可见文案接入英文/西语语言包。中文文件夹名和内部沟通不影响网站前台语言。
- `Photo to CG` 表单排版改为和 `Image to Video` 一致：上传窗口 + 大提示词输入框。
- AI 生成流程中的上传中、提交中、生成中、完成、失败、下载成品等状态文案已本地化。
- 未登录状态下积分显示仍按登录态控制：只有登录后显示用户积分。

## 当前主要文件

- 前端页面：`C:\Users\Administrator\Documents\独立站wallpaper\index.html`
- 前端逻辑：`C:\Users\Administrator\Documents\独立站wallpaper\script.js`
- AI 工作流接口：`C:\Users\Administrator\Documents\独立站wallpaper\api\ai-workflow.js`
- 上传接口：`C:\Users\Administrator\Documents\独立站wallpaper\api\upload.js`
- 当前记录：`C:\Users\Administrator\Documents\独立站wallpaper\PROJECT_CURRENT_RECORD.md`

## 下一步建议

- 浏览器验证 AI 定制页英文和西语切换后的 tab、表单、状态文案。
- 验证 `#custom`、`#custom-all`、`#custom-cg-image`、`#custom-image-video` 刷新后内容稳定显示。
- 等用户提供后续 RunningHub 图生图、图生视频、人物替换、双人合影正式 API 后，再把当前样板接口替换为生产接口。
- 上线后检查 Vercel 部署是否命中新版本 `20260610-ai5-3`。

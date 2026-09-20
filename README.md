# Human, Inc.

一个中文职场生存网页游戏：在全是 Agent 的公司里假装自己也是 Agent，活过季度 IBU 裁员，从初级职员升到 CEO。

## 运行

需要 Node.js 18 或以上，无需安装依赖。

```sh
npm start
```

访问 http://localhost:3000。可通过 `PORT=8080 npm start` 修改端口。也可以运行 `npm run build`，将生成的 `dist/` 目录部署到任何静态网站托管服务。

## 游戏版本

当前版本：**v0.1.2 · 含微量人类**。本次更新未能彻底移除碳基依赖。

电脑和手机顶栏均显示当前游戏版本。版本号读取 `package.json` 的 `version`，版本代号和说明读取 `gameRelease`。`npm start` 和 `npm run build` 会自动生成前端版本信息，不需要手工修改 `src/version.js`。

发布新版本时更新上述字段及本节说明；例如运行 `npm version patch --no-git-tag-version` 可将版本升至 `0.1.3`，并同步锁文件。游戏版本与存档格式版本独立，升级显示版本不会清空进度。

## 部署到 Cloudflare Workers

项目使用 [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)，由 Cloudflare 直接托管静态文件，无需运行 `server.js` 或配置数据库。`npm run build` 将网页及其依赖复制到 `dist/`。

在 Cloudflare 的 **Workers & Pages** 中创建 Worker，连接 GitHub 仓库 `xiaoyuin/HumanInc`，配置如下：

| 配置 | 值 |
| --- | --- |
| Worker 名称 | `humaninc`（须与 `wrangler.jsonc` 的 `name` 一致） |
| 生产分支 | `main` |
| 根目录 | 仓库根目录，保留默认值 |
| 构建命令 | `npm run build` |
| 部署命令 | `npx wrangler deploy` |

静态资源目录已在 `wrangler.jsonc` 中设置为 `./dist`，无需另外填写 Pages 的输出目录。Workers Builds 会根据 `package-lock.json` 安装开发依赖中的 Wrangler。部署工具需要 Node.js 22 或以上；Cloudflare 的构建环境请使用满足要求的版本。

如果已经创建了其他名称的 Worker，请同步修改 `wrangler.jsonc` 的 `name`。部署完成后使用控制台给出的 `workers.dev` 地址访问；连接的生产分支后续推送会触发自动部署。[Workers Builds 配置说明](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

也可以在本地登录 Cloudflare 后部署：

```sh
npm ci
npx wrangler login
npm run deploy
```

上线后，游戏存档仍只保存在当前浏览器和域名下；本地开发地址、`workers.dev` 地址与自定义域名的存档互相独立。

## 链接分享与图标

分享主地址为 `https://humaninc.pages.dev/`。页面初始 HTML 中包含 Open Graph 和 Twitter Card 标题、描述，以及绿色 **hi** 方形分享图。浏览器图标提供 SVG、PNG、ICO 和 Apple Touch Icon，均为可直接访问的独立文件。

- `public/favicon.svg` 是图标的矢量源文件，主页左上角和浏览器矢量图标共用此文件。
- `public/assets/hi.png` 是 512 × 512 的分享图；其他 PNG 和 ICO 是其缩小版本。
- `npm run build` 会将 `public/` 的内容复制到 `dist/` 根目录。
- 如需使用其他分享主域名，在构建环境设置 `SITE_URL`（例如 `https://example.com`）；构建会同步替换 canonical、Open Graph 和分享图的域名。

分享信息无需运行 JavaScript 即可读取。[Open Graph 协议说明](https://ogp.me/)

微信中的实际卡片样式仍需发布后在客户端测试；补充通用分享标签不等于已经接入微信 JS-SDK，也不保证所有分享方式都会展示描述。浏览器标签页图标和聊天分享缩略图是不同的展示位置。

## 玩法

- 每季度 3 次事件，每次选择一个回应；选项提前显示数值变化。
- 事件库共 40 个事件、120 个选项。新的一局 30 次决策不重复事件；高级职员起，每个职级的 6 次决策中至少 3 次是该职级新解锁的事件。
- 绩效门槛从 60 开始，每个职级增加 5；信任必须至少 25 才能通过 IBU。
- 暴露达到 100，立刻因人类身份被解雇。
- 精力耗尽的决策额外增加 18 暴露、扣除 10 绩效。
- 通过季度后恢复 24 精力、减少 8 暴露，绩效重置为 45，信任保留。
- 每个职级存活 2 个季度后晋升，10 个季度成为 CEO 即通关。
- 接受 Offer 或结局重开时分配新工号，刷新和继续游戏时保留；旧存档沿用 `YOU-042`。
- 当前浏览器自动存档。游戏中可随时点击顶栏的“辞职”按钮，确认后清空当前存档并返回接受 Offer 前的入职页，再次接受 Offer 才开始新的一局；取消辞职会保留全部进度。电脑和手机均支持。

## 项目结构

- `src/game.js`：独立游戏状态机、晋升和裁员规则、存档校验。
- `src/events.js`：40 个原创中文事件，共 120 个选项。16 个通用事件；高级职员、团队主管、部门总监、副总裁各解锁 6 个事件。
- `src/app.js`：工作台、组织架构、员工手册、决策与结局界面。
- `src/style.css`：响应式布局；无需网络字体或外部资源。
- `server.js`：本地开发静态服务器。

## 验证

```sh
npm test
```

测试覆盖立即暴露、精力耗尽、季度绩效与信任门槛、晋升、通关、旧存档兼容、事件去重与职级分配，以及使用真实选项完成 30 次决策的可行路线。

这是本地单人原型，事件是预先编写的，不依赖大模型 API、后端账户或付费服务。

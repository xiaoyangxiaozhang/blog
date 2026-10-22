# 小羊嚣张博客后台

这是“小羊嚣张”博客的后台管理前端，实际应用源码位于 [`blogtry/`](./blogtry)。博客前台位于另一个仓库：[blognuxt](https://github.com/xiaoyangxiaozhang/blognuxt)。

线上地址：<https://admin.xiaoyangxiaozhang.xyz/>

## 功能

- 仪表盘：访问概览、趋势图、分类/标签统计和文章贡献数据
- 内容管理：文章、动态、友链、评论和 RSS 订阅
- 资源与反馈：文件管理、反馈处理和系统通知
- 系统配置：基础设置、博客设置、OAuth、AI、上传、微信和导入导出
- 访问控制：用户、菜单和访问日志管理
- 编辑能力：Markdown/CodeMirror、WangEditor、标签/分类管理和封面制作

## 技术栈

- Vue 3、TypeScript、Vite
- Element Plus、Pinia、Vue Router
- Axios、ECharts、Remix Icon
- CodeMirror、WangEditor、Markdown-it、Mermaid

## 环境要求

- Node.js 22.23.4（推荐），或满足 `^22.23.4 || ^24.22.1 || ^26.12.1` 的版本
- npm 10 或更高版本
- 可访问的博客后端 API

## 本地开发

```bash
cd blogtry
nvm install
nvm use
npm ci
npm run dev
```

开发服务器默认地址为 <http://localhost:5173/>。

### API 地址

本地开发可以在 `blogtry/.env.local` 中覆盖 API 地址：

```dotenv
VITE_API_URL=http://localhost:8080/api/v1
```

请求层会优先读取运行时配置 `window.__APP_CONFIG__.apiUrl`，其次读取 `VITE_API_URL`。不要把密钥、Token 或其他敏感配置写入前端环境变量。

## 构建与预览

```bash
cd blogtry
npm run build
npm run preview
```

`npm run build` 会先执行 TypeScript/Vue 检查，再生成 `blogtry/dist/` 静态文件。

## 主要页面

| 路径 | 说明 |
| --- | --- |
| `/login` | 登录 |
| `/` | 仪表盘 |
| `/articles` | 文章管理 |
| `/moments` | 动态管理 |
| `/friends` | 友链管理 |
| `/comments` | 评论管理 |
| `/rssfeeds` | RSS 订阅管理 |
| `/feedback` | 反馈管理 |
| `/files` | 文件管理 |
| `/settings` | 系统设置 |
| `/users`、`/menus` | 用户与菜单管理 |
| `/visits` | 访问记录 |

除登录页外，管理页面默认需要登录。请求层会自动附带 Bearer Token，并在过期后尝试刷新登录状态。

## 目录结构

```text
blog/
├── blogtry/                 # Vue 后台管理应用
│   ├── src/
│   │   ├── api/             # 后端 API 封装
│   │   ├── components/      # 通用组件
│   │   ├── router/          # 路由与登录拦截
│   │   ├── stores/          # Pinia 状态
│   │   └── views/           # 管理页面
│   ├── .env.development     # 开发环境 API 配置
│   ├── .env.production      # 生产环境 API 配置
│   └── package.json
└── .github/workflows/       # GitHub Actions 部署流程
```

## 自动部署

推送到 `main` 分支或手动触发 `Deploy blog admin` workflow 后，GitHub Actions 会：

1. 使用 `blogtry/.nvmrc` 指定的 Node.js 版本（当前为 22.23.4）安装依赖并构建 `blogtry`
2. 将 `blogtry/dist/` 同步到服务器 `/www/wwwroot/blogtry`
3. 检查后台地址 <https://admin.xiaoyangxiaozhang.xyz/>
4. 发布成功后在本次提交上创建递增的 Git tag，例如 `v1.0.0`、`v1.0.1`

部署需要在 GitHub Actions Secrets 中配置：`ALIYUN_HOST`、`ALIYUN_USER`、`ALIYUN_SSH_KEY` 和 `ALIYUN_KNOWN_HOSTS`。请勿把私钥直接提交到仓库。

## 相关项目

- 前台博客：[blognuxt](https://github.com/xiaoyangxiaozhang/blognuxt)
- 前台线上地址：<https://xiaoyangxiaozhang.xyz/>

## 版本递增规范

发布 tag 采用 `v主版本.次版本.补丁版本`，遵循 [SemVer](https://semver.org/lang/zh-CN/)；提交标题使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)。三个仓库独立计版，已发布 tag 不得改写。

| 变更 | 提交类型 | 示例 |
| --- | --- | --- |
| 新增兼容功能 | `feat` | `v1.0.45` → `v1.1.0` |
| 兼容修复、性能优化、重构、样式、文档、测试、构建或发布维护 | `fix`、`perf`、`refactor`、`style`、`docs`、`test`、`build`、`ci`、`chore` | `v1.0.45` → `v1.0.46` |
| 不兼容变更 | 人工规划主版本发布 | `v1.8.7` → `v2.0.0` |

- 次版本递增时补丁归零，主版本递增时次版本和补丁都归零。
- 自动发布按触发提交的标题计算；合并或一次推送多个提交时，触发提交必须表达整个发布的最高变更级别。推荐 squash 合并。
- 以当前仓库最大的正式语义版本为基准，忽略预发布和不规范 tag；不再固定扫描 `v1.0.*`。
- 构建与部署前先校验提交格式。`!`、`BREAKING CHANGE:`、`BREAKING-CHANGE:` 会阻止自动发布，不兼容变更需制定迁移和回滚计划。
- 只有部署及健康检查成功后创建 tag；同一提交重跑复用已有 tag，不重复递增。
- 本地预览下一版本：`bash scripts/release-version.sh HEAD`。

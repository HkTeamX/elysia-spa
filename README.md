# elysia-spa

一个面向 Elysia 的 Type-safe SPA 静态资源插件，用于从指定目录提供单页应用资源，并自动将未知路由回退到 `index.html`。

## 特性

- TypeScript 友好，带完整类型定义
- 自动注册静态资源路由（来自 `assets` 目录）
- SPA 回退策略：未命中资源时返回 `index.html`
- 支持预压缩资源协商：优先返回 `.br` / `.gz`
- 自动设置 `Vary: Accept-Encoding`

## 运行环境

本插件依赖 Bun API（如 `Bun.file`、`Glob`），请在 Bun 环境下运行。

- Bun 1.0+
- Elysia `^1.4.28`

## 安装

```bash
bun add elysia-spa
```

如果你在开发本仓库：

```bash
bun install
```

## 快速开始

```ts
import { Elysia } from 'elysia'
import { SpaPlugin } from 'elysia-spa'

const app = new Elysia()

app.use(SpaPlugin({
  assets: './public',
  prefix: '/',
  index: 'index.html',
}))

app.listen(3000)
```

目录示例：

```text
public/
	index.html
	assets/app.js
	assets/app.css
	assets/app.js.br
	assets/app.js.gz
```

## 配置项

`SpaPlugin(options?: SpaOptions)`

```ts
export interface SpaOptions {
  assets?: string
  prefix?: string
  index?: string
}
```

默认值：

- `assets`: `/public`
- `prefix`: `/`
- `index`: `index.html`

说明：

- `assets`: 静态资源根目录
- `prefix`: 资源挂载前缀，例如 `/app` 时将注册 `/app/*`
- `index`: SPA 入口文件名（相对 `assets`）

## 路由行为

插件会执行以下逻辑：

1. 扫描 `assets` 目录下所有文件。
2. 为每个普通文件注册 GET 路由（跳过 `index` 本体以及 `.br`、`.gz` 文件）。
3. 注册 `prefix` 根路径，返回 `index`。
4. 注册 `prefix/*` 通配路径，未命中资源时回退到 `index`。

这意味着：

- 已存在的静态资源按文件路径返回
- 前端路由（如 `/dashboard`）会回退到 `index.html`

## 压缩资源协商

当请求头包含 `Accept-Encoding` 时，插件会按权重（`q`）从高到低选择编码，并查找同名预压缩文件：

- `br` -> 查找 `*.br`
- `gzip` -> 查找 `*.gz`

命中后会返回压缩文件并设置：

- `Content-Encoding: br|gzip`
- `Content-Type`（继承原始文件 MIME）
- `Vary: Accept-Encoding`

未命中预压缩文件时返回原始文件。

## 示例：子路径部署

```ts
app.use(SpaPlugin({
  assets: './dist/client',
  prefix: '/admin',
  index: 'index.html',
}))
```

效果：

- 静态资源映射到 `/admin/...`
- 访问 `/admin` 或 `/admin/any/path` 回退到 `index.html`

## 开发

```bash
bun run lint
bun run typecheck
bun run build
```

## 导出内容

- `SpaPlugin`
- `SpaOptions`
- `parseAcceptedEncodings`
- `createStaticResponse`
- `normalizeUrlPath`

## 许可证

MIT

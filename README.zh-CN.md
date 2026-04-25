# elysia-spa

[English](./README.md) | [简体中文](./README.zh-CN.md)

一个用于从静态目录托管单页应用的 Elysia 类型安全插件。

它会扫描前端构建产物、自动注册静态文件路由、在存在预压缩资源时按 `Accept-Encoding` 协商返回对应文件，并在 SPA 页面导航请求时回退到 `index.html`。

> 仅支持 Bun。本包依赖 `Bun.file`、`Glob` 等 Bun API，不能在纯 Node.js 运行时中使用。

## 特性

- 从任意静态资源目录托管 SPA
- 自动为扫描到的文件注册路由
- 支持挂载到 `/` 或 `/app` 等自定义前缀
- 支持基于 `Accept-Encoding` 的预压缩资源协商
- 为 SPA 的 HTML 导航请求回退到 `index.html`
- 使用 TypeScript 编写，适配 Elysia

## 安装

```bash
bun add elysia-spa
```

`elysia` 是 peer dependency，请确保你的 Bun 项目中也已经安装。

## 快速开始

```ts
import { Elysia } from 'elysia'
import { SpaPlugin } from 'elysia-spa'

const app = new Elysia()

app.use(await SpaPlugin({
  assets: './public',
}))

app.listen(3000)
```

如果你的前端构建产物目录如下：

```text
public/
  index.html
  assets/app.js
  assets/app.css
```

那么插件会提供：

- `/` -> `index.html`
- `/assets/app.js` -> `public/assets/app.js`
- `/assets/app.css` -> `public/assets/app.css`
- 未命中的 HTML 导航请求 -> `index.html`

## 使用路径前缀

如果你希望把 SPA 挂载到某个子路径：

```ts
import { Elysia } from 'elysia'
import { SpaPlugin } from 'elysia-spa'

const app = new Elysia()

app.use(await SpaPlugin({
  assets: './public',
  prefix: '/app',
}))
```

这样应用会从 `/app` 路径下提供访问。

## API

### `SpaPlugin(options)`

创建并返回一个用于托管静态 SPA 的 Elysia 插件。

```ts
interface SpaOptions {
  assets: string
  prefix?: string
  index?: string
  compressionMapping?: Record<string, string>
}
```

## 配置项

### `assets`

类型：`string`

必填。前端构建产物所在的静态目录路径。

示例：

```ts
assets: './dist/client'
```

### `prefix`

类型：`string`

默认值：`'/'`

用于挂载 SPA 的基础路径前缀。

示例：

```ts
prefix: '/dashboard'
```

### `index`

类型：`string`

默认值：`'index.html'`

根路径访问和 SPA 回退时使用的入口 HTML 文件名。

### `compressionMapping`

类型：`Record<string, string>`

默认值：

```ts
{
  gzip: '.gz',
  br: '.br',
  zstd: '.zst',
}
```

用于定义编码名称和预压缩文件后缀之间的映射关系。

## 预压缩资源

如果你的静态目录中包含预压缩版本的资源文件，插件会自动协商并优先返回对应文件。

例如：

```text
public/
  index.html
  assets/app.js
  assets/app.js.gz
  assets/app.js.br
```

当客户端发送兼容的 `Accept-Encoding` 请求头时，插件会优先返回匹配的压缩文件，并设置：

- `Content-Encoding`
- `Vary: Accept-Encoding`

同时保留原始文件的内容类型。

## SPA 回退行为

当请求路径没有命中已注册的静态资源路由时，插件会回退到配置的 `index` 文件。

为了避免把资源请求误返回成 HTML，当前回退逻辑仅面向接受 HTML 的请求。实际效果上，浏览器页面导航仍然可以正常进入前端路由，而缺失的静态资源也会更容易暴露为真正的资源缺失问题，而不是返回一个状态码为 200 的 HTML 页面。

## 说明

- `assets` 应指向一个已经构建完成的前端输出目录
- `index` 文件应存在于 `assets` 目录内
- 预压缩文件后缀应与 `compressionMapping` 保持一致
- 该包仅适用于基于 Bun 和 Elysia 的应用场景

## License

MIT

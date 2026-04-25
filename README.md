# elysia-spa

[English](./README.md) | [简体中文](./README.zh-CN.md)

Type-safe Elysia plugin for serving Single Page Applications from a static folder.

It scans your built frontend assets, registers static routes automatically, serves pre-compressed files when available, and falls back to `index.html` for SPA navigation requests.

> Bun only. This package depends on Bun APIs such as `Bun.file` and `Glob`, and is not intended to run on a plain Node.js runtime.

## Features

- Serve an SPA from any static asset directory
- Auto-register routes for discovered files
- Support custom mount prefixes such as `/` or `/app`
- Negotiate pre-compressed assets with `Accept-Encoding`
- Fall back to `index.html` for HTML navigation requests
- Written in TypeScript and designed for Elysia

## Installation

```bash
bun add elysia-spa
```

`elysia` is a peer dependency, so make sure it is installed in your Bun app as well.

## Quick Start

```ts
import { Elysia } from 'elysia'
import { SpaPlugin } from 'elysia-spa'

const app = new Elysia()

app.use(await SpaPlugin({
  assets: './public',
}))

app.listen(3000)
```

If your frontend build outputs files like:

```text
public/
  index.html
  assets/app.js
  assets/app.css
```

Then the plugin will serve:

- `/` -> `index.html`
- `/assets/app.js` -> `public/assets/app.js`
- `/assets/app.css` -> `public/assets/app.css`
- Unmatched HTML navigation requests -> `index.html`

## Use With a Prefix

Mount the SPA under a sub-path:

```ts
import { Elysia } from 'elysia'
import { SpaPlugin } from 'elysia-spa'

const app = new Elysia()

app.use(await SpaPlugin({
  assets: './public',
  prefix: '/app',
}))
```

This will serve the SPA from `/app`.

## API

### `SpaPlugin(options)`

Creates and returns an Elysia plugin that serves files from the configured asset directory.

```ts
interface SpaOptions {
  assets: string
  prefix?: string
  index?: string
  compressionMapping?: Record<string, string>
}
```

## Options

### `assets`

Type: `string`

Required. Path to the built frontend assets directory.

Example:

```ts
assets: './dist/client'
```

### `prefix`

Type: `string`

Default: `'/'`

Base URL prefix used to expose the SPA.

Example:

```ts
prefix: '/dashboard'
```

### `index`

Type: `string`

Default: `'index.html'`

Entry HTML file used for root access and SPA fallback.

### `compressionMapping`

Type: `Record<string, string>`

Default:

```ts
{
  gzip: '.gz',
  br: '.br',
  zstd: '.zst',
}
```

Maps accepted content encodings to pre-compressed file suffixes.

## Pre-compressed Assets

If your asset directory contains compressed variants, the plugin can serve them automatically.

Example:

```text
public/
  index.html
  assets/app.js
  assets/app.js.gz
  assets/app.js.br
```

When the client sends a compatible `Accept-Encoding` header, the plugin will prefer the matching compressed file and set:

- `Content-Encoding`
- `Vary: Accept-Encoding`

The original file content type is preserved.

## SPA Fallback Behavior

The plugin falls back to the configured `index` file for routes that are not matched by a static file route.

To avoid returning HTML for asset requests by mistake, fallback is only intended for requests that accept HTML. In practice this means browser navigation works as expected, while missing static assets should still surface as missing resources instead of silently returning `index.html`.

## Notes

- `assets` should point to an existing built frontend output directory
- `index` should be present inside the `assets` directory
- Pre-compressed files should use the suffixes defined by `compressionMapping`
- This package only works in Bun and Elysia-based applications

## License

MIT

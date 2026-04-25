import type { SpaOptions } from './types.js'
import { Glob } from 'bun'
import { Elysia } from 'elysia'
import { createStaticResponse, normalizeUrlPath } from './utils.js'

export async function SpaPlugin(options: SpaOptions) {
  const {
    assets,
    prefix = '/',
    index = 'index.html',
    compressionMapping = {
      gzip: '.gz',
      br: '.br',
      zstd: '.zst',
    },
  } = options

  const compressionExtensions = new Set(
    Object.values(compressionMapping)
      .map(ext => (ext.startsWith('.') ? ext : `.${ext}`)),
  )

  const isCompressedFile = (filePath: string) => {
    for (const extension of compressionExtensions) {
      if (filePath.endsWith(extension)) {
        return true
      }
    }

    return false
  }

  const plugin = new Elysia({
    name: 'elysia-spa',
    seed: options,
  })

  const glob = new Glob('**')
  const filePaths = await Array.fromAsync(glob.scan(assets))
  const filePathsSet = new Set(filePaths)

  for (const filePath of filePaths) {
    if (filePath === index || isCompressedFile(filePath)) {
      continue
    }

    plugin.get(
      normalizeUrlPath(prefix, filePath),
      ({ request, set }) =>
        createStaticResponse({
          assets,
          filePath,
          filePathSet: filePathsSet,
          reqHeaders: request.headers,
          setHeaders: set.headers,
          compressionMapping,
        }),
    )
  }

  plugin
    .get(
      normalizeUrlPath(prefix),
      ({ request, set }) => createStaticResponse({
        assets,
        filePath: index,
        filePathSet: filePathsSet,
        reqHeaders: request.headers,
        setHeaders: set.headers,
        compressionMapping,
        servingIndex: true,
      }),
    )
    .get(
      normalizeUrlPath(prefix, '*'),
      ({ request, set }) => createStaticResponse({
        assets,
        filePath: index,
        filePathSet: filePathsSet,
        reqHeaders: request.headers,
        setHeaders: set.headers,
        compressionMapping,
        servingIndex: true,
      }),
    )

  return plugin
}

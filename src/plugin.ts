import type { SpaOptions } from './types.js'
import { Glob } from 'bun'
import { Elysia } from 'elysia'
import { createStaticResponse, normalizeUrlPath } from './utils.js'

export async function SpaPlugin(options: SpaOptions = {}) {
  const {
    assets = '/public',
    prefix = '/',
    index = 'index.html',
  } = options

  const plugin = new Elysia({
    name: 'elysia-spa',
    seed: options,
  })

  const glob = new Glob('**')
  const filePaths = await Array.fromAsync(glob.scan(assets))
  const filePathsSet = new Set(filePaths)

  for (const filePath of filePaths) {
    if (filePath === index || filePath.endsWith('.br') || filePath.endsWith('.gz')) {
      continue
    }

    plugin.get(
      normalizeUrlPath(prefix, filePath),
      ({ request, set }) => createStaticResponse(assets, filePath, filePathsSet, request.headers.get('accept-encoding') ?? '', set.headers),
    )
  }

  plugin.get(
    normalizeUrlPath(prefix),
    ({ request, set }) => createStaticResponse(assets, index, filePathsSet, request.headers.get('accept-encoding') ?? '', set.headers),
  )

  plugin.get(
    normalizeUrlPath(prefix, '*'),
    ({ request, set }) => createStaticResponse(assets, index, filePathsSet, request.headers.get('accept-encoding') ?? '', set.headers),
  )

  return plugin
}

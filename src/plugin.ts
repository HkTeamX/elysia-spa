import type { Context, Handler, HTTPHeaders } from 'elysia'
import type { AssetRoute, CompressionVariant, SpaOptions } from './types.js'
import { join, posix, resolve } from 'node:path'
import { Glob } from 'bun'
import { Elysia } from 'elysia'
import {
  createPluginSeed,
  isCompressedVariant,
  normalizeRelativePath,
  parseAcceptEncoding,
  routePathFor,
} from './utils.js'

const DEFAULT_COMPRESSION_MAPPING = {
  gzip: '.gz',
  br: '.br',
  zstd: '.zst',
} satisfies SpaOptions['compressionMapping']

export async function SpaPlugin(options: SpaOptions) {
  const assetsRoot = resolve(options.assets)
  const index = normalizeRelativePath(options.index ?? 'index.html')
  const prefix = posix.join('/', options.prefix?.trim() ?? '')
  const compressionMapping = options.compressionMapping ?? DEFAULT_COMPRESSION_MAPPING
  const indexPath = join(assetsRoot, index)

  if (!(await Bun.file(indexPath).exists())) {
    throw new Error(`SPA index file was not found: ${indexPath}`)
  }

  const routes = await discoverAssets({
    assets: assetsRoot,
    prefix,
    compressionMapping,
  })

  const indexRoute = routes.find(route => route.relativePath === index)
  if (!indexRoute) {
    throw new Error(`SPA index file was not found in the discovered assets: ${index}`)
  }

  const app = new Elysia({
    name: 'elysia-spa',
    seed: createPluginSeed({ assets: assetsRoot, prefix, index, compressionMapping }),
  })

  for (const route of routes) app.get(route.routePath, createAssetHandler(route))

  const indexHandler = createAssetHandler(indexRoute)
  app
    .get(prefix, indexHandler)
    .get(posix.join(prefix, '*'), indexHandler)

  return app
}

async function discoverAssets(options: Required<Pick<SpaOptions, 'assets' | 'compressionMapping' | 'prefix'>>) {
  const glob = new Glob('**/*')
  const files = await Array.fromAsync(glob.scan({ cwd: options.assets, onlyFiles: true }), path => normalizeRelativePath(path))
  const fileSet = new Set(files)
  const compressedSuffixes = Object.values(options.compressionMapping)
  const routes: AssetRoute[] = []

  for (const relativePath of files) {
    if (isCompressedVariant(relativePath, fileSet, compressedSuffixes)) {
      continue
    }

    const absolutePath = join(options.assets, relativePath)

    routes.push({
      relativePath,
      absolutePath,
      routePath: routePathFor(options.prefix, relativePath),
      contentType: Bun.file(absolutePath).type,
      variants: await variantsFor(absolutePath, options.compressionMapping),
    })
  }

  return routes
}

async function variantsFor(absolutePath: string, compressionMapping: Record<string, string>) {
  const variants: CompressionVariant[] = []

  for (const [encoding, suffix] of Object.entries(compressionMapping)) {
    const variantPath = `${absolutePath}${suffix}`

    if (await Bun.file(variantPath).exists()) {
      variants.push({
        encoding,
        absolutePath: variantPath,
      })
    }
  }

  return variants
}

function createAssetHandler(route: AssetRoute): Handler {
  return ({ request, set }: Context) => serveAsset(route, request, set)
}

function serveAsset(
  route: AssetRoute,
  request: Request,
  set: { headers: HTTPHeaders },
) {
  const acceptedEncodings = parseAcceptEncoding(request.headers.get('accept-encoding') ?? '')
  let variant: CompressionVariant | undefined

  for (const encoding of acceptedEncodings) {
    variant = encoding === '*'
      ? route.variants[0]
      : route.variants.find(variant => variant.encoding === encoding)

    if (variant) {
      break
    }
  }

  set.headers['Content-Type'] = route.contentType

  if (route.variants.length > 0) {
    set.headers.Vary = 'Accept-Encoding'
  }

  if (variant) {
    set.headers['Content-Encoding'] = variant.encoding
    return Bun.file(variant.absolutePath)
  }

  return Bun.file(route.absolutePath)
}

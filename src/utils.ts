import type { SpaOptions } from './types.js'
import { posix } from 'node:path'

export function normalizeRelativePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

export function routePathFor(prefix: string, relativePath: string) {
  return posix.join(prefix, normalizeRelativePath(relativePath))
}

export function createPluginSeed(options: Required<SpaOptions>) {
  return {
    assets: options.assets,
    prefix: options.prefix,
    index: options.index,
    compressionMapping: Object.fromEntries(
      Object.entries(options.compressionMapping)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  }
}

export function isCompressedVariant(path: string, files: Set<string>, suffixes: string[]) {
  return suffixes.some(
    suffix => path.endsWith(suffix) && files.has(path.slice(0, -suffix.length)),
  )
}

const ACCEPT_ENCODING_CACHE_LIMIT = 128
const ENCODING_PRIORITY: Record<string, number> = {
  zstd: 0,
  br: 1,
  gzip: 2,
}
const acceptEncodingCache = new Map<string, string[]>()

export function parseAcceptEncoding(header: string) {
  if (!header)
    return []

  const cached = acceptEncodingCache.get(header)
  if (cached)
    return cached

  const encodings = header
    .split(',')
    .map((part, index) => {
      const [encoding = '', ...parameters] = part.split(';').map(part => part.trim())
      const q = parameters.find(parameter => parameter.startsWith('q='))
      const priority = q ? Number.parseFloat(q.slice(2)) : 1

      return {
        encoding: encoding.toLowerCase(),
        priority: Number.isNaN(priority) ? 0 : priority,
        index,
      }
    })
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return right.priority - left.priority
      }

      const priorityLeft = ENCODING_PRIORITY[left.encoding]
      const priorityRight = ENCODING_PRIORITY[right.encoding]
      if (
        (priorityLeft !== undefined && priorityRight !== undefined)
        && priorityLeft !== priorityRight
      ) {
        return priorityLeft - priorityRight
      }

      return left.index - right.index
    })
    .map(({ encoding }) => encoding)

  if (acceptEncodingCache.size >= ACCEPT_ENCODING_CACHE_LIMIT) {
    const oldest = acceptEncodingCache.keys().next().value

    if (oldest) {
      acceptEncodingCache.delete(oldest)
    }
  }

  acceptEncodingCache.set(header, encodings)

  return encodings
}

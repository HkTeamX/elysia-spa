import type { HTTPHeaders } from 'elysia'
import path from 'node:path'
import { NotFoundError } from 'elysia'

const encodingCache = new Map<string, Array<{ name: string, quality: number }>>()
const ENCODING_PRIORITY: Record<string, number> = {
  zstd: 0,
  br: 1,
  gzip: 2,
}

/**
 * 解析 Accept-Encoding 头部，返回一个按权重排序的编码列表
 */
export function parseAcceptedEncodings(acceptEncoding: string) {
  if (!acceptEncoding || acceptEncoding === '') {
    return []
  }

  if (encodingCache.has(acceptEncoding)) {
    return encodingCache.get(acceptEncoding)!
  }

  const parsed = acceptEncoding
    .split(',')
    .map((item, index) => {
      const [name, ...params] = item.split(';').map(part => part.trim())
      const qParam = params.find(p => p.startsWith('q='))
      const qValue = qParam ? Number.parseFloat(qParam.slice(2)) : 1

      return {
        name: name.toLowerCase(),
        quality: Number.isNaN(qValue) ? 0 : qValue,
        index,
      }
    })
    // 按权重排序，权重相同则优先 zstd > br > gzip，最后保持原顺序
    .sort((a, b) => {
      const qualityDiff = b.quality - a.quality
      if (qualityDiff !== 0) {
        return qualityDiff
      }

      const priorityA = ENCODING_PRIORITY[a.name] ?? Number.MAX_SAFE_INTEGER
      const priorityB = ENCODING_PRIORITY[b.name] ?? Number.MAX_SAFE_INTEGER
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      return a.index - b.index
    })

  // 限制缓存大小防止内存溢出（简单策略）
  if (encodingCache.size > 1000) {
    encodingCache.clear()
  }

  encodingCache.set(acceptEncoding, parsed)

  return parsed
}

export interface CreateStaticResponseOptions {
  assets: string
  filePath: string
  filePathSet: Set<string>
  reqHeaders: Request['headers']
  setHeaders: HTTPHeaders
  compressionMapping: Record<string, string>
  servingIndex?: boolean
}

export function createStaticResponse(options: CreateStaticResponseOptions) {
  const { assets, filePath, filePathSet, reqHeaders, setHeaders, compressionMapping, servingIndex = false } = options

  if (servingIndex && reqHeaders.get('accept')?.includes('text/html') !== true) {
    throw new NotFoundError()
  }

  const originalFile = Bun.file(path.join(assets, filePath))
  setHeaders['content-type'] = originalFile.type

  const acceptEncoding = reqHeaders.get('accept-encoding') ?? ''
  if (acceptEncoding === '') {
    return originalFile
  }

  const accepted = parseAcceptedEncodings(acceptEncoding)
  if (accepted.length === 0) {
    return originalFile
  }

  setHeaders.vary = 'Accept-Encoding'

  for (const { name } of accepted) {
    const extension = compressionMapping[name]
    if (!extension) {
      continue
    }

    const encodedFilePath = `${filePath}${extension}`
    if (filePathSet.has(encodedFilePath)) {
      setHeaders['content-encoding'] = name
      return Bun.file(path.join(assets, encodedFilePath))
    }
  }

  return originalFile
}

export function normalizeUrlPath(...parts: string[]) {
  return path.posix.join('/', ...parts.map(p => p.replaceAll('\\', '/')))
}

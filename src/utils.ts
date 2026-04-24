import { join } from 'node:path/posix'

const encodingCache = new Map<string, Array<{ name: string, quality: number }>>()

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
    .map((item) => {
      const [name, ...params] = item.split(';').map(part => part.trim())
      const qParam = params.find(p => p.startsWith('q='))
      const qValue = qParam ? Number.parseFloat(qParam.slice(2)) : 1

      return {
        name: name.toLowerCase(),
        quality: Number.isNaN(qValue) ? 0 : qValue,
      }
    })
    // 按权重排序，权重高的排前面
    .sort((a, b) => b.quality - a.quality)

  // 限制缓存大小防止内存溢出（简单策略）
  if (encodingCache.size > 1000) {
    encodingCache.clear()
  }

  encodingCache.set(acceptEncoding, parsed)

  return parsed
}

export const ENCODING_EXTENSIONS: Record<string, string> = {
  br: 'br',
  gzip: 'gz',
}

export function createStaticResponse(
  assets: string,
  filePath: string,
  filePathSet: Set<string>,
  acceptEncoding: string,
  headers: Record<string, string | number>,
) {
  const accepted = parseAcceptedEncodings(acceptEncoding)
  const originalFile = Bun.file(join(assets, filePath))

  if (accepted.length === 0) {
    // 如果客户端没有发送 Accept-Encoding 头部，或者解析失败，则直接返回原始文件
    return originalFile
  }

  headers.vary = 'Accept-Encoding'
  headers['content-type'] = originalFile.type

  for (const { name } of accepted) {
    if (!(name in ENCODING_EXTENSIONS)) {
      continue
    }

    const encodedFilePath = `${filePath}.${ENCODING_EXTENSIONS[name]}`
    if (filePathSet.has(encodedFilePath)) {
      headers['content-encoding'] = name
      return Bun.file(join(assets, encodedFilePath))
    }
  }

  return originalFile
}

export function normalizeUrlPath(...parts: string[]) {
  return join('/', ...parts.map(p => p.replaceAll('\\', '/')))
}

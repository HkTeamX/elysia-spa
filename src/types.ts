export interface SpaOptions {
  /**
   * Path to the built frontend assets directory.
   */
  assets: string

  /**
   * Base URL prefix used to expose the SPA.
   *
   * @default '/'
   */
  prefix?: string

  /**
   * Entry HTML file used for root access and SPA fallback.
   *
   * @default 'index.html'
   */
  index?: string

  /**
   * Maps accepted content encodings to pre-compressed file suffixes.
   *
   * @default { gzip: '.gz', br: '.br', zstd: '.zst' }
   */
  compressionMapping?: Record<string, string>
}

export interface CompressionVariant {
  encoding: string
  absolutePath: string
}

export interface AssetRoute {
  relativePath: string
  absolutePath: string
  routePath: string
  contentType: string
  variants: CompressionVariant[]
}

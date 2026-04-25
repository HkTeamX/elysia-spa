export interface SpaOptions {
  assets: string
  prefix?: string
  index?: string
  /** A mapping of encoding names to compressed file suffixes (with or without leading dot). */
  compressionMapping?: Record<string, string>
}

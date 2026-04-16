export function toFileUrl(filePath?: string): string {
  if (!filePath) return ''
  return `local-image://${encodeURIComponent(filePath)}`
}

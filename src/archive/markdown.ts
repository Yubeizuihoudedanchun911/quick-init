export function extractMarkdownTitle(content: string): string | null {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+?)\s*$/)
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

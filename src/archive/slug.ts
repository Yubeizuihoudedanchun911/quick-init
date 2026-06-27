export function toIterationSlug(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalized) return 'iteration'

  const truncated = normalized.slice(0, 60).replace(/-+$/g, '')

  return truncated.length > 0 ? truncated : 'iteration'
}

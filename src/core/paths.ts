import path from 'node:path'

export function toPosixPath(input: string): string {
  return input.split(path.sep).join('/')
}

export function repoPath(cwd: string, relativePath: string): string {
  return path.join(cwd, relativePath)
}

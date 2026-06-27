import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { LocalConfig } from '../core/types.js'

export function defaultLocalConfig(): LocalConfig {
  return {
    archive: {
      enabled: true,
      autoStage: true,
      aiSummary: true,
      model: 'cheap',
      timeoutMs: 30000,
      fallbackToManifestOnly: true
    },
    hooks: {
      preCommitArchive: true
    }
  }
}

export async function ensureLocalConfig(cwd: string): Promise<LocalConfig> {
  const dir = path.join(cwd, '.quick-init')
  const file = path.join(dir, 'config.json')
  await mkdir(dir, { recursive: true })
  try {
    return JSON.parse(await readFile(file, 'utf8')) as LocalConfig
  } catch {
    const config = defaultLocalConfig()
    await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
    return config
  }
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function mergeLocalConfig(value: unknown): LocalConfig {
  const defaults = defaultLocalConfig()

  if (!isRecord(value)) {
    return defaults
  }

  const archive = isRecord(value.archive) ? value.archive : {}
  const hooks = isRecord(value.hooks) ? value.hooks : {}

  return {
    archive: {
      enabled: isBoolean(archive.enabled) ? archive.enabled : defaults.archive.enabled,
      autoStage: isBoolean(archive.autoStage) ? archive.autoStage : defaults.archive.autoStage,
      aiSummary: isBoolean(archive.aiSummary) ? archive.aiSummary : defaults.archive.aiSummary,
      model: archive.model === 'cheap' ? archive.model : defaults.archive.model,
      timeoutMs: isNumber(archive.timeoutMs) ? archive.timeoutMs : defaults.archive.timeoutMs,
      fallbackToManifestOnly: isBoolean(archive.fallbackToManifestOnly)
        ? archive.fallbackToManifestOnly
        : defaults.archive.fallbackToManifestOnly
    },
    hooks: {
      preCommitArchive: isBoolean(hooks.preCommitArchive)
        ? hooks.preCommitArchive
        : defaults.hooks.preCommitArchive
    }
  }
}

export async function ensureLocalConfig(cwd: string): Promise<LocalConfig> {
  const dir = path.join(cwd, '.quick-init')
  const file = path.join(dir, 'config.json')
  await mkdir(dir, { recursive: true })
  try {
    const raw = await readFile(file, 'utf8')
    return mergeLocalConfig(JSON.parse(raw) as unknown)
  } catch {
    const config = defaultLocalConfig()
    await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
    return config
  }
}

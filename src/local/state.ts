import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface ActiveIterationState {
  iteration: string
  iterationPath: string
  updatedAt: string
}

function statePath(cwd: string): string {
  return path.join(cwd, '.quick-init/state/active-iteration.json')
}

export async function readActiveIteration(cwd: string): Promise<ActiveIterationState | null> {
  try {
    const state = JSON.parse(await readFile(statePath(cwd), 'utf8'))
    if (
      isActiveIterationState(state) &&
      state.iteration.length > 0 &&
      state.iterationPath.length > 0 &&
      state.updatedAt.length > 0
    ) {
      return state
    }
    return null
  } catch {
    return null
  }
}

function isActiveIterationState(value: unknown): value is ActiveIterationState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<ActiveIterationState>
  return (
    typeof state.iteration === 'string' &&
    typeof state.iterationPath === 'string' &&
    typeof state.updatedAt === 'string'
  )
}

export async function writeActiveIteration(cwd: string, state: ActiveIterationState): Promise<void> {
  await mkdir(path.dirname(statePath(cwd)), { recursive: true })
  await writeFile(statePath(cwd), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export async function clearActiveIteration(cwd: string): Promise<void> {
  await rm(statePath(cwd), { force: true })
}

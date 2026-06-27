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
    return JSON.parse(await readFile(statePath(cwd), 'utf8')) as ActiveIterationState
  } catch {
    return null
  }
}

export async function writeActiveIteration(cwd: string, state: ActiveIterationState): Promise<void> {
  await mkdir(path.dirname(statePath(cwd)), { recursive: true })
  await writeFile(statePath(cwd), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export async function clearActiveIteration(cwd: string): Promise<void> {
  await rm(statePath(cwd), { force: true })
}

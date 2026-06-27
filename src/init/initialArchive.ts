import { createHash } from 'node:crypto'
import { GeneratedFile } from '../core/types.js'

export function buildInitialArchiveFiles(
  generatedFiles: GeneratedFile[],
  gitInitialized: boolean,
  hookInstalled: boolean,
  hookPath: string,
  now = new Date()
): GeneratedFile[] {
  const iteration = `${now.toISOString().slice(0, 10)}-初始化工程治理`
  const generatedPaths = generatedFiles
    .filter((file) => file.commit)
    .map((file) => file.path)
    .sort()
  const manifest = {
    iteration,
    type: 'initialization',
    summaryStatus: 'generated',
    generatedFiles: generatedPaths,
    localFiles: ['.quick-init/config.json', hookPath],
    hookInstalled,
    gitInitialized,
    sha256: createHash('sha256').update(generatedPaths.join('\n')).digest('hex')
  }
  const iterationMd = `# 初始化工程治理

## Summary

quick-init 初始化了本项目的 AI coding 工程治理体系。

## Generated Files

${generatedPaths.map((item) => `- ${item}`).join('\n')}

## Local Files

- .quick-init/config.json
- ${hookPath}

## Notes

Local files are not committed and are used only by quick-init runtime.
`

  return [
    {
      path: `docs/iterations/${iteration}/iteration.md`,
      content: iterationMd,
      commit: true
    },
    {
      path: `docs/iterations/${iteration}/manifest.json`,
      content: `${JSON.stringify(manifest, null, 2)}\n`,
      commit: true
    }
  ]
}

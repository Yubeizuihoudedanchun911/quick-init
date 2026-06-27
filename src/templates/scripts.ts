export function hookScriptFiles(): Array<[string, string]> {
  return [
    ['scripts/hooks/install_git_hooks.ts', 'export const hookCommand = "quick-init archive --staged"\n'],
    ['scripts/hooks/archive_iteration.ts', 'export const archiveCommand = "quick-init archive --staged"\n'],
    ['scripts/hooks/check_iteration_docs.ts', 'export const checkCommand = "quick-init archive --staged"\n'],
    ['scripts/hooks/prepare_commit_summary.ts', 'export const prepareCommitSummary = true\n']
  ]
}

# Task 5 Report

- 完成范围：`src/git/git.ts`、`src/git/hooks.ts`、`src/git/scopedCommit.ts`、`tests/helpers/tempRepo.ts`、`tests/git/hooks.test.ts`、`tests/git/scopedCommit.test.ts`
- 新增 `runGit(cwd, args)`，统一封装 `git` 子进程调用
- 新增 `ensureGitRepository(cwd)`，已是 work tree 时返回 `initialized: false`，否则执行 `git init` 并返回 `initialized: true`
- 新增 `installPreCommitHook(cwd)`，会创建或追加 `.git/hooks/pre-commit` 中的 quick-init block，保留原有 hook 内容并把文件设为可执行
- 新增 `scopedCommit(cwd, paths, message)`，只提交指定路径，先执行 `git add -- ...paths` 和 `git diff --cached --check`，再执行 `git commit -m message`
- `tests/helpers/tempRepo.ts` 的 `makeTempRepo` 现在支持可选 `prefix` 参数，保留真实 git repo helper 的行为

## 验证

- 先执行失败用例，确认 Git 模块尚未存在时测试会按预期报错：
  - `npm test -- tests/git/hooks.test.ts tests/git/scopedCommit.test.ts`
- 实现后回归：
  - `npm test -- tests/git/hooks.test.ts tests/git/scopedCommit.test.ts` → 通过
  - `npm run typecheck` → 通过
  - `npm test` → 通过
  - `git diff --check` → 通过

## 备注

- 本次未改动 `.superpowers/`、`.weaver/`、`node_modules/`
- 未创建 commit

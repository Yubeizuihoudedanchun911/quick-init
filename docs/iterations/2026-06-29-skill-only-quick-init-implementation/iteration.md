# Skill-only quick-init 实现验证记录

## 自动验收

- `rtk /opt/anaconda3/envs/py311env/bin/python -m pytest -q`
  - 结果：pass
- `rtk git diff --cached --check`
  - 结果：pass
- `rtk rg -n "quick-init init|quick-init archive|quick-init iteration|npm link|npm install|vitest|tsconfig|package.json" README.md SKILL.md templates tests docs/superpowers/specs/2026-06-29-skill-only-quick-init-design.md`
  - 命中分布：`docs/superpowers/specs/2026-06-29-skill-only-quick-init-design.md`（历史清理说明）、`tests/test_repository_cleanup.py`/`tests/test_skill_flow.py`/`tests/test_guard_script.py`（回归防护）、`templates/hooks/git-pre-commit-guard.py.tmpl`（旧 hook marker `quick-init archive --staged`，用于 init 清理旧 block），均为预期意图；
  - 当前 README/SKILL 中未再出现 `quick-init init/archive/iteration`、`npm link`、`npm install` 等旧 CLI 入口字符串。
- `rtk git status --short --branch`
  - 结果：工作树仅有未跟踪的 `.serena/`（非本任务范围），未见异常变更。

## 手工场景（SKILL flow 仿真）

- 在临时仓库 `/var/folders/pm/np1km_vn6lq_8mxk417kqmm80000gn/T/tmp.3GaxDdRMCq` 按 `quick-init` 流程手工生成 `sample-governed-project`（目标：python + Codex + Claude，第一迭代 `初始化项目治理`）。
- 校验到位：
  - 已生成：`.coding-rules/`、`.codex/hooks.json`、`.codex/agents/commit-governance.toml`、`.claude/settings.json`、`.claude/agents/commit-governance.md`、`docs/onboard/README.md`、`docs/architecture/README.md`、`docs/decisions/README.md`、`docs/iterations/2026-06-29-初始化项目治理/iteration.md`、`docs/iterations/2026-06-29-初始化项目治理/manifest.json`、`docs/changelog.md`、`.quick-init/hooks/pre-commit-guard.py`。
  - 未创建：`npm` 体系文件（如 `package.json`/`package-lock.json`/`tsconfig.json`/`vitest.config.ts`）、`node_modules`、以及 `docs/specs`、`docs/designs`、`docs/verification`、`docs/research` 这类旧文档顶层目录。

## 结果

基于上述自动与手工验证，未发现旧 CLI、Node/Vitest 或旧 docs 顶层目录遗留。

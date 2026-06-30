# quick-init

- [English](#english)
- [中文](#中文)

# English

`quick-init` is a Skill-only project governance initializer. It is not an npm package and does not expose a CLI.

Use this repository as a local Skill source for a coding agent. The Skill asks a small set of questions, reads templates from this repository, and creates a target project's governance structure:

- `.coding-rules/**`
- agent entry instructions that point Codex, Claude, and Gemini at `.coding-rules/`
- `docs/onboard/`
- `docs/architecture/`
- `docs/decisions/`
- `docs/iterations/`
- `docs/changelog.md`
- `.quick-init/state/`, `.quick-init/hooks/`, and `.quick-init/rules/`
- Codex or Claude hook integration when selected
- a Git pre-commit guard

## Install From Source

Clone this repository into the Skill location supported by your coding agent.

```bash
git clone https://github.com/Yubeizuihoudedanchun911/quick-init.git ~/.codex/skills/quick-init
git clone https://github.com/Yubeizuihoudedanchun911/quick-init.git ~/.claude/skills/quick-init
```

Before implementation, verify the current official installation path for the agent you use.

## Update Existing Installation

If `quick-init` is already installed as a local Skill, update the Skill source first:

```bash
cd ~/.codex/skills/quick-init
git pull --ff-only

cd ~/.claude/skills/quick-init
git pull --ff-only
```

Only run the command for the agent locations you actually installed. If you cloned this repository somewhere else, run `git pull --ff-only` in that clone instead.

After the Skill source is updated, open the target repository that already has `.quick-init/` and invoke the `quick-init` Skill again. The Skill detects the existing `.quick-init/` directory and runs an incremental update: it refreshes managed coding rules, hook templates, shared governance rules, and agent adapter files while avoiding replacement of user-filled docs.

For an existing initialized project, the normal update flow is:

1. Update the local `quick-init` Skill source.
2. In the target repository, ask the agent to use `quick-init` to update existing governance files.
3. Select the desired agent entry files and hook integrations.
4. Review the generated diff, run the project checks, then commit the update in the target repository.

## Init Flow

When invoked by a coding agent, this Skill asks for:

- project name
- one-sentence project goal
- primary language: `python`, `java`, `typescript`, `go`, `rust`, or `generic`
- which agent entry files to install: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`
- which hook integrations to install: Codex, Claude, or both
- first iteration name

The agent then reads the templates in this repository and creates the target repository's governance files directly. It creates the seed iteration before installing the Git pre-commit guard so the first guarded commit has the required `iteration.md`, `manifest.json`, and changelog state.

If `.quick-init/` already exists, the Skill runs an incremental update: it compares template hashes from `.quick-init/state/init-metadata.json`, refreshes managed coding rules and adapter files, and avoids replacing user-filled docs.

The repository version is stored in `VERSION`. Initialized projects record the quick-init version, source commit hash, selected language, and template hashes in `.quick-init/state/init-metadata.json`.

## Generated Project Shape

```text
.coding-rules/
.coding-rules/design-principles.md
.codex/
.claude/
docs/
  onboard/
  architecture/
  decisions/
  iterations/
  changelog.md
.quick-init/
  hooks/
  rules/
  state/
AGENTS.md
CLAUDE.md
GEMINI.md
```

`quick-init` creates governance files and directories only. It does not create package files, runtime configuration, business source code, or test examples for the target project.

## Agent Integrations

Selected integrations are rendered from `templates/agent-integrations/**`:

- Codex: `.codex/hooks.json`, `.codex/agents/commit-governance.toml`, and a hook trigger script.
- Claude: `.claude/settings.json`, `.claude/agents/commit-governance.md`, and a hook trigger wrapper.
- Shared trigger logic: `.quick-init/hooks/governance_trigger_core.py` and `.quick-init/hooks/intent-keywords.json`.
- Shared governance rules: `.quick-init/rules/commit-governance-core.md`.
- Git: a pre-commit guard checks staged governance state against `.quick-init/state/last-governance-run.json`.

Top-level agent entry files are rendered from `templates/agent-instructions/**`. They do not duplicate the rule bodies; they declare `.coding-rules/` as the shared project rule source and require the matching language-specific rule file when present.

Commit-governance work is delegated to the selected coding agent's subagent configuration. The main agent keeps the product task context clean while the subagent handles iteration manifest, changelog synchronization, and staged documentation checks.

## Development Checks

Repository validation uses Python 3 and pytest.

```bash
/opt/anaconda3/envs/py311env/bin/python -m pytest
```

Implementation work must keep the repository free of Node, npm, TypeScript, Vitest, old CLI entrypoints, and old generated docs directories.

# 中文

`quick-init` 是一个仅以 Skill 形式工作的项目治理初始化器。它不是 npm 包，也不提供 CLI。

把这个仓库作为本地 Skill 源交给 coding agent 使用。Skill 会询问少量项目信息，读取本仓库中的模板，并在目标项目中创建治理结构：

- `.coding-rules/**`
- 指向 `.coding-rules/` 的 Codex、Claude、Gemini agent entry instructions
- `docs/onboard/`
- `docs/architecture/`
- `docs/decisions/`
- `docs/iterations/`
- `docs/changelog.md`
- `.quick-init/state/`、`.quick-init/hooks/`、`.quick-init/rules/`
- 按需安装 Codex 或 Claude hook integration
- Git pre-commit guard

## 从源码安装

把本仓库 clone 到你的 coding agent 支持的 Skill 目录中。

```bash
git clone https://github.com/Yubeizuihoudedanchun911/quick-init.git ~/.codex/skills/quick-init
git clone https://github.com/Yubeizuihoudedanchun911/quick-init.git ~/.claude/skills/quick-init
```

实际使用前，请先确认当前 agent 官方支持的安装路径。

## 更新已有安装

如果 `quick-init` 已经作为本地 Skill 安装，先更新本地 Skill 源码：

```bash
cd ~/.codex/skills/quick-init
git pull --ff-only

cd ~/.claude/skills/quick-init
git pull --ff-only
```

只需要在实际安装过的 agent 目录里执行对应命令。如果你把本仓库 clone 到了其他位置，就在那个 clone 目录里执行 `git pull --ff-only`。

本地 Skill 源码更新后，打开已经包含 `.quick-init/` 的目标仓库，再次调用 `quick-init` Skill。Skill 会检测已有的 `.quick-init/` 目录并执行增量更新：刷新受 quick-init 管理的 coding rules、hook 模板、共享治理规则和 agent adapter 文件，同时避免覆盖用户已经填写过的 docs 内容。

已有初始化项目的常规更新流程：

1. 更新本地 `quick-init` Skill 源码。
2. 在目标仓库中要求 agent 使用 `quick-init` 更新现有治理文件。
3. 选择需要安装或刷新哪些 agent entry files 和 hook integrations。
4. review 生成的 diff，运行项目检查，然后在目标仓库提交本次更新。

## 初始化流程

当 coding agent 调用这个 Skill 时，它会询问：

- 项目名称
- 一句话项目目标
- 主要语言：`python`、`java`、`typescript`、`go`、`rust` 或 `generic`
- 要安装哪些 agent entry files：`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`
- 要安装哪些 hook integrations：Codex、Claude 或两者都安装
- 第一个 iteration 名称

随后 agent 会读取本仓库模板，并直接在目标仓库中创建治理文件。它会先创建 seed iteration，再安装 Git pre-commit guard，这样第一次受保护的提交就已经具备所需的 `iteration.md`、`manifest.json` 和 changelog 状态。

如果 `.quick-init/` 已经存在，Skill 会执行增量更新：比较 `.quick-init/state/init-metadata.json` 中的模板 hash，刷新受管理的 coding rules 和 adapter 文件，并避免覆盖用户已经填写过的 docs 内容。

仓库版本记录在 `VERSION`。初始化后的项目会在 `.quick-init/state/init-metadata.json` 中记录 quick-init 版本、源码 commit hash、选定语言和模板 hash。

## 生成的项目结构

```text
.coding-rules/
.coding-rules/design-principles.md
.codex/
.claude/
docs/
  onboard/
  architecture/
  decisions/
  iterations/
  changelog.md
.quick-init/
  hooks/
  rules/
  state/
AGENTS.md
CLAUDE.md
GEMINI.md
```

`quick-init` 只创建治理文件和目录。它不会创建 package 文件、runtime 配置、业务源码或目标项目测试示例。

## Agent 集成

选中的集成会从 `templates/agent-integrations/**` 渲染：

- Codex：`.codex/hooks.json`、`.codex/agents/commit-governance.toml` 和 hook trigger script。
- Claude：`.claude/settings.json`、`.claude/agents/commit-governance.md` 和 hook trigger wrapper。
- 共享 trigger logic：`.quick-init/hooks/governance_trigger_core.py` 和 `.quick-init/hooks/intent-keywords.json`。
- 共享治理规则：`.quick-init/rules/commit-governance-core.md`。
- Git：pre-commit guard 会根据 `.quick-init/state/last-governance-run.json` 检查 staged governance state。

顶层 agent entry files 从 `templates/agent-instructions/**` 渲染。它们不会复制规则正文，而是声明 `.coding-rules/` 是共享项目规则来源，并要求在存在对应语言规则文件时遵循它。

Commit-governance 工作会委托给所选 coding agent 的 subagent 配置。main agent 保持产品任务上下文干净，由 subagent 处理 iteration manifest、changelog 同步和 staged documentation 检查。

## 开发检查

仓库验证使用 Python 3 和 pytest。

```bash
/opt/anaconda3/envs/py311env/bin/python -m pytest
```

实现工作必须保持仓库不引入 Node、npm、TypeScript、Vitest、旧 CLI 入口和旧生成文档目录。

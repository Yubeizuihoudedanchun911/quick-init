# quick-init Skill-only 项目治理初始化设计

日期：2026-06-29

状态：设计确认中。

## 背景

`quick-init` 不再定位为需要通过 npm 安装的 CLI。它应当是一个 Skill-only 的项目治理初始化器：用户在目标仓库中调用 Skill，当前 coding agent 根据多轮对话约束，动态创建标准项目结构和规范元素。

本仓库只维护基础 Markdown 模板、agent 接入模板、hook 模板和规则包。具体落到目标仓库时，由 coding agent 读取这些模板并结合用户约束生成文件。

## 目标

- 通过 Skill 初始化一套标准项目结构和治理规范。
- 只生成目录和 Markdown 规范文件，不生成业务代码。
- 不生成语言工程配置文件，例如 `package.json`、`pyproject.toml`、`pom.xml`、`tsconfig.json`。
- 维护 Python、Java、TypeScript 等语言的 Code Rule Markdown 模板。
- 维护文档规则模板，覆盖 onboard、architecture、decision、iteration 和 changelog。
- 初始化时询问用户需要接入哪些 coding agent，并按对应 agent 的真实配置目录注册 hook 或 workflow。
- 支持提交前治理：coding agent hook 自动触发低成本子 agent 处理归档、iteration 更新、manifest 更新和 changelog 同步。
- 保留 Git pre-commit guard 作为兜底校验，防止绕过 agent 归档流程。

## 非目标

- 不提供 npm CLI 作为用户入口。
- 不把归档智能逻辑写进 Git hook。
- 不假设所有 coding agent 都有同样的 hook schema。
- 不为尚未验证接入文档的 agent 生成 hook 配置。
- 不让主 agent 在提交阶段读取完整 staged diff 并承担归档上下文。

## 仓库结构

`quick-init` 仓库维护模板和 Skill：

```text
SKILL.md
README.md
templates/
  project-structure/
    generic.md
  coding-rules/
    generic.md
    python.md
    java.md
    typescript.md
  docs/
    onboard.md
    architecture.md
    decision.md
    iteration.md
    changelog.md
  agent-integrations/
    codex.md
    claude.md
  subagents/
    commit-governance.md
  hooks/
    git-pre-commit-guard.md
```

`agent-integrations/` 只保存已经查过官方或接入文档的 adapter。第一版只确认 Codex 和 Claude。Cursor、Gemini、Windsurf、Copilot 等需要先补充对应官方 hook/config 文档，再新增 adapter。

## 目标项目生成结构

Skill init 后，目标项目生成：

```text
.coding-rules/
  generic.md
  documentation.md
  git-workflow.md
  python.md | java.md | typescript.md

docs/
  onboard/
    README.md
  architecture/
    README.md
  decisions/
    README.md
  iterations/
    README.md
  changelog.md

.quick-init/
  state/
    active-iteration.json
    last-governance-run.json
  hooks/
    pre-commit-guard.py

AGENTS.md | CLAUDE.md | GEMINI.md
```

`.quick-init/` 是本地运行态，初始化时必须写入 `.gitignore`，不提交到仓库。

## 文档模型

`docs/` 顶层只保留五类：

- `docs/onboard/`：项目背景、开发入口、启动方式、工作流。
- `docs/architecture/`：架构事实、模块边界、关键约束。
- `docs/decisions/`：ADR 和长期有效的决策记录。
- `docs/iterations/`：每轮需求、计划、验证和交付记录。
- `docs/changelog.md`：跨 iteration 的变更历史。

不创建独立 `docs/verification/`。验证信息写入 iteration 文档或 plans 文档中，避免文档结构分散。

## Iteration 结构

每个 iteration 只保留必要结构：

```text
docs/iterations/YYYY-MM-DD-<topic>/
  iteration.md
  manifest.json
  specs/
  plans/
```

- `iteration.md`：本轮主文档，包含目标、范围、设计摘要、执行摘要、验证结果、遗留问题。
- `manifest.json`：机器可读索引，记录归档来源、目标路径、hash、状态、changelog 同步状态。
- `specs/`：需求、规格、用户故事和约束。
- `plans/`：实现计划、执行计划、验收计划和调试计划。

其它信息进入 `iteration.md` 章节，不再新增 `verification/`、`rules/`、`tooling/` 等子目录。

## Changelog 同步规则

当开启新的 iteration 后，第一次提交触发治理流程时，必须先把上一轮 iteration 同步到 `docs/changelog.md`。

同步规则：

- 读取 `.quick-init/state/active-iteration.json` 和 `.quick-init/state/last-governance-run.json` 判断 active iteration 是否切换。
- 如果已经切换，读取上一轮 `docs/iterations/<previous>/iteration.md` 和 `manifest.json`。
- 由 commit-governance 子 agent 总结上一轮 Summary、Changes、Verification、Follow-ups。
- 写入 `docs/changelog.md` 的稳定标记块。
- 更新上一轮 `manifest.json`：`status = "closed"`，`changelogSynced = true`。

标记块示例：

```md
<!-- quick-init:iteration 2026-06-29-payment-flow start -->
## 2026-06-29 payment-flow

...
<!-- quick-init:iteration 2026-06-29-payment-flow end -->
```

同一 iteration 重复同步时必须更新原标记块，不能重复追加。

## Coding Agent 接入

Skill init 必须询问用户需要为哪些 coding agent 安装接入。每个 agent adapter 必须明确：

- 真实配置目录。
- hook schema 或 workflow schema。
- 自定义子 agent 的注册方式。
- 不支持自动 hook 时的降级行为。

第一版支持：

```text
Codex
Claude
```

其它 agent 暂不宣称支持 hook 自动注册。

### Codex

Codex 接入必须写入 Codex 的真实项目级目录：

```text
.codex/
  hooks.json
  agents/
    commit-governance.toml
  hooks/
    commit-governance-trigger.py
```

Codex 入口说明写入 `AGENTS.md`，但 `AGENTS.md` 不是 hook 注册点。

Codex adapter 依据官方 Codex 文档维护：

- Hooks: `https://developers.openai.com/codex/hooks`
- Advanced config: `https://developers.openai.com/codex/config-advanced`
- Subagents: `https://developers.openai.com/codex/subagents`

### Claude

Claude 接入必须写入 Claude Code 的真实项目级目录：

```text
.claude/
  settings.json
  agents/
    commit-governance.md
  hooks/
    commit-governance-trigger.sh
```

Claude 入口说明写入 `CLAUDE.md`，但 `CLAUDE.md` 不是 hook 注册点。

Claude adapter 依据官方 Claude Code 文档维护：

- Hooks: `https://code.claude.com/docs/en/hooks`
- Subagents: `https://code.claude.com/docs/en/sub-agents`

## Commit Governance 子 Agent

提交前治理由低成本子 agent 完成，不由主 agent 承担。

子 agent 职责：

- 读取 git status 和 staged Markdown。
- 判断 staged Markdown 应进入 `specs/` 还是 `plans/`。
- 移动或复制归档文档到当前 iteration。
- 更新当前 `iteration.md`。
- 更新当前 `manifest.json`。
- 如果 active iteration 已切换，同步上一轮到 `docs/changelog.md`。
- scoped stage 本次归档文件和必要的 changelog/manifest 更新。
- 写入 `.quick-init/state/last-governance-run.json`。
- 返回短摘要给主 agent。

主 agent 不应读取完整 staged diff，不应承担归档上下文。它只接收子 agent 摘要并继续用户请求的 commit/push/publish 流程。

子 agent 摘要格式：

```text
commit scope:
archived docs:
changelog sync:
manifest updates:
staged files:
blockers:
suggested commit message:
```

## Git Pre-commit Guard

Git hook 是兜底校验层，不做智能归档。

生成文件：

```text
.quick-init/hooks/pre-commit-guard.py
.git/hooks/pre-commit
```

`.git/hooks/pre-commit` 只调用 `.quick-init/hooks/pre-commit-guard.py`。

guard 校验：

- `.quick-init/` 已写入 `.gitignore`。
- 有 staged Markdown 时，`last-governance-run.json` 匹配当前 staged Markdown hash。
- active iteration 对应 `iteration.md` 和 `manifest.json` 存在。
- manifest 中记录的 `specs/`、`plans/` 文件存在。
- active iteration 切换时，上一轮 changelog 标记块存在，并且上一轮 manifest 的 `changelogSynced` 为 true。

guard 失败时阻塞 commit，并提示用户让已安装的 coding agent hook 重新触发 `commit-governance` 子 agent。

## Skill Init 流程

Skill 初始化时逐步询问：

1. 项目名称和一句话目标。
2. 主要语言：`python`、`java`、`typescript` 或 `generic`。
3. 是否已有 Git 仓库；没有则初始化。
4. 是否已有文档结构；已有则合并，不直接覆盖。
5. 需要安装哪些 coding agent 接入：Codex、Claude。
6. 第一轮 iteration 名称，默认 `初始化项目治理`。

初始化执行：

- 读取相关 Markdown 模板。
- 创建标准目录和规则文件。
- 安装所选 agent 的真实 hook/config。
- 安装 Git pre-commit guard。
- 写入 `.quick-init/state/active-iteration.json`。
- 创建首个 iteration 目录。
- 触发或要求对应 agent 执行一次 commit-governance，生成初始 manifest 和 iteration 文档。

## 覆盖策略

初始化必须保护已有项目：

- 已存在文件不直接覆盖。
- 可合并文件按标记块更新。
- 不可安全合并时生成旁路建议文件，例如 `<path>.quick-init-proposed.md`。
- 所有修改由当前 coding agent 展示摘要，用户确认后再提交。

## 验收标准

- 新用户不需要 npm install 或 npm link。
- Skill 能在空仓库生成标准治理结构。
- Skill 能在已有仓库合并生成规范文件，不覆盖用户内容。
- Codex 选择后生成 `.codex/hooks.json` 和 `.codex/agents/commit-governance.toml`。
- Claude 选择后生成 `.claude/settings.json` 和 `.claude/agents/commit-governance.md`。
- Git pre-commit guard 能阻塞未完成治理归档的提交。
- 新 iteration 第一次提交时，上一轮 iteration 被同步到 `docs/changelog.md`。
- iteration 目录只包含 `iteration.md`、`manifest.json`、`specs/`、`plans/`。

## 实现前核准清单

实现计划开始前必须重新打开对应官方文档，固定本次实现使用的 hook lifecycle event 和配置 schema：

- Codex：确认 `.codex/hooks.json` 的 event、matcher、command 字段，以及 `.codex/agents/*.toml` 的字段。
- Claude：确认 `.claude/settings.json` 的 hooks 字段，以及 `.claude/agents/*.md` 的 frontmatter 字段。
- Git：确认目标仓库 hook 安装路径，使用 `git rev-parse --git-path hooks/pre-commit`，兼容 worktree。

Cursor、Gemini、Windsurf、Copilot 不进入第一版 hook adapter 范围。后续只有完成官方接入文档调研并补充模板后，才允许在 Skill init 选项中出现。

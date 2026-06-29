# quick-init Skill-only 项目治理初始化设计

日期：2026-06-29

状态：已根据评审修订，待复审。

## 背景

`quick-init` 不再定位为需要通过 npm 安装的 CLI。它应当是一个 Skill-only 的项目治理初始化器：用户在目标仓库中调用 Skill，当前 coding agent 根据多轮对话约束，动态创建标准项目结构和规范元素。

本仓库只维护基础 Markdown 模板、agent 接入模板、hook 模板和规则包。具体落到目标仓库时，由 coding agent 读取这些模板并结合用户约束生成文件。

## 与 2026-06-26 设计的关系与迁移

本设计取代 `2026-06-26-quick-init-governance-design.md` 的用户入口和实现形态。旧设计中的 TypeScript CLI、npm 安装、`quick-init init`、`quick-init archive --staged`、`quick-init iteration ...` 不再作为产品能力保留。

实现时需要废弃或删除的旧实现：

- `package.json` / `package-lock.json` 中的 npm CLI 发布、构建和测试入口。
- `cli.ts`、`src/**`、`tests/**`、`vitest.config.ts`、`tsconfig.json` 等 CLI 实现与测试。
- `dist/**` 构建产物。
- README 和 `SKILL.md` 中所有 `quick-init init/archive/iteration` 命令说明。
- 旧 pre-commit hook 中调用 `quick-init archive --staged` 的 block。

迁移策略：

- 已经 `npm link` 的用户需要执行 `npm unlink quick-init` 或删除全局 link；新版本不提供兼容命令。
- 已经使用旧版初始化过的项目，可以重新运行 Skill-only init。新 init 必须保留已有 `.coding-rules/**`、`docs/iterations/**`、`docs/changelog.md`，并只迁移 hook 和 agent 集成。
- 旧 iteration 目录作为共享事实源保留；本地 `.quick-init/state/**` 可以重建。

## Skill 安装与模板访问

第一版只支持源码式 Skill 分发，不提供 npm 包。

用户获取方式：

```bash
git clone <quick-init-repo> ~/.codex/skills/quick-init
git clone <quick-init-repo> ~/.claude/skills/quick-init
```

如果目标运行时支持 repo-local skill，也可以把本仓库放在目标项目的 agent-specific skill 目录中，但必须以对应官方文档验证加载规则。

模板访问规则：

- `SKILL.md` 必须把本仓库根目录视为 Skill root。
- 所有模板路径都相对 Skill root 解析，例如 `templates/coding-rules/python.md`。
- 模板不内联进 `SKILL.md`，避免 Skill 入口过大。
- Skill 执行前必须确认 `templates/**` 可读；不可读时停止初始化，不生成半成品。
- agent adapter 的安装路径必须来自对应 agent 官方文档或已验证接入文档；不能靠 `AGENTS.md`、`CLAUDE.md` 这类入口说明文件代替 hook 注册。

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
    documentation.md
    git-workflow.md
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
    codex/
      hooks.json.md
      commit-governance.toml.md
      trigger.py.md
    claude/
      settings.json.md
      commit-governance.md
      trigger.sh.md
  subagents/
    commit-governance-core.md
  hooks/
    git-pre-commit-guard.md
```

`agent-integrations/` 只保存已经查过官方或接入文档的 adapter。第一版只确认 Codex 和 Claude。Cursor、Gemini、Windsurf、Copilot 等需要先补充对应官方 hook/config 文档，再新增 adapter。

`templates/subagents/commit-governance-core.md` 是平台无关的职责说明，不直接复制到目标项目。Codex 和 Claude adapter 需要把这份核心说明渲染成各自平台的最终格式：

- Codex：`.codex/agents/commit-governance.toml`
- Claude：`.claude/agents/commit-governance.md`

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

## Specs / Plans 分类规则

commit-governance 子 agent 必须优先使用确定性规则，再用语义判断兜底。

处理动作：

- `archive`：移动到当前 iteration 的 `specs/` 或 `plans/`。
- `summarize-only`：不移动原文件，只在 `iteration.md` 和 `manifest.json` 中记录。
- `skip`：跳过空文件、模板占位文件、已经在 `docs/iterations/**` 下的归档文件。

分类优先级：

1. 路径明确：
   - `**/specs/**`、`**/requirements/**`、`**/prd/**`、`**/stories/**` -> `specs/`
   - `**/plans/**`、`**/implementation/**`、`**/verification-plan/**` -> `plans/`
2. 文件名或 H1 明确：
   - 包含 `spec`、`requirement`、`prd`、`story`、`需求`、`规格`、`用户故事` -> `specs/`
   - 包含 `plan`、`design`、`implementation`、`verification`、`计划`、`设计`、`实现`、`验证` -> `plans/`
3. 文档职责明确：
   - `docs/onboard/**`、`docs/architecture/**`、`docs/decisions/**`、`docs/changelog.md` -> `summarize-only`
   - `.coding-rules/**`、`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、`.codex/**`、`.claude/**` -> `summarize-only`
4. 仍无法判断时，阻塞提交并要求用户或主 agent 明确归档类别，不能随意移动。

`manifest.json` 必须记录每个 staged Markdown 的 `sourcePath`、`action`、`category`、`targetPath`、`sha256` 和 `reason`。

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

标记块内部由 commit-governance 子 agent 管理。用户手写 changelog 笔记应放在标记块外；如果用户在标记块内手工修改，下一次同步可能被覆盖。

## Active Iteration 状态

共享事实源是 `docs/iterations/**/manifest.json`，本地 `.quick-init/state/active-iteration.json` 只是当前机器的工作偏好。

规则：

- 新 clone 或本地 state 缺失时，agent 从 `docs/iterations/**/manifest.json` 中选择最新 `status = "active"` 的 iteration。
- 如果没有 active manifest，Skill 或 agent 必须询问用户创建新 iteration，不能猜测。
- 如果本地 state 与 manifest 冲突，manifest 优先；agent 更新本地 state。
- 如果存在多个 active manifest，阻塞并要求用户选择一个，同时把其它 manifest 标记为 closed 或 superseded。

## Slug 规则

iteration 路径格式：

```text
YYYY-MM-DD-<topic-slug>
```

slug 生成：

- 保留中文、英文、数字、连字符和下划线。
- 空白折叠为单个 `-`。
- 删除路径分隔符、控制字符和 shell 特殊字符。
- 长度限制为 80 个 Unicode 字符。
- 为空时使用 `iteration`。
- 路径冲突时追加 `-2`、`-3` 等后缀。

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

## Commit Governance 触发链路

提交前治理必须从 coding agent 的 hook/workflow 自动触发；主 agent 不主动读取完整 diff。

重要边界：

- agent-specific hook 的 shell command 不等于子 agent 本身。
- 如果平台提供直接启动 subagent 的 hook API，adapter 可以直接调用。
- 如果平台只允许执行 shell command，trigger script 只能写入触发状态并向 host agent 返回阻塞/提示信息；host agent 随后必须按 hook 指令启动 `commit-governance` 子 agent。
- 从用户视角，这是一次自动提交前治理；从实现视角，桥接必须显式写清楚，不能假设 shell command 会自动拥有 subagent 调度能力。

### Codex 触发链路

```text
.codex/hooks.json
  -> UserPromptSubmit / PreToolUse hook
  -> .codex/hooks/commit-governance-trigger.py
  -> 写入 .quick-init/state/governance-trigger.json
  -> 要求 Codex 运行 .codex/agents/commit-governance.toml
  -> 子 agent 更新 docs 和 .quick-init/state/last-governance-run.json
  -> 主 Codex 只读取短摘要并继续 commit/push
```

Codex hook 用途：

- `UserPromptSubmit`：识别用户说提交、push、publish、finish iteration、close iteration 等意图。
- `PreToolUse`：拦截 `git commit`、`git push` 等命令；如果 `last-governance-run.json` 不匹配当前 staged docs，则阻塞并要求先运行 commit-governance。

### Claude 触发链路

```text
.claude/settings.json
  -> UserPromptSubmit / PreToolUse hook
  -> .claude/hooks/commit-governance-trigger.sh
  -> 写入 .quick-init/state/governance-trigger.json
  -> 要求 Claude 使用 .claude/agents/commit-governance.md
  -> 子 agent 更新 docs 和 .quick-init/state/last-governance-run.json
  -> 主 Claude 只读取短摘要并继续 commit/push
```

Claude hook 用途：

- `UserPromptSubmit`：识别提交类自然语言请求。
- `PreToolUse`：拦截 `Bash` 中的 `git commit`、`git push`，在治理状态过期时阻塞。

同步性：

- commit-governance 必须同步完成后才能继续提交。
- 如果运行时不支持子 agent 调度，hook 必须阻塞并报告“当前 agent runtime 无法执行 commit-governance 子 agent”，不能降级为主 agent 读取全量 diff。

## Git Pre-commit Guard

Git hook 是兜底校验层，不做智能归档。

生成文件：

```text
.quick-init/hooks/pre-commit-guard.py
.git/hooks/pre-commit
```

`.git/hooks/pre-commit` 只调用 `.quick-init/hooks/pre-commit-guard.py`。

安装策略：

- hook 路径必须通过 `git rev-parse --git-path hooks/pre-commit` 获取，兼容 worktree。
- 已有 `pre-commit` 时，追加 quick-init 标记 block，不覆盖用户内容。
- 标记 block 必须包含 start/end marker，重复 init 时只更新 block。
- 安装失败时回滚本次写入的 hook block 和 `.quick-init/hooks/pre-commit-guard.py`。
- 如果用户 hook 已经非零退出，quick-init 不改变原行为；quick-init guard 只追加自己的校验。

guard 脚本第一版使用 Python 标准库实现，原因是 JSON、路径和 hash 校验用 POSIX sh 容易出错。目标环境必须有 `python3`。没有 `python3` 时，`.git/hooks/pre-commit` 必须阻塞并输出明确错误，不允许静默跳过。Windows 原生支持不进入第一版；Windows 用户需在 WSL 或具备 `python3` 的 Git Bash 环境使用。

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
- 写入 `.quick-init/state/active-iteration.json`。
- 创建首个 iteration 目录，并先写入 seed `iteration.md` 和 `manifest.json`。
- 安装 Git pre-commit guard。
- 触发或要求对应 agent 执行一次 commit-governance，补全初始 manifest 和 iteration 文档。

seed 文件用于解决首次提交的鸡生蛋问题。guard 安装前，`docs/iterations/<initial>/iteration.md` 和 `manifest.json` 必须已经存在。seed manifest 至少包含：

```json
{
  "iteration": "YYYY-MM-DD-初始化项目治理",
  "status": "active",
  "changelogSynced": false,
  "documents": [],
  "createdBy": "quick-init-skill"
}
```

如果首次 commit-governance 运行失败，Skill 必须停止并报告 blocker，不继续提交。

## 覆盖策略

初始化必须保护已有项目：

- 已存在文件不直接覆盖。
- 可合并文件按标记块更新。
- 不可安全合并时生成旁路建议文件，例如 `<path>.quick-init-proposed.md`。
- 所有修改由当前 coding agent 展示摘要，用户确认后再提交。

## 测试与验收策略

Skill-only 仍然需要可重复验证，不能只靠人工阅读。

自动化验证：

- 模板快照测试：渲染 `templates/coding-rules/**`、`templates/docs/**`，确认生成路径和关键章节稳定。
- adapter 快照测试：分别渲染 Codex 和 Claude adapter，确认 `.codex/hooks.json`、`.codex/agents/commit-governance.toml`、`.claude/settings.json`、`.claude/agents/commit-governance.md` 的结构可解析。
- guard 单测：用临时 Git 仓库覆盖 missing manifest、stale `last-governance-run.json`、已有 pre-commit 追加、worktree hook path、缺少 changelog block、缺少 `python3` 提示。
- 分类规则测试：覆盖 path、filename、H1、summarize-only、skip 和 unclear blocker。
- slug 测试：覆盖中文、空白、特殊字符、长度限制和冲突后缀。

Skill 验证：

- 按 writing-skills 的 TDD 思路准备至少三个压力场景：
  - 空仓库初始化。
  - 已有 docs 和已有 pre-commit 的仓库初始化。
  - 用户直接要求 `git commit`，验证 agent hook 是否触发 commit-governance，而不是让主 agent 读取全量 diff。
- 每个压力场景先记录无 Skill 或旧 Skill 的失败行为，再验证新 Skill 是否收敛。
- 人工 e2e 记录写入本仓库 `docs/iterations/<implementation-iteration>/iteration.md`。

## 验收标准

- 新用户不需要 npm install 或 npm link。
- README 和 `SKILL.md` 不再出现 `quick-init init/archive/iteration` 作为推荐入口。
- 旧 TypeScript CLI 实现被删除或迁移出产品路径，不再与 Skill-only 入口并存。
- Skill 能在空仓库生成标准治理结构。
- Skill 能在已有仓库合并生成规范文件，不覆盖用户内容。
- Codex 选择后生成 `.codex/hooks.json` 和 `.codex/agents/commit-governance.toml`。
- Claude 选择后生成 `.claude/settings.json` 和 `.claude/agents/commit-governance.md`。
- Git pre-commit guard 能阻塞未完成治理归档的提交。
- 新 iteration 第一次提交时，上一轮 iteration 被同步到 `docs/changelog.md`。
- iteration 目录只包含 `iteration.md`、`manifest.json`、`specs/`、`plans/`。
- 已有 `pre-commit` 被保留，quick-init 只更新自己的标记 block。

## 实现拆分

建议按以下顺序实现：

1. 删除或隔离旧 CLI，重写 README 和 `SKILL.md` 为 Skill-only 入口。
2. 建立 Markdown 模板目录，包括 coding rules、docs rules、project structure。
3. 建立 Codex adapter，渲染 `.codex/hooks.json`、`.codex/agents/commit-governance.toml` 和 trigger script。
4. 建立 Claude adapter，渲染 `.claude/settings.json`、`.claude/agents/commit-governance.md` 和 trigger script。
5. 实现 Git pre-commit guard 模板和已有 hook 标记 block 更新策略。
6. 实现 commit-governance 核心说明模板和 specs/plans 分类规则。
7. 实现 Skill init 流程文档：问题顺序、覆盖策略、seed iteration、初始 commit-governance。
8. 补齐快照测试、guard 单测、分类规则测试和 Skill 压力场景验收。

## 实现前核准清单

实现计划开始前必须重新打开对应官方文档，固定本次实现使用的 hook lifecycle event 和配置 schema：

- Skill 安装：确认 Codex 和 Claude 当前官方支持的本地 Skill 安装路径。
- Codex：确认 `.codex/hooks.json` 的 event、matcher、command 字段，以及 `.codex/agents/*.toml` 的字段。
- Claude：确认 `.claude/settings.json` 的 hooks 字段，以及 `.claude/agents/*.md` 的 frontmatter 字段。
- Git：确认目标仓库 hook 安装路径，使用 `git rev-parse --git-path hooks/pre-commit`，兼容 worktree。

Cursor、Gemini、Windsurf、Copilot 不进入第一版 hook adapter 范围。后续只有完成官方接入文档调研并补充模板后，才允许在 Skill init 选项中出现。

# quick-init 全量治理初始化设计

日期：2026-06-26

状态：已确认，待实现计划拆分。

## 背景

`quick-init` 面向个人开发者，用自然语言描述业务和技术栈，一键初始化一套可持续 vibecoding 的工程治理体系。它不是只生成代码目录或 AI 指令文件，而是同时生成规则源、文档结构、归档 subagent、hook 自动化和初始化归档。

当前设计采用“硬骨架确定性生成 + 软内容 AI 生成”的混合方案：

- 硬层：目录结构、文件命名、hook 入口、归档数据结构、Git 行为。
- 软层：AI 工具指令内容、coding rules 细节、文档摘要和归档说明。

## 目标

- 根据一段自然语言描述初始化完整工程治理层。
- 默认全量治理，不提供轻量、标准、严格档位。
- 覆盖主流 AI coding 工具入口。
- 使用统一规则源降低多工具规则漂移。
- 自动安装 Git hooks，并在提交包含 Markdown 文档时自动分类归档。
- 初始化后自动创建第一份治理初始化归档，并自动提交 quick-init 生成的治理文件。

## 非目标

- 不在默认设计里创建 implementation/debugging/review 等开发流程 subagent。
- 不强制每次代码提交都必须包含 Markdown 文档。
- 不根据代码 diff 编造文档。
- 不把本机运行状态提交到仓库。
- 不在 hook 里塞复杂归档逻辑，hook 只调用归档器命令。

## 工具形态

`quick-init` 是一个 Claude Code Skill，技术实现采用 TypeScript 和 Node.js。核心命令包括：

```bash
quick-init init "<业务描述>"
quick-init archive --staged
quick-init iteration status
quick-init iteration start "<name>"
quick-init iteration close
```

`quick-init init` 负责初始化治理工程。`quick-init archive --staged` 是 hook 和人工命令共用的归档处理器。

## 初始化配置模型

初始化阶段使用 `InitializationSpec`，覆盖项目、治理、工具和自动化四个层面。

```ts
interface InitializationSpec {
  project: {
    name: string
    description: string
    domain: string
    techStack: {
      language: string
      runtime?: string
      framework?: string
      packageManager?: string
      database?: string
      orm?: string
      testing?: string[]
      deployment?: string
    }
    features: string[]
    integrations: string[]
  }

  governance: {
    mode: 'full'
    codingRules: true
    commitRules: true
    iterationArchive: true
    docsSync: true
    documentationSubagent: true
    architectureDecisionRecords: true
  }

  tools: {
    claude: true
    codex: true
    cursor: true
    gemini: true
    copilot: true
    windsurf: true
  }

  automation: {
    gitHooks: true
    claudeHooks: true
    docArchiveCommand: true
    cheapModelDocSummary: true
    fallbackToManifestOnly: true
  }
}
```

解析策略：

- 由 Skill 指引当前 AI 会话从用户自然语言中提取配置。
- 提取后向用户展示确认，再执行初始化。
- parser 本身不必直接调用外部 AI API。

## 生成目录结构

全量治理默认生成：

```text
project-root/
  .claude/
    settings.json
  .cursor/
    rules/
      general.mdc
      domain.mdc
  .github/
    copilot-instructions.md
  .coding-rules/
    style.md
    architecture.md
    testing.md
    security.md
    git-workflow.md
    documentation.md
  agents/
    documentation.md
  docs/
    architecture.md
    tech-stack.md
    changelog.md
    specs/
      _README.md
    designs/
      _README.md
    verification/
      _README.md
    decisions/
      _README.md
    research/
      _README.md
    iterations/
      _README.md
  scripts/
    hooks/
      install_git_hooks.ts
      archive_iteration.ts
      check_iteration_docs.ts
      prepare_commit_summary.ts
  CLAUDE.md
  AGENTS.md
  GEMINI.md
  .windsurfrules
  .gitignore
```

`.coding-rules/` 是统一规则源。各 AI 工具入口文件围绕这套规则源生成摘要、引用或适配内容。

## Documentation Subagent

默认只生成一个 subagent：

```text
agents/documentation.md
```

职责：

- 在归档时读取 staged Markdown、staged diff、现有 docs 和归档 manifest。
- 对 staged Markdown 自动分类。
- 将需要归档的文档移动到 `docs/iterations/<date>-<slug>/`。
- 生成或更新 `iteration.md` 和 `manifest.json`。
- 必要时更新 `docs/changelog.md`、`docs/architecture.md`、`docs/tech-stack.md`。

权限边界：

- 可以修改 `docs/**` 下的文档和归档文件。
- 不可以修改业务源码、测试代码、依赖文件和运行配置。
- 证据不足时必须标记“未确认”或“无法判断”，不能编造实现细节。

## 本地运行态

`.quick-init/` 只保存本地状态和本机配置，不提交仓库。

```text
.quick-init/
  config.json
  state/
    active-iteration.json
    archive-cache.json
```

初始化时默认将 `.quick-init/` 写入 `.gitignore`。

示例配置：

```json
{
  "archive": {
    "enabled": true,
    "autoStage": true,
    "aiSummary": true,
    "model": "cheap",
    "timeoutMs": 30000,
    "fallbackToManifestOnly": true
  },
  "hooks": {
    "preCommitArchive": true
  }
}
```

## Git 初始化与 Hook 安装

`quick-init init` 默认检查 Git 仓库状态：

- 如果当前目录不是 Git 仓库，自动执行 `git init`。
- 如果已经是 Git 仓库，不重复初始化。
- 自动安装 `.git/hooks/pre-commit`。
- 如果已有 `pre-commit`，追加带标记的 quick-init block，不覆盖用户已有 hook。
- 如果没有 `pre-commit`，创建 hook 并赋予执行权限。

pre-commit hook 只调用：

```bash
quick-init archive --staged
```

归档逻辑不写进 hook。

## Markdown 自动归档策略

`quick-init archive --staged` 读取本次 staged files，筛选 staged Markdown，并逐个自动检查：

```text
路径 + 文件名 + H1 标题 + 正文结构 + 关键词
  -> 判断文档类型
  -> 决定处理动作
```

处理动作：

- `archive`：移动进当前 iteration 目录。
- `keep`：保留原位，不进入摘要。
- `summarize-only`：保留原位，但进入本轮归档索引和摘要。
- `skip`：模板、空文档、占位文档，不处理。

默认分类倾向：

```text
docs/specs/**         -> archive
docs/designs/**       -> archive
docs/verification/**  -> archive
docs/decisions/**     -> archive
docs/research/**      -> archive
README.md             -> summarize-only 或 keep
docs/architecture.md  -> summarize-only
docs/tech-stack.md    -> summarize-only
.coding-rules/**      -> summarize-only
AGENTS.md             -> summarize-only
CLAUDE.md             -> summarize-only
GEMINI.md             -> summarize-only
_README.md            -> skip
```

无法判断时默认 `summarize-only`，不移动原文件。

如果本次提交没有 staged Markdown，归档器不阻断提交，只可选打印提示。

## 归档目录命名

归档目录格式：

```text
docs/iterations/YYYY-MM-DD-<slug>/
```

`slug` 优先从 staged Markdown 标题自动推断：

1. staged Markdown 中第一个明确 H1 标题。
2. staged Markdown 文件名。
3. staged Markdown 内容中的需求、设计或标题字段。
4. commit message。
5. fallback 为 `iteration`。

多文档提交时，优先选择主文档标题：

```text
spec > design > verification > decision > research > README/rules
```

中文标题保留中文。英文转小写。空格、斜杠、冒号、括号等特殊符号转 `-`，连续 `-` 合并，最长 60 字符。目录冲突时追加序号。

示例：

```text
docs/iterations/2026-06-26-支付流程设计/
```

## 跨 Commit 迭代识别

一个 iteration 可以跨多个 commit。

本地 active iteration 状态保存在：

```text
.quick-init/state/active-iteration.json
```

识别顺序：

1. 读取本地 active iteration。
2. 扫描 `docs/iterations/*/manifest.json` 中 `status=active` 的 iteration。
3. 根据 staged Markdown 标题、路径、正文关键词匹配已有 iteration。
4. 匹配成功则归入已有 iteration。
5. 匹配失败则创建新 iteration。
6. 更新本地 active iteration 状态。

共享事实源是 `docs/iterations/**/manifest.json`，不是 `.quick-init/state/**`。

## Manifest 事实源

每个归档目录包含：

```text
docs/iterations/<date>-<slug>/
  iteration.md
  manifest.json
  specs/
  designs/
  verification/
  decisions/
  research/
```

`manifest.json` 是机器可读事实源，记录所有 staged Markdown 的处理结果和每次归档 run。

示例结构：

```json
{
  "iteration": "2026-06-26-支付流程设计",
  "status": "active",
  "summaryStatus": "ok",
  "slugSource": {
    "type": "markdown-title",
    "path": "docs/designs/payment.md",
    "title": "支付流程设计"
  },
  "archiveRuns": [
    {
      "runId": "2026-06-26T10-00-00",
      "commit": "pending",
      "documents": [
        {
          "sourcePath": "docs/designs/payment.md",
          "archivePath": "docs/iterations/2026-06-26-支付流程设计/designs/payment.md",
          "category": "design",
          "action": "archive",
          "reason": "path matched docs/designs and title looks like design document",
          "sha256": "..."
        }
      ]
    }
  ]
}
```

## AI 摘要与降级策略

归档优先尝试 AI 摘要，使用本地 `.quick-init/config.json` 指定的便宜模型、超时和降级策略。

默认策略：

- `aiSummary=true`：尝试生成高质量 `iteration.md`。
- `fallbackToManifestOnly=true`：AI 不可用、失败或超时时，生成基础 manifest 和 degraded iteration。
- 降级不阻断 commit。

降级版 `iteration.md` 必须明确标记：

```text
summary_status: degraded
reason: AI summary unavailable
```

## 初始化归档

`quick-init init` 初始化完成后自动创建第一份归档：

```text
docs/iterations/YYYY-MM-DD-初始化工程治理/
  iteration.md
  manifest.json
```

该归档记录：

- 生成了哪些 AI 工具入口文件。
- 生成了哪些规则源文件。
- 生成了哪些 docs 目录和模板。
- 是否初始化 Git 仓库。
- 是否安装 hook。
- 哪些本地文件只记录不提交，例如 `.quick-init/config.json` 和 `.git/hooks/pre-commit`。

初始化归档不是从 staged Markdown 分类而来，而是 quick-init 初始化行为的审计记录。

## 初始化自动提交

`quick-init init` 默认自动创建第一次提交：

```bash
git commit -m "chore: initialize quick-init governance"
```

提交策略：

- 允许在 dirty repo 中运行。
- 只 stage quick-init 本次生成或修改的文件。
- 不执行 `git add -A`。
- 不提交 `.quick-init/**`。
- 不提交 `.git/hooks/**`。
- 不 stage 或 unstage 用户已有无关变更。
- 如果 quick-init 需要修改的文件已有用户改动，先做冲突检测；不可安全合并时停止。

默认可提交范围：

```text
CLAUDE.md
AGENTS.md
GEMINI.md
.cursor/rules/**
.github/copilot-instructions.md
.windsurfrules
.coding-rules/**
docs/**
agents/documentation.md
scripts/hooks/**
.gitignore
```

## 错误处理

- Git 不可用：停止初始化并提示安装 Git。
- 非 Git 仓库：自动 `git init`。
- Hook 安装失败：初始化继续，但明确提示手动安装命令。
- AI 摘要失败：降级为 manifest-only 归档，允许提交。
- staged Markdown 无法分类：默认 `summarize-only`。
- 归档目录冲突：自动追加序号。
- 多个 active iteration 匹配：停止归档，提示用户选择。
- 文件移动或 staging 失败：阻断本次提交，避免半归档状态。

## 测试策略

需要覆盖：

- 自然语言到 `InitializationSpec` 的解析确认。
- 新仓库自动 `git init`。
- 已有仓库不重复初始化。
- dirty repo 下 scoped staging 和自动 commit。
- pre-commit hook 追加而非覆盖。
- staged Markdown 自动分类。
- `archive` 文档移动和 `summarize-only` 文档保留。
- 中文 slug 生成。
- AI 摘要失败时 manifest-only 降级。
- 跨 commit active iteration 识别。
- `iteration close` 标记 closed 并清理本地 active state。

## 待实现计划入口

本设计通过后，下一步使用 writing-plans 流程拆分实现计划。实现计划应至少拆成：

1. Skill 目录和 TypeScript CLI 骨架。
2. 初始化生成器。
3. 本地 `.quick-init/` 配置和状态管理。
4. Git 初始化、hook 安装和 scoped commit。
5. Markdown 分类与归档器。
6. manifest 与 iteration 文档生成。
7. AI 摘要适配与降级。
8. 测试与端到端验证。

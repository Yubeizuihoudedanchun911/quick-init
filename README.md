# quick-init

中文 | [English](#english)

`quick-init` 是一个 TypeScript CLI，用来给项目初始化完整的 vibecoding 治理层：AI 编程入口、共享编码规范、文档工作区、documentation subagent、本地归档状态、Git hooks，以及 staged Markdown 的迭代归档流程。

## 功能概览

- 一条命令初始化完整治理文件。
- 只生成 `agents/documentation.md` 作为默认 subagent。
- 自动把 `.quick-init/` 作为本地状态加入 `.gitignore`。
- 安装 pre-commit hook，调用 `quick-init archive --staged`。
- 根据 staged Markdown 自动分类并归档到 `docs/iterations/`。
- AI 摘要不可用时降级为基础 manifest 归档，不阻塞提交。
- 支持本地 active iteration 的 `status`、`start`、`close`。

## 快速开始

```bash
npm install
npm run build
node dist/cli.js init "TypeScript CLI 工具"
```

作为已安装的 CLI 使用时：

```bash
quick-init init "TypeScript CLI 工具"
quick-init archive --staged
quick-init iteration status
quick-init iteration start "支付流程设计"
quick-init iteration close
```

## 命令说明

### `quick-init init "<业务描述>"`

初始化治理文件，并只提交 quick-init 生成的治理产物。

生成内容包括：

- `CLAUDE.md`、`AGENTS.md` 等 AI 工具入口文件。
- `.coding-rules/` 共享编码与提交规则。
- `agents/documentation.md` 作为唯一默认 subagent。
- `docs/specs/`、`docs/designs/`、`docs/verification/`、`docs/decisions/`、`docs/research/`、`docs/iterations/`。
- `.quick-init/config.json` 本地运行配置。
- 调用 `quick-init archive --staged` 的 pre-commit hook。

### `quick-init archive --staged`

读取 Git index 中的 staged Markdown 内容，分类并归档到：

```text
docs/iterations/<iteration>/
  manifest.json
  iteration.md
  <category>/<document>.md
```

归档命令会：

- 只处理 staged Markdown，不吞掉未暂存的工作区编辑。
- 写入机器可读的 `manifest.json`。
- 写入人类可读的 `iteration.md`。
- 只 stage 本次生成或移动的归档文件。
- 在归档失败时回滚文件和 index 状态，避免半归档。

### `quick-init iteration status`

显示当前本地 active iteration；没有时输出 `No active iteration`。

### `quick-init iteration start "<name>"`

写入 `.quick-init/state/active-iteration.json`，创建带日期的 iteration slug 和 `docs/iterations/<iteration>` 路径。

### `quick-init iteration close`

如果 active iteration 的 manifest 存在，则把 `status` 标记为 `closed`，然后清理本地 active iteration 状态。

## 实践案例

下面示例展示一个功能迭代从初始化治理到自动归档的完整流程。

### 1. 初始化项目治理

```bash
quick-init init "支付系统 TypeScript CLI"
```

结果：

- 生成 AI 工具入口、编码规则和文档目录。
- 写入 `.quick-init/config.json`，并确保 `.quick-init/` 被忽略。
- 安装 pre-commit hook。
- 创建初始化治理归档。
- 只提交 quick-init 生成的治理文件。

### 2. 开始一个功能迭代

```bash
quick-init iteration start "支付流程设计"
```

本地状态会指向：

```text
docs/iterations/YYYY-MM-DD-支付流程设计
```

### 3. 编写并暂存设计文档

```bash
mkdir -p docs/designs
cat > docs/designs/payment.md <<'EOF'
# 支付流程设计

设计内容...
EOF

git add docs/designs/payment.md
```

### 4. 自动归档 staged Markdown

```bash
quick-init archive --staged
```

归档后会生成：

```text
docs/iterations/YYYY-MM-DD-支付流程设计/
  designs/payment.md
  manifest.json
  iteration.md
```

`manifest.json` 会记录文档来源、归档目标、分类、sha256 和摘要状态。AI 摘要不可用时，`summaryStatus` 会降级为 `degraded`，提交仍可继续。

### 5. 提交代码

```bash
git status --short
git commit -m "feat: add payment flow design"
```

pre-commit hook 会再次调用 `quick-init archive --staged`。如果没有 staged Markdown，提交不会被阻塞。

### 6. 关闭迭代

```bash
quick-init iteration close
git add docs/iterations/YYYY-MM-DD-支付流程设计/manifest.json
git commit -m "docs: close payment iteration"
```

关闭后，manifest 的 `status` 会变为 `closed`，后续归档不会再通过共享 manifest 自动复用这个 iteration。

## 开发

```bash
npm install
npm test
npm run typecheck
npm run build
```

构建后的入口：

```bash
node dist/cli.js
```

## 仓库状态

当前完整实现发布在 `master`。旧的 `main` 分支只保留早期设计与计划基线。

---

## English

`quick-init` is a TypeScript CLI for initializing a full vibecoding governance layer in a project. It generates AI coding entrypoints, shared coding rules, documentation workspaces, a documentation subagent, local archive state, Git hooks, and an iteration archive flow for staged Markdown files.

## Features

- Initialize governance files with one command.
- Generate only `agents/documentation.md` as the default subagent.
- Keep `.quick-init/` as ignored local runtime state.
- Install a pre-commit hook that calls `quick-init archive --staged`.
- Classify and archive staged Markdown into `docs/iterations/`.
- Degrade to a manifest-only archive when AI summary generation is unavailable.
- Manage local active iterations with `status`, `start`, and `close`.

## Quick Start

```bash
npm install
npm run build
node dist/cli.js init "TypeScript CLI tool"
```

When installed as a CLI:

```bash
quick-init init "TypeScript CLI tool"
quick-init archive --staged
quick-init iteration status
quick-init iteration start "Payment flow design"
quick-init iteration close
```

## Commands

### `quick-init init "<business description>"`

Initializes governance files and commits only quick-init generated governance artifacts.

Generated files include:

- AI tool entry files such as `CLAUDE.md`, `AGENTS.md`, and related assistant instructions.
- Shared `.coding-rules/` for coding and commit rules.
- `agents/documentation.md` as the only default subagent.
- Documentation workspaces under `docs/`.
- `.quick-init/config.json` as local runtime config.
- A pre-commit hook that runs `quick-init archive --staged`.

### `quick-init archive --staged`

Reads staged Markdown content from the Git index, classifies it, and archives it into:

```text
docs/iterations/<iteration>/
  manifest.json
  iteration.md
  <category>/<document>.md
```

The archive command:

- Handles staged Markdown without consuming unstaged working-tree edits.
- Writes machine-readable `manifest.json` facts.
- Writes human-readable `iteration.md`.
- Stages only files generated or moved by the archive operation.
- Rolls back file and index changes on archive failures.

### `quick-init iteration status`

Prints the current local active iteration, or `No active iteration`.

### `quick-init iteration start "<name>"`

Writes `.quick-init/state/active-iteration.json` with a dated iteration slug and `docs/iterations/<iteration>` path.

### `quick-init iteration close`

Marks the active iteration manifest as `closed` when it exists, then clears local active iteration state.

## Practical Case

This example shows a feature iteration from governance initialization to automatic Markdown archival.

### 1. Initialize governance

```bash
quick-init init "Payment TypeScript CLI"
```

Result:

- AI entry files, coding rules, and documentation directories are generated.
- `.quick-init/config.json` is written and `.quick-init/` is ignored.
- A pre-commit hook is installed.
- Initial governance archive files are created.
- Only quick-init generated governance files are committed.

### 2. Start a feature iteration

```bash
quick-init iteration start "Payment flow design"
```

Local state points to:

```text
docs/iterations/YYYY-MM-DD-payment-flow-design
```

### 3. Write and stage a design document

```bash
mkdir -p docs/designs
cat > docs/designs/payment.md <<'EOF'
# Payment Flow Design

Design details...
EOF

git add docs/designs/payment.md
```

### 4. Archive staged Markdown

```bash
quick-init archive --staged
```

Generated archive files:

```text
docs/iterations/YYYY-MM-DD-payment-flow-design/
  designs/payment.md
  manifest.json
  iteration.md
```

`manifest.json` records source path, archive path, classification, sha256, and summary status. If AI summary generation is unavailable, `summaryStatus` degrades to `degraded` and the commit can continue.

### 5. Commit

```bash
git status --short
git commit -m "feat: add payment flow design"
```

The pre-commit hook calls `quick-init archive --staged` again. If no Markdown files are staged, the commit is not blocked.

### 6. Close the iteration

```bash
quick-init iteration close
git add docs/iterations/YYYY-MM-DD-payment-flow-design/manifest.json
git commit -m "docs: close payment iteration"
```

After close, the manifest `status` is `closed`, so later archive runs will not reuse this iteration through shared manifest matching.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

Built entrypoint:

```bash
node dist/cli.js
```

## Repository Status

The complete implementation is published on `master`. The older `main` branch contains only the early design and planning baseline.

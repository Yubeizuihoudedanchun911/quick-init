# quick-init Skill 全面重构设计

日期：2026-06-30

状态：待复审

## 背景

quick-init 已完成 Skill-only 转型（2026-06-29 设计），基础功能可用，51 个测试全部通过。但通过全面审查发现 18 个不足点，涵盖 SKILL.md 流程、模板内容深度、adapter 链路完整性和架构能力缺失。本设计一次性解决所有问题。

## 与 2026-06-29 设计的关系

本设计是 2026-06-29 Skill-only 设计的增强迭代，不改变核心架构（Skill + 模板 + agent 渲染），而是补全缺失能力和提升内容质量。2026-06-29 设计中的所有验收标准仍然有效。

## 问题清单

### SKILL.md 流程层面

1. **缺少 Gemini adapter 选项但已生成 GEMINI.md**：步骤 6 只问 Codex/Claude，但 `templates/agent-instructions/GEMINI.md` 存在。应区分 "agent 入口文件" 和 "agent hook 集成"。
2. **缺少 update / re-init 能力**：只有首次初始化，没有增量更新模板的流程。
3. **缺少 .gitignore 写入步骤**：设计文档要求 `.quick-init/` 写入 `.gitignore`，但 Required Flow 无此步骤。
4. **缺少 templates 可读前置检查**：设计文档要求 "Skill 执行前确认 templates/** 可读"，但 Required Flow 无此步骤。

### 模板 / 规则层面

5. **Coding rules 过于简略**：每个语言文件只有 4-5 条一行规则，不足以约束 agent 行为。
6. **Docs 模板只有一行描述**：没有结构骨架，agent 生成结果格式不一致。
7. **Agent instruction 文件三份完全相同**：没有利用各 agent 的差异化能力。
8. **缺少 Go / Rust 语言规则**：只有 python、java、typescript、generic。
9. **缺少设计原则和代码质量标准**：只有战术层面的编码规则，缺少 SOLID、Clean Code 等设计原则。

### Adapter / Hook 链路层面

10. **Claude agent-trigger.py 缺失**：`trigger.sh.tmpl` 委托给 `.quick-init/hooks/agent-trigger.py`，但没有对应模板。Claude 触发链路实际断链。
11. **Claude 和 Codex trigger 逻辑不对称**：Codex 有完整 trigger（280 行），Claude 只有 3 行 shell wrapper。
12. **Codex trigger 的 prompt intent 检测过于复杂**：20+ 个正则，嵌套否定逻辑，维护困难。
13. **Codex agent 模型硬编码 gpt-5.4-mini**：模型会过时。
14. **Claude agent 模型硬编码 haiku**：同上。
15. **trigger.sh 没有错误处理**：缺少 python3 可用性和脚本存在性检查。

### 测试层面

16. **缺少 Claude 完整触发链路集成测试**：Codex 有多个集成测试，Claude 只有 wrapper 测试。
17. **没有端到端 Skill 执行测试**：没有模拟完整 init 流程的测试。

### 架构层面

18. **没有版本管理机制**：目标项目不知道被哪个版本 init。
19. **commit-governance-core.md 与 adapter 模板有重复**：三处各自编写分类规则，更新时需同步三个文件。

## 设计

### 一、SKILL.md 流程重构

重构后的 Required Flow（19 步）：

1. 确认 Skill root 下 `templates/**` 可读；不可读时中止。
2. 确认目标仓库根目录。
3. 检测是否已有 quick-init 治理结构（`.quick-init/` 存在）。
   - 首次 init：走完整初始化流程。
   - 已 init：走增量更新流程（只刷新模板和 adapter，不覆盖用户内容）。
4. Ask for project name.
5. Ask for one-sentence project goal.
6. Ask for primary language.
   - Supported: `python`, `java`, `typescript`, `go`, `rust`, `generic`.
7. Ask which agent entry files to install (AGENTS.md, CLAUDE.md, GEMINI.md).
   - 默认全部安装；这些是入口指令文件，不需要 hook 集成也可生成。
8. Ask which agent hook integrations to install (Codex, Claude, or both).
   - 明确说明这是 hook 自动触发集成，不是入口文件。
   - 没有 hook 集成的 agent 仍可通过入口指令文件使用 coding rules。
9. Ask for first iteration name（首次 init 时）。
10. Remove old quick-init prototype artifacts when present.
11. Ensure `.quick-init/` is in `.gitignore`.
12. Read templates from Skill root under `templates/**`.
13. Create the governance structure (coding-rules, docs).
14. Install agent entry instruction files.
15. Install selected agent integration files (hooks, trigger scripts, subagent configs).
16. Create the seed iteration before installing the Git pre-commit guard.
17. Install the Git pre-commit guard.
18. Write `.quick-init/state/init-metadata.json`（记录 init 版本和配置）。
19. Run or request the selected agent's `commit-governance` workflow once.

关键变化：
- 新增步骤 1（templates 可读检查）、3（增量更新检测）、11（.gitignore）、18（版本元数据）。
- 步骤 6 新增 `go` 和 `rust`。
- 步骤 7-8 拆分了 "agent 入口文件" 和 "agent hook 集成" 的选择。
- 增量更新模式下跳过步骤 9-10，只刷新模板文件。

### 二、Templates / 规则体系重构

#### 2.1 新增 design-principles.md

`templates/coding-rules/design-principles.md` 覆盖三个层面：

设计原则：
- 单一职责：每个模块/类/函数只做一件事。
- 开闭原则：对扩展开放，对修改关闭。
- 依赖倒置：依赖抽象而非具体实现。
- 接口隔离：不强迫调用方依赖不需要的接口。
- 最小知识原则：对象只与直接协作者通信。

代码简洁之道：
- 函数保持短小，单层抽象。
- 避免副作用隐藏在命名不体现副作用的函数中。
- 优先用早返回减少嵌套（guard clause）。
- 不在注释中解释 what，只解释 why。
- 避免布尔参数（拆为两个语义明确的函数）。
- 魔法数字/字符串提取为命名常量。
- 错误处理不用异常做流程控制。

可测试性：
- 依赖可注入，不硬编码外部服务地址。
- 纯函数优先：相同输入，相同输出。
- 避免全局可变状态。

具体规则条目需联网调研各语言社区最佳实践后确定最终内容。

#### 2.2 Coding rules 扩展

每个语言文件从 4-5 条扩展到约 10 条规则。具体规则条目需联网调研确定，方向：

- `generic.md`（约 12 条）：现有 5 条 + 命名规范、嵌套限制、公共 API 标注、依赖管控、安全边界验证、禁止硬编码密钥、标准库优先。
- `python.md`（约 10 条）：现有 4 条 + import 排序、dataclass/TypedDict、异常处理、f-string、PEP 8 命名、contextmanager。
- `typescript.md`（约 10 条）：现有 4 条 + interface 优先、避免 any、async rejection 处理、const 优先、明确导出、union type 代替魔法字符串。
- `java.md`（约 10 条）：现有 4 条 + Optional、record、异常处理、Stream API、依赖注入、try-with-resources。
- `go.md`（新增，约 8 条）：error 返回值、context.Context、godoc、table-driven tests、io.Reader/Writer、避免 init()、errgroup、Go naming conventions。
- `rust.md`（新增，约 8 条）：Result<T,E>、clippy、doc comments、derive、生命周期省略、thiserror、避免不必要 clone、cargo test。

#### 2.3 Docs 模板添加结构骨架

`onboard.md` 骨架：

```markdown
# Onboard

## Project Purpose

## Local Setup

## Common Commands

## Key Directories

## Operational Constraints
```

`architecture.md` 骨架：

```markdown
# Architecture

## Module Boundaries

## External Integrations

## Data Flow

## Constraints and Invariants
```

`decision.md` 骨架：

```markdown
# Decisions

Record format: date, context, decision, consequences, rollback notes.
```

`iteration.md` 骨架：

```markdown
# Iterations

Each iteration directory contains `iteration.md`, `manifest.json`, `specs/`, and `plans/`.

## Creating a New Iteration

## Closing an Iteration
```

`changelog.md` 保持不变（有 quick-init marker block 管理）。

#### 2.4 Agent instruction 差异化

共有部分（三个文件都包含）：
- 引用 `.coding-rules/` 下的所有规则文件（generic、documentation、git-workflow、design-principles、语言特定规则）。
- Keep `.quick-init/` local and uncommitted.

CLAUDE.md 新增：
- 使用 Claude 的 Agent tool 或 subagent 执行 commit-governance，不在主 context 中读取完整 staged diff。
- 编辑文件时优先使用 Edit tool 而非 Bash sed/awk。

AGENTS.md 新增：
- 使用 Codex 的 agents/ 配置执行 commit-governance subagent。
- 遵循 `.codex/hooks.json` 的 hook 契约。

GEMINI.md 新增：
- 当前无 hook 集成；commit-governance 需手动触发。

### 三、Adapter / Hook 链路重构

#### 3.1 共享 trigger 逻辑

创建 `templates/hooks/governance-trigger-core.py.tmpl`，包含：
- hash 计算函数
- staged Markdown 文件检测
- intent 识别（读取 `intent-keywords.json`）
- 治理状态比对
- `governance-trigger.json` 写入

SKILL.md 流程中要求 agent 将 core 渲染为 `.quick-init/hooks/governance-trigger-core.py`。

Codex 和 Claude 的 trigger 都重构为薄壳：
- Codex `trigger.py.tmpl`：读取 stdin、解析 payload、调用 core、格式化 Codex 输出。
- Claude `agent-trigger.py.tmpl`（新增）：读取 stdin、解析 payload、调用 core、格式化 Claude 输出。
- Claude `trigger.sh.tmpl`：增加 python3 和文件存在性检查，调用 `agent-trigger.py`。

#### 3.2 Intent 检测简化

重构 `is_submission_related_prompt()` 为两层：

1. 否定排除层：检测明确否定意图（"不要提交"、"don't commit"、"explain"、"what does...do"）→ noop。
2. 肯定匹配层：
   - 强信号词（直接命中）：`commit-governance`、`结束迭代`、`finalize iteration`。
   - 动作词集合匹配：(提交|推送|发布|commit|push|publish) + 非否定上下文。

关键词从 `templates/hooks/intent-keywords.json` 加载，允许用户扩展（日语、韩语等）。

#### 3.3 commit-governance 规则单一事实源

`templates/subagents/commit-governance-core.md` 保持为唯一规则定义。

SKILL.md 流程中要求 agent 将 `commit-governance-core.md` 复制到目标项目 `.quick-init/rules/commit-governance-core.md`。

Codex 和 Claude adapter 模板瘦身为：
- 平台配置：model（占位符 `{{governance_model}}`）、permissions、sandbox_mode、tools。
- 规则引用：声明 "按 `.quick-init/rules/commit-governance-core.md` 执行治理"。

#### 3.4 模型配置外部化

- SKILL.md 流程中新增可选问题："commit-governance 子 agent 使用哪个模型？"
- 提供合理默认值但允许覆盖。
- 模板中使用占位符 `{{governance_model}}`，agent 渲染时替换。

#### 3.5 trigger.sh 错误处理

重构后的 `trigger.sh.tmpl`：

```bash
#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
TRIGGER="${PROJECT_ROOT}/.quick-init/hooks/agent-trigger.py"
if ! command -v python3 >/dev/null 2>&1; then
  echo '{"error":"quick-init: python3 not found"}' >&2
  exit 1
fi
if [ ! -f "$TRIGGER" ]; then
  echo '{"error":"quick-init: agent-trigger.py not found"}' >&2
  exit 1
fi
exec python3 "$TRIGGER" "$@"
```

### 四、架构能力补齐

#### 4.1 版本管理

仓库根目录新增 `VERSION` 文件（纯文本，一行版本号）。

SKILL.md 流程中写入 `.quick-init/state/init-metadata.json`：

```json
{
  "quickInitVersion": "0.2.0",
  "quickInitCommit": "<当前 commit hash>",
  "initDate": "<ISO-8601 timestamp>",
  "language": "python",
  "agentEntryFiles": ["AGENTS.md", "CLAUDE.md", "GEMINI.md"],
  "agentIntegrations": ["codex", "claude"],
  "templateHashes": {
    "coding-rules/generic.md": "sha256:...",
    "coding-rules/python.md": "sha256:..."
  }
}
```

#### 4.2 增量更新流程

SKILL.md 步骤 3 检测到 `.quick-init/` 存在时进入增量更新模式：

1. 读取 `init-metadata.json`，展示当前版本和配置。
2. 对比 `templateHashes` 与当前模板 hash，列出有变化的文件。
3. 询问用户确认更新范围。
4. 合并策略：
   - coding-rules：直接替换（quick-init 管理的规则）。
   - docs 骨架：不替换（用户已填充内容）。
   - agent integration 配置：按 marker block 更新，保留用户自定义 hook。
   - agent entry instructions：追加新规则，不删除用户添加的规则。
5. 更新 `init-metadata.json`。

### 五、目标 Templates 目录结构

```text
templates/
  project-structure/
    generic.md
  coding-rules/
    generic.md
    documentation.md
    git-workflow.md
    design-principles.md          <- 新增
    python.md
    java.md
    typescript.md
    go.md                         <- 新增
    rust.md                       <- 新增
  docs/
    onboard.md                    <- 扩展为骨架
    architecture.md               <- 扩展为骨架
    decision.md                   <- 扩展为骨架
    iteration.md                  <- 扩展为骨架
    changelog.md
  agent-instructions/
    AGENTS.md                     <- 差异化
    CLAUDE.md                     <- 差异化
    GEMINI.md                     <- 差异化
  agent-integrations/
    codex/
      README.md
      hooks.json.tmpl
      agents/
        commit-governance.toml.tmpl   <- 瘦身，规则引用 core
      hooks/
        trigger.py.tmpl               <- 薄壳，调用 core trigger
    claude/
      README.md
      settings.json.tmpl
      agents/
        commit-governance.md.tmpl     <- 瘦身，规则引用 core
      hooks/
        trigger.sh.tmpl               <- 增加错误处理
        agent-trigger.py.tmpl         <- 新增
  subagents/
    commit-governance-core.md
  hooks/
    git-pre-commit-guard.py.tmpl
    governance-trigger-core.py.tmpl   <- 新增
    intent-keywords.json              <- 新增
VERSION                               <- 新增
```

### 六、测试补齐

新增测试：
- `test_design_principles.py`：`design-principles.md` 存在性和关键内容验证。
- `test_new_languages.py`：`go.md`、`rust.md` 存在性和内容验证。
- `test_claude_trigger_integration.py`：Claude 触发链路集成测试（hash 比对、block/noop、intent 检测），与 Codex 对等。
- `test_version_metadata.py`：`VERSION` 文件存在性、`init-metadata.json` 结构验证。

现有测试更新：
- `test_templates.py`：`REQUIRED_TEMPLATES` 列表添加 `go.md`、`rust.md`、`design-principles.md`。
- `test_skill_flow.py`：更新 Required Flow 步骤验证（新增步骤 1、3、6 扩展、7-8 拆分、11、18）。
- `test_adapter_snapshots.py`：更新快照匹配（adapter 瘦身后结构变化）。
- `test_rules.py`：验证 `commit-governance-core.md` 仍包含所有分类规则。

### 七、实施顺序

```
Phase 1: 基础设施
  ├─ 创建 VERSION 文件
  ├─ 联网调研各语言 coding rules 最佳实践
  └─ 创建 design-principles.md

Phase 2: 模板内容
  ├─ 扩展 generic/python/typescript/java coding rules
  ├─ 新增 go.md、rust.md
  ├─ 扩展 docs 模板骨架
  └─ 差异化 agent instruction 文件

Phase 3: Adapter 链路修复
  ├─ 创建 governance-trigger-core.py.tmpl
  ├─ 创建 intent-keywords.json
  ├─ 创建 Claude agent-trigger.py.tmpl
  ├─ 修复 trigger.sh.tmpl 错误处理
  ├─ 重构 Codex/Claude trigger 为薄壳
  └─ 瘦身 commit-governance adapter 模板

Phase 4: SKILL.md 重写
  ├─ 重写 Required Flow（19 步）
  ├─ 新增 Safety Rules
  └─ 更新 README.md

Phase 5: 测试补齐
  ├─ 新模板存在性和内容测试
  ├─ Claude 触发链路集成测试
  ├─ 版本元数据测试
  ├─ 更新现有快照测试
  └─ 确保全部测试通过
```

## 验收标准

在 2026-06-29 设计验收标准基础上新增：

- SKILL.md Required Flow 包含 templates 可读检查、增量更新检测、.gitignore 写入、版本元数据写入。
- SKILL.md 支持 python、java、typescript、go、rust、generic 六种语言。
- SKILL.md 拆分 agent 入口文件和 agent hook 集成为独立选择步骤。
- `templates/coding-rules/design-principles.md` 存在且涵盖设计原则、代码简洁之道、可测试性。
- 每个语言 coding rules 文件包含至少 8 条规则。
- Docs 模板（onboard、architecture、decision、iteration）包含 Markdown 骨架。
- `AGENTS.md`、`CLAUDE.md`、`GEMINI.md` 各含差异化指令。
- `templates/hooks/governance-trigger-core.py.tmpl` 存在且包含共享 trigger 逻辑。
- `templates/hooks/intent-keywords.json` 存在。
- `templates/agent-integrations/claude/hooks/agent-trigger.py.tmpl` 存在。
- Claude `trigger.sh.tmpl` 包含 python3 和文件存在性检查。
- Codex 和 Claude 的 commit-governance adapter 模板引用 `commit-governance-core.md` 作为规则源，不各自重复规则。
- `VERSION` 文件存在。
- 全部新增和修改后的测试通过。

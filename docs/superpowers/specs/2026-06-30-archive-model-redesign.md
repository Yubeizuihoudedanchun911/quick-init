# 目标项目归档模型重设计

日期：2026-06-30

状态：待复审

## 背景

quick-init 为目标项目生成的归档模型存在四个问题：

1. **Decision 记录是空壳**：`decision.md` 模板只有一行描述，没有 ADR 识别机制，重大工程决策埋在 spec 叙事中不可检索。
2. **自动化归档太重**：pre-commit guard + manifest hash 比对 + governance-trigger.json + last-governance-run.json，链路长、状态文件多、阻塞提交。
3. **Iteration 结构过于死板**：强制 `specs/` + `plans/` 子目录，小变更也要走这套结构。
4. **整体文档组织需要重新思考**：onboard 和 architecture 在 init 后不再自动更新，随时间腐化。

同时，目标用户从"个人开发者 vibecoding"扩展为"小团队（2-5 人）"，归档还需服务于团队协作和知识传递。

## 与已有设计的关系

本设计修改 2026-06-29 和 2026-06-30 设计中的**归档模型和触发链路**部分。不改变：
- Skill-only 架构（不恢复 CLI）
- 模板 + agent 渲染的核心机制
- Coding rules 体系
- Agent instruction 差异化

## 设计

### 一、双频归档模型

将归档拆为两个频率，各自独立触发：

| 频率 | 触发时机 | 触发方式 | 做什么 |
|------|---------|---------|-------|
| 高频 | 每次提交 | PreToolUse hook 拦截 `git commit`/`git push` | 发现散落文档 → 移入 iteration、追加 changelog |
| 低频 | iteration 结束 | 开发者显式对主 agent 说"结束迭代" | 提取 decisions、更新 architecture/onboard、关闭 iteration |

两个频率对应两份独立的 sub-agent prompt，按渐进式披露原则分离：agent 在每个模式下只看到与当前任务相关的规则。

### 二、高频层：每次提交

commit-governance 子 agent 在 `git commit` / `git push` 时自动触发，静默完成归档。

#### 2.1 散落文档发现

子 agent **自行判断**哪些 staged 文档应该归档，不使用硬编码路径匹配规则。

判断原则写入 `commit-governance-daily.md`：

> 扫描本次 staged 文件，识别属于当前开发迭代的过程性文档（spec、design、plan、research、技术调研、PRD、用户故事、方案比较、验证报告等），无论它们由什么工具生成、在什么路径。将识别到的文档移入当前 iteration 目录。
>
> 不归档：已在 `docs/iterations/` 中的归档文档、`docs/decisions/` 中的 ADR、全局文档（`docs/onboard/`、`docs/architecture/`）、`docs/changelog.md`、`.coding-rules/`、agent 配置文件、`README.md`。
>
> 无法判断时不移动，在 manifest.json 标记 `unclassified`。

这样 superpowers、bmad、OpenSpec 或任何未来工具产出的文档都能被覆盖，因为 agent 看的是文档内容和性质，不是路径。

#### 2.2 归档目标

散落文档移入当前 iteration 目录，扁平放置：

```
docs/iterations/2026-06-30-<topic>/
  iteration.md
  manifest.json
  some-design-spec.md       ← 从散落位置移入
  impl-plan.md              ← 从散落位置移入
```

不预创建空子目录，不强制 `specs/` + `plans/` 分区。文件名本身含有足够信息，manifest.json 记录类别。

#### 2.3 Changelog 追加

每次提交在 `docs/changelog.md` 顶部追加一条记录：

```markdown
- **<type>**: <一句话摘要> (<short hash>)
```

type 从 commit message 推断（feat/fix/docs/refactor/chore）。不用 marker block，不做格式重排。

纯代码提交（staged 文件中无文档）时仍追加 changelog 记录，因为 changelog 跟踪所有变更，不只是文档变更。

#### 2.4 失败处理

归档失败**不阻塞提交**。子 agent 在返回摘要中报告失败原因，让开发者下次处理。

### 三、低频层：iteration 结束

开发者对主 agent 说"结束迭代"、"close iteration"时，主 agent 启动 summarize 模式的子 agent。

#### 3.1 决策提取

回顾本 iteration 所有归档文档和 changelog 记录，识别重大决策：

| 决策类型 | 典型信号 |
|---------|---------|
| 技术栈变更 | "从 X 迁移到 Y"、"替换 Z"、"废弃 W" |
| 架构重构 | "拆分模块"、"合并服务"、"改变 API 契约" |
| 流程变更 | "从 CLI 改为 Skill"、"测试框架从 Vitest 换 pytest" |
| 方案选择 | 文档中出现多方案比较并选定了一个 |

为每个识别到的决策生成 ADR 草稿到 `docs/decisions/`。

#### 3.2 ADR 格式

```markdown
# ADR-NNNN: <决策标题>

日期：YYYY-MM-DD
状态：accepted
iteration：<关联的 iteration 名称>

## Context

为什么需要做这个决策？当时面临什么问题或约束？

## Decision

选择了什么方案？

## Alternatives Considered

考虑过但放弃的方案及原因。

## Consequences

这个决策带来的正面和负面影响。

## Rollback

如果需要回撤，怎么做？代价多大？
```

命名规则：`docs/decisions/NNNN-<slug>.md`，编号自增，slug 从决策标题生成。

关键约束：
- agent 生成的 ADR 标记 `draft: true`（在 manifest 中）
- agent 不能编造决策动机——原文档没写 why 的，ADR Context 标注"未在原文档中说明，需补充"
- 一个 iteration 可能产出 0 个或多个 ADR

#### 3.3 全局文档更新

- `docs/architecture/README.md`：如有模块边界、数据流、外部集成的结构性变更，更新对应章节
- `docs/onboard/README.md`：如有新命令、新环境要求、新开发入口，更新对应章节
- `docs/decisions/README.md`：更新 ADR 索引表

#### 3.4 关闭 iteration

- 生成/更新 `iteration.md` 的执行摘要和遗留问题
- `manifest.json` 标记 `status: closed`
- `docs/changelog.md` 补充 iteration 级别的分隔标题

### 四、目标项目文档结构

Skill init 后生成：

```
docs/
  onboard/
    README.md              ← 项目背景、开发入口、启动方式
  architecture/
    README.md              ← 模块边界、数据流、关键约束
  decisions/
    README.md              ← ADR 索引（汇总模式自动维护）
  iterations/
    README.md              ← iteration 索引
    YYYY-MM-DD-<topic>/
      iteration.md         ← 本轮主文档
      manifest.json        ← 机器可读索引
      ...                  ← 从散落位置移入的文档（扁平放置）
  changelog.md             ← 每次提交追加记录
```

与当前设计的变化：

| 项目 | 当前 | 新设计 |
|------|------|-------|
| iteration 子目录 | 强制 `specs/` + `plans/` | 扁平放置，不预创建 |
| `docs/decisions/` | 空壳模板 | ADR 索引 + iteration 结束时自动生成 |
| decision.md 模板 | 一行描述 | 完整 ADR 骨架 + README 索引 |
| onboard/architecture | init 后不再更新 | iteration 结束时自动更新 |
| changelog | marker block 同步 | 每次提交追加，简单直接 |

### 五、Sub-agent Prompt 拆分

按渐进式披露拆为三个文件：

```
templates/subagents/
  commit-governance-core.md         ← 共享基础
  commit-governance-daily.md        ← 高频 prompt
  commit-governance-summarize.md    ← 低频 prompt
```

#### 5.1 core.md：共享基础

仅包含两个模式都需要的信息：
- 子 agent 权限边界（只能读写 `docs/`、`.quick-init/`）
- `manifest.json` 格式定义
- iteration 目录命名规则（slug 规则不变）
- 失败处理原则

#### 5.2 daily.md：高频 prompt

加载时机：PreToolUse 拦截 `git commit` / `git push` 时。

内容：
- 散落文档归档判断原则（agent 自行判断，不硬编码路径）
- 归档目标（移入当前 iteration 目录，扁平放置）
- Changelog 追加规则
- manifest.json 更新

#### 5.3 summarize.md：低频 prompt

加载时机：开发者显式说"结束迭代"时，主 agent 启动。

内容：
- 决策提取原则和 ADR 模板
- 全局文档更新规则（architecture、onboard、decisions 索引）
- iteration 关闭流程

### 六、触发链路简化

#### 6.1 高频触发

去掉 UserPromptSubmit hook，只保留 PreToolUse：

```
PreToolUse 拦截 git commit / git push
       │
       ▼
  trigger script（薄壳，无逻辑）
       │
       ▼
  启动子 agent，加载 core + daily
       │
       ▼
  子 agent 读取 staged 文件，自行判断归档
```

trigger 脚本不做意图识别，不做 hash 计算，只负责启动子 agent。

#### 6.2 低频触发

不通过 hook，由主 agent 直接调度：

```
开发者说"结束迭代"
       │
       ▼
  主 agent 启动子 agent，加载 core + summarize
       │
       ▼
  子 agent 执行汇总归档
```

#### 6.3 去掉的组件

| 删除 | 原因 |
|------|------|
| `intent-keywords.json` | 不再做意图识别 |
| `governance-trigger-core.py.tmpl` | 不再做 hash 计算和状态比对 |
| `governance-trigger.json` | 中间状态文件不再需要 |
| `last-governance-run.json` | 不再做 hash 比对 |
| `finalize-governance.py` | 无 guard 阻塞，不需要防循环 |
| UserPromptSubmit hook | 不再拦截自然语言 |

#### 6.4 Adapter 模板

Codex：

```
.codex/agents/
  commit-governance.toml            ← 引用 core + daily
  commit-governance-summarize.toml  ← 引用 core + summarize
```

Claude：

```
.claude/agents/
  commit-governance.md              ← 引用 core + daily
  commit-governance-summarize.md    ← 引用 core + summarize
```

#### 6.5 本地状态精简

```
.quick-init/
  rules/
    commit-governance-core.md
    commit-governance-daily.md
    commit-governance-summarize.md
  state/
    active-iteration.json          ← 保留
    init-metadata.json             ← 保留
```

删除 `last-governance-run.json`、`governance-trigger.json`。

### 七、Docs 模板升级

#### 7.1 decision.md → decisions/README.md

从一行描述升级为 ADR 索引模板：

```markdown
# Decisions

记录影响项目架构和流程的重大决策。ADR 由 commit-governance 在 iteration 结束时自动生成草稿。

| # | 决策 | 日期 | Iteration | 状态 |
|---|------|------|-----------|------|
```

#### 7.2 ADR 文件模板

新增 `templates/docs/adr.md`：

```markdown
# ADR-NNNN: <决策标题>

日期：YYYY-MM-DD
状态：accepted
iteration：<关联的 iteration 名称>

## Context

为什么需要做这个决策？当时面临什么问题或约束？

## Decision

选择了什么方案？

## Alternatives Considered

考虑过但放弃的方案及原因。

## Consequences

这个决策带来的正面和负面影响。

## Rollback

如果需要回撤，怎么做？代价多大？
```

#### 7.3 iteration.md 模板简化

去掉 specs/plans 子目录引用，改为扁平文档列表：

```markdown
# <Iteration 名称>

## 目标

## 范围

## 归档文档

| 文件 | 类别 | 来源 |
|------|------|------|

## 执行摘要

## 遗留问题
```

### 八、与现有设计的兼容影响

#### 8.1 SKILL.md Required Flow 变更

需要更新的步骤：
- 步骤 15（安装 agent integration）：adapter 从 1 个 agent 文件变为 2 个（daily + summarize）
- 步骤 17（复制 commit-governance-core.md）：改为复制 3 个 prompt 文件
- 步骤 18（复制 governance-trigger-core.py）：删除，改为只复制 intent-keywords.json → 也删除
- 步骤 19（复制 finalize-governance.py）：删除
- 步骤 22（安装 pre-commit guard）：删除

新增步骤：
- 安装 summarize 模式的 agent 配置

#### 8.2 测试影响

需要删除的测试：
- `test_finalize_governance.py`（finalize-governance.py 不再存在）
- `test_guard_script.py`（pre-commit guard 不再存在）

需要修改的测试：
- `test_adapter_snapshots.py`：更新快照，验证 daily + summarize 两个 agent 配置
- `test_skill_flow.py`：更新 Required Flow 步骤验证
- `test_rules.py`：验证 core + daily + summarize 三个 prompt 文件

需要新增的测试：
- `test_daily_prompt.py`：验证 daily prompt 包含归档判断原则和 changelog 规则
- `test_summarize_prompt.py`：验证 summarize prompt 包含决策提取和全局文档更新规则
- `test_adr_template.py`：验证 ADR 模板格式

## 验收标准

- 目标项目 `docs/` 结构包含 `onboard/`、`architecture/`、`decisions/`、`iterations/`、`changelog.md`
- `docs/decisions/README.md` 包含 ADR 索引表模板
- 不存在 pre-commit guard（`.quick-init/hooks/pre-commit-guard.py`）
- 不存在 `intent-keywords.json`、`governance-trigger-core.py`、`finalize-governance.py`
- 不存在 `last-governance-run.json`、`governance-trigger.json`
- `.quick-init/rules/` 包含 `commit-governance-core.md`、`commit-governance-daily.md`、`commit-governance-summarize.md`
- Codex adapter 生成 `commit-governance.toml` 和 `commit-governance-summarize.toml`
- Claude adapter 生成 `commit-governance.md` 和 `commit-governance-summarize.md`
- Hook 只注册 PreToolUse 事件，不注册 UserPromptSubmit
- Iteration 目录不预创建 `specs/` 或 `plans/` 子目录
- 每次提交时 commit-governance 子 agent 自行判断是否有文档需要归档
- Iteration 结束时 summarize 子 agent 自动提取决策生成 ADR 草稿
- Iteration 结束时 summarize 子 agent 更新 `docs/architecture/`、`docs/onboard/`
- 所有测试通过

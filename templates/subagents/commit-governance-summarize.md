# Commit Governance — Summarize Mode

Triggered when the developer explicitly requests to close the current iteration.

## Decision Extraction

Review all archived documents and changelog records for the current iteration. Identify major decisions:

| Decision Type | Typical Signals |
|--------------|----------------|
| Tech stack change | "migrate from X to Y", "replace Z", "deprecate W", "从 X 迁移到 Y", "替换 Z", "废弃 W" |
| Architecture restructure | "split module", "merge service", "change API contract", "拆分模块", "合并服务" |
| Process change | "switch from CLI to Skill", "test framework from Vitest to pytest", "工具链切换" |
| Approach selection | Document compares 2-3 approaches and selects one |

For each decision, generate an ADR draft to `docs/decisions/NNNN-<slug>.md`:

```markdown
# ADR-NNNN: <title>

日期：YYYY-MM-DD
状态：accepted
iteration：<iteration name>

## Context

Why was this decision needed? What problem or constraint existed?

## Decision

What approach was chosen?

## Alternatives Considered

Approaches that were considered but rejected, and why.

## Consequences

Positive and negative impacts of this decision.

## Rollback

How to reverse this decision. How costly would it be?
```

### ADR Constraints

- Do not fabricate decision motivations. If the source documents do not explain why, write "未在原文档中说明，需补充" in the Context section.
- A single iteration may produce zero or more ADRs.
- ADR numbering auto-increments from existing files in `docs/decisions/`.

## Global Document Updates

- `docs/architecture/README.md`: update affected sections if module boundaries, data flow, or external integrations changed during this iteration.
- `docs/onboard/README.md`: update if new commands, environment requirements, or development entry points were introduced.
- `docs/decisions/README.md`: append new ADRs to the index table.

## Close Iteration

1. Generate or update `iteration.md` with execution summary and outstanding issues.
2. Set `manifest.json` `"status": "closed"`.
3. Add an iteration-level section heading in `docs/changelog.md`.
4. Stage all changes with `git add`.
5. Return a summary to the main agent.

## Context

The openspec-auto pipeline uses prompt files in `.agents/skills/openspec-auto/prompts/` to define the behavior of each sub-agent stage. The explore sub-agent (`explore.md`) is the first stage that does substantive product work: it reads the issue, investigates the codebase, and produces a discovery output that flows to the propose stage. The proposal-review sub-agent (`proposal-review.md`) independently checks whether the proposal is sound before implementation begins.

The failure in PR #120 demonstrated that explore was optimizing for "understand what the issue asks for" rather than "understand the real problem and find the best solution." This is a prompt design problem, not an architectural one.

Current explore output format:
```
- Problem (restatement of issue)
- Classification
- Findings
- Approach
- Out of scope
```

Current proposal-review criteria:
```
- Proposal (solves the issue?)
- Design (sound?)
- Specs (adequate?)
- Tasks (TDD, concrete?)
- Authorization (principle deviations have human sign-off?)
```

## Goals / Non-Goals

**Goals:**
- Explore produces a discovery output that reflects genuine product thinking: real problem diagnosis, alternative solutions considered, principles-filtered recommendation
- Proposal-review verifies that product thinking happened (not just that artifacts are syntactically complete)
- NEEDS_INPUT rate stays low — the agent makes decisions autonomously wherever product reasoning applies; it asks only when genuinely stuck
- Scope handling is honest: the agent targets the right solution at MVP scope; large scope becomes a sequencing question, not a cut

**Non-Goals:**
- Changing the pipeline stage structure (explore → propose → proposal-review → implement → code-review)
- Changing how the orchestrator dispatches sub-agents
- Encoding exhaustive product judgment that requires domain context the agent can't have

## Decisions

### 1. Keep product thinking in the explore stage, not a separate stage

Alternative: Add a "product design" stage between explore and propose — a separate sub-agent that receives the investigation findings and evaluates solutions.

**Decision: no separate stage.** Product thinking requires codebase knowledge (to evaluate feasibility of each option) that explore already develops during investigation. Splitting forces the design agent to either re-read the codebase or trust a summary — both worse than having explore do both tasks in one context. The overhead of an extra stage (latency, cost, orchestration complexity) isn't justified when the problem is fixable by improving explore's instructions.

### 2. Treat issue constraints as weighted inputs, not mandates

The explore prompt previously listed "scope boundaries (what's explicitly out)" as a feature investigation item — implicitly encoding that issue-stated constraints are facts. The new framing: constraints stated in the issue are the reporter's best guess at feasibility, not product decisions. They are inputs to weigh when evaluating solutions, not veto power over principle-compliant alternatives.

The heuristic for weighting: if the constraint has no explanation (just "out of scope"), it's probably a feasibility guess — evaluate the ruled-out option anyway. If the constraint cites a specific reason (time, dependency, strategic direction), note it and still evaluate the compliant option, but flag it as a scope management question if the right solution requires overriding it.

### 3. "Problem diagnosis" as a required discovery output section

Forcing the agent to explicitly write "how this synthesis differs from the issue's framing" creates a structural check against restating the issue. Even when the answer is "the issue's framing was correct," writing the section requires comparative analysis. This is the primary forcing function for product thinking.

Alternative: require the agent to challenge the issue in prose rather than a named section.

**Decision: named section.** A named section makes the check auditable by proposal-review. The reviewer can look for "Problem diagnosis" and assess whether the analysis is substantive. Prose buried in "Findings" is easy to skip or write superficially.

### 4. "Solutions considered" as a required discovery output section (features only)

At least two candidate solutions must be enumerated for features, including the issue-implied approach. Each is evaluated against `docs/ux-principles.md` failure modes and `docs/VISION.md` direction. Principles are used as a filter and ranking signal, not a gate that stops the work.

If the issue-implied approach fails a failure mode but an alternative doesn't, the alternative is the recommendation. If both fail a failure mode, that's the rare case where NEEDS_INPUT is appropriate.

### 5. Scope: right solution at MVP scope; large scope → sequencing proposal

"MVP" is defined precisely: the smallest change that solves the core problem well. It is not the minimum that technically satisfies a literal reading of the issue. The distinction: MVP removes non-essential scope; an inferior solution doesn't solve the core problem well.

When the right solution is large (multi-week or multi-phase), explore does not shrink scope to fit a single change. Instead, it proposes a sequencing breakdown (Phase 1: X, Phase 2: Y) and returns NEEDS_INPUT with a concrete proposal for which phase to start. The human can respond "do it all" or "start with Phase 1." This keeps quality as the fixed point and scope as the negotiated variable.

### 6. Proposal-review verifies product thinking happened, not just artifact completeness

The expanded review criteria add four domain checks before the existing artifact checks:

1. **Problem synthesis**: Is there a "Problem diagnosis" section? Does it show analysis beyond issue restatement?
2. **Solution space**: Is there a "Solutions considered" section (for features)? Were alternatives meaningfully evaluated?
3. **UX impact**: Was the chosen approach filtered through `ux-principles.md` failure modes?
4. **Vision alignment**: Does the approach reflect "we handle complexity, users provide intent"?

A missing or thin "Problem diagnosis" section is a blocking finding. A missing "Solutions considered" section (for a feature) is a blocking finding. The authorization check (principle deviations must have human sign-off) is retained as a last-resort safety net, but the primary mechanism is making sure explore doesn't reach a principle-violating approach in the first place.

## Risks / Trade-offs

- **Longer explore outputs** → Proposal context windows are larger. Acceptable: the discovery output is already substantial, and the added sections ("Problem diagnosis", "Solutions considered") are bounded.
- **Agent may still choose the wrong solution** → The reviewer now explicitly checks for solution space coverage, which creates a correction loop. If explore picked a bad solution, proposal-review can return it for reconsideration.
- **Sequencing proposals require human response** → NEEDS_INPUT for large-scope issues does require a human turn-around. This is the correct behavior — large scope genuinely needs a decision that only the maintainer can make.
- **"Issue constraint is real" heuristic is fuzzy** → The heuristic (no explanation = feasibility guess; explicit reason = real constraint) will occasionally mis-classify. The cost of a mis-classification is: agent proposes a different solution than expected → human redirects via PR comment. This is recoverable and preferable to always deferring to issue constraints.

## Open Questions

_(none — all decisions resolved during the exploration session)_

## 1. Rewrite explore.md — goal framing and investigation

- [ ] 1.1 Add opening goal statement to explore.md: the issue is a problem description, not a spec; the agent's job is product translation; approach is the agent's call
- [ ] 1.2 Revise the Feature investigation checklist: replace "scope boundaries (what's explicitly out)" with "constraints stated in the issue (inputs to weigh, not mandates)"; add "note any explicit reason given for constraints (time/dependency = potentially real; no reason = feasibility guess)"
- [ ] 1.3 Rename step reference in Output section to match new step numbering

## 2. Add solution evaluation step to explore.md

- [ ] 2.1 Add Step 3 "Generate and evaluate solution approaches": for features, enumerate ≥2 candidates including the issue-implied approach; evaluate each against `docs/ux-principles.md` failure modes and `docs/VISION.md`; use principles as filter/ranking, not gate; prefer compliant alternatives over issue-implied approach when one exists
- [ ] 2.2 Add scope handling rule to Step 3: target right solution at MVP scope (solves core problem well, not all bells and whistles); if large scope, propose sequencing breakdown and NEEDS_INPUT with "which phase first?" — never cut to inferior solution

## 3. Expand synthesis output format in explore.md

- [ ] 3.1 Add "Problem diagnosis" section to discovery output format: explicit synthesis of how the real problem differs from the issue's framing; what are assumed vs. real constraints
- [ ] 3.2 Add "Solutions considered" section to discovery output format (features only): the candidate approaches from step 3 with a brief note on each (compliant / violates which failure mode / cost tradeoff)
- [ ] 3.3 Update "Approach" section description: if diverging from issue's implied direction, say so explicitly and explain reasoning

## 4. Tighten blocking question criteria in explore.md

- [ ] 4.1 Revise blocking question definition: NEEDS_INPUT only when approach is genuinely unresolvable after evaluating all available options; NOT when issue constraint conflicts with a principle (choose the compliant alternative); NOT when diverging from issue framing (product decision)
- [ ] 4.2 Add explicit "not blocking" list: evaluated multiple approaches and one is clearly better; issue-implied approach conflicts with principle but compliant alternative exists; diverging from issue framing; multiple valid approaches with similar outcomes
- [ ] 4.3 Add NEEDS_INPUT scope case: large scope → sequencing proposal with concrete options, not "too big"

## 5. Expand proposal-review.md judge criteria

- [ ] 5.1 Update the issue-reading preamble: "read the issue for the underlying user problem — the proposal may diverge from the approach suggested in the issue; that's expected"
- [ ] 5.2 Add "Problem synthesis" judge criterion: does the discovery (in PR description) include a "Problem diagnosis" section? Does it show analysis beyond issue restatement? Missing = blocking finding
- [ ] 5.3 Add "Solution space" judge criterion: does the discovery include "Solutions considered" (for features)? Were alternatives meaningfully evaluated? Missing = blocking finding
- [ ] 5.4 Add "UX and vision" judge criterion: was the chosen approach evaluated against `ux-principles.md` failure modes and `VISION.md`? Does it align with "we handle complexity, users provide intent"?
- [ ] 5.5 Retain "Authorization" criterion (principle deviation in design.md requires human maintainer comment in issue/PR) as last-resort safety net

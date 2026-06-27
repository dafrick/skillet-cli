## ADDED Requirements

### Requirement: Explore treats the issue as a problem description, not a spec
The explore sub-agent SHALL treat issue text as user input to a product thinking process, not as a specification to implement. The issue's suggested approach and stated constraints are inputs to weigh when evaluating solutions, not mandates to follow.

#### Scenario: Issue states a scope constraint
- **WHEN** an issue says "out of scope: don't add a new command"
- **THEN** the explore agent evaluates whether a command is actually the right solution and considers it as a candidate regardless of the constraint

#### Scenario: Issue constraint has no explanation
- **WHEN** an issue states a constraint without a reason (e.g., "no new CLI flags")
- **THEN** the explore agent treats it as a feasibility guess and evaluates the ruled-out option anyway

#### Scenario: Issue constraint has an explicit reason
- **WHEN** an issue states a constraint with a specific reason (e.g., "no new command — this is a 2-week project")
- **THEN** the explore agent notes the constraint as potentially real but still evaluates the principle-compliant option

### Requirement: Explore produces a Problem Diagnosis section
The explore sub-agent's discovery output SHALL include a "Problem diagnosis" section that explicitly states how the investigation's synthesis of the real problem differs from the issue's framing, and identifies which constraints are assumed vs. real.

#### Scenario: Issue framing was incomplete
- **WHEN** investigation reveals the real user problem is broader or different from what the issue described
- **THEN** the "Problem diagnosis" section explicitly names the difference and what the investigation revealed

#### Scenario: Issue framing was correct
- **WHEN** investigation confirms the issue described the real problem accurately
- **THEN** the "Problem diagnosis" section states this — confirming the issue's framing is itself a valid diagnostic finding

### Requirement: Explore enumerates and evaluates solution approaches for features
For feature issues, the explore sub-agent SHALL enumerate at least two candidate solutions to the underlying user problem, including the approach implied by the issue. Each candidate SHALL be evaluated against `docs/ux-principles.md` failure modes and `docs/VISION.md` product direction.

#### Scenario: Issue-implied approach violates a UX failure mode
- **WHEN** the approach suggested by the issue triggers a failure mode in `docs/ux-principles.md`
- **THEN** the explore agent identifies an alternative compliant approach, recommends it, and documents why it diverges from the issue's implied direction

#### Scenario: Issue-implied approach is principle-compliant
- **WHEN** the approach suggested by the issue does not trigger any failure mode
- **THEN** the explore agent may recommend it, with the evaluation documented in "Solutions considered"

#### Scenario: All approaches violate a failure mode
- **WHEN** no candidate solution is compliant with `docs/ux-principles.md`
- **THEN** the explore agent returns NEEDS_INPUT with a `product_direction` blocker documenting the constraint

### Requirement: Explore targets the right solution at MVP scope
The explore sub-agent SHALL target the smallest change that solves the core problem well. "MVP scope" means removing non-essential scope, not degrading the core solution. A solution that does not solve the core problem well is not acceptable regardless of scope.

#### Scenario: Right solution is achievable in a single change
- **WHEN** the right solution can be fully implemented without breaking it across multiple changes
- **THEN** the explore agent recommends it as a single change

#### Scenario: Right solution requires large scope
- **WHEN** the right solution is large enough to warrant sequencing across multiple changes
- **THEN** the explore agent proposes a sequencing breakdown (Phase 1, Phase 2, etc.) in a NEEDS_INPUT response with a concrete question: "which phase to start with?" — it does NOT cut scope to produce an inferior solution

#### Scenario: Issue asks for partial solution to avoid complexity
- **WHEN** the issue suggests a scoped-down approach that would not solve the core problem well (e.g., documentation instead of a command)
- **THEN** the explore agent recommends the full right solution, documents the issue's suggestion as a considered alternative, and explains why it was not chosen

### Requirement: Diverging from the issue's framing is not a blocking question
The explore sub-agent SHALL NOT treat a divergence from the issue's suggested approach or constraints as a reason for NEEDS_INPUT. Choosing a different approach is a product decision the agent can and should make.

#### Scenario: Agent recommends a different approach than the issue suggested
- **WHEN** the investigation supports recommending a different approach than the issue implies
- **THEN** the explore agent recommends the better approach, documents the divergence in the "Approach" section, and returns EXPLORED — not NEEDS_INPUT

### Requirement: Proposal-review verifies product thinking occurred
The proposal-review sub-agent SHALL check that the discovery output reflects genuine product thinking, not just issue processing. Missing or thin product thinking is a blocking finding.

#### Scenario: Discovery output has no Problem Diagnosis section
- **WHEN** the proposal-review agent reads the discovery output and finds no "Problem diagnosis" section
- **THEN** proposal-review returns CHANGES_REQUESTED with a blocking finding: "No problem diagnosis documented — unable to verify the synthesis went beyond restating the issue"

#### Scenario: Discovery output has no Solutions Considered section for a feature
- **WHEN** the proposal-review agent reads the discovery output for a feature and finds no "Solutions considered" section
- **THEN** proposal-review returns CHANGES_REQUESTED with a blocking finding: "No solutions considered documented — unable to verify alternatives were evaluated"

#### Scenario: Chosen approach violates a UX failure mode without human authorization
- **WHEN** the design.md acknowledges a deviation from `docs/ux-principles.md` and no maintainer comment in the issue or PR explicitly authorizes it
- **THEN** proposal-review returns CHANGES_REQUESTED with a blocking finding naming the failure mode and the missing authorization

#### Scenario: Problem synthesis goes beyond issue restatement
- **WHEN** the "Problem diagnosis" section contains analysis that diverges from or adds to the issue's framing
- **THEN** proposal-review accepts this as evidence of principled product thinking

#### Scenario: Alternatives were evaluated and documented
- **WHEN** the "Solutions considered" section names at least two options with principle-compliance notes
- **THEN** proposal-review accepts this as evidence of adequate solution space coverage

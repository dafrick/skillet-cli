## Context

The manual test harness uses `test-manual/templates/LOG.md.template` as the test user's session narrative document. Before a session starts, the guide runs `make init-run` to copy the template into a run folder, then manually pre-fills several frontmatter fields (`repo`, `tier`, `env`, `date`, `docker-image`) before handing the file to the test user.

Currently, `create-skillet-version:` is also in the guide-prefilled block. The intent was to capture the version as a session metadata artifact. The unintended consequence is that the test user receives a document that already names `create-skillet` — the exact tool they are supposed to discover independently in Step 2 of the protocol.

`TEST-RUN.md.template` already correctly includes `create-skillet-version:` in its metadata block. The guide fills that field in before or after the session since `TEST-RUN.md` is a guide-only document that the test user never sees.

## Goals / Non-Goals

**Goals:**
- Remove `create-skillet-version:` from the guide-prefilled frontmatter in `LOG.md.template`
- Preserve the version capture: add a post-session block at the end of `LOG.md.template` where the tester fills it in after using the tool
- Keep the spec, template, and README consistent with one another
- Add a spec scenario that makes the "blank at handoff" invariant machine-checkable

**Non-Goals:**
- Changing `TEST-RUN.md.template` — the guide fills this in; the test user never sees it
- Changing the session protocol steps or grading rubric
- Redesigning how the guide pre-fills other frontmatter fields

## Decisions

**Decision: Post-session block placement**
The post-session block goes after the append region (below the `<!-- Append entries below. -->` marker), separated by a horizontal rule (`---`). This keeps the narrative region uncluttered and makes the post-session fill-in visually distinct from the running log. An HTML comment explains the guide must NOT pre-fill this field and why.

**Decision: No change to TEST-RUN.md.template**
`create-skillet-version:` in `TEST-RUN.md.template` is correct as-is. The guide knows the version; the test user never sees that file. Changing it would be out of scope and would remove a useful metadata field from the guide's grading sheet.

**Decision: Spec update via MODIFIED delta**
The existing `### Requirement: LOG.md.template is the test user's session narrative` in `openspec/specs/manual-test-harness/spec.md` covers the full LOG.md.template contract. The change touches that requirement's text (removing `create-skillet-version` from the header list, adding the post-session block requirement) and adds one new scenario. The correct delta operation is MODIFIED — copy the entire requirement block and update it in place, so the archive has a complete picture.

**Decision: README update is an in-place edit**
The change to `test-manual/README.md` Step 6 is a one-line clarification: remove the field name and add a parenthetical. No structural change to README needed.

## Risks / Trade-offs

**Risk: Existing run folders already have the field pre-filled** → No mitigation needed. Historical run folders are immutable records; they are not retroactively edited. Only new runs created after this change will get the corrected template.

**Risk: A guide forgets to fill in the post-session block** → Acceptable. The field is still present as a prompt; its absence from the pre-filled block makes the omission visible rather than silently incorrect. The guide can always look in `TEST-RUN.md` for the version.

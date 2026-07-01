# Agent Supplement: Tmux Session Interface

This supplement is for **coding-agent test users only**. It explains how to interact with the tmux session inside the Docker container during your task.

> **For Guides:** Attach this alongside `TASK.md` when the test user is a coding agent.

---

## Private socket setup

Always use a private tmux socket so agent sessions do not pollute the developer's personal tmux server:

```bash
SOCKET="${TMPDIR:-/tmp}/claude-tmux-sockets/skillet.sock"
```

All tmux commands MUST pass `-S "$SOCKET"`.

## Sending input

Always use `-l` (literal mode) to prevent shell expansion. Because `-l` makes all arguments literal, send Enter as a separate non-literal call:

```bash
tmux -S "$SOCKET" send-keys -t skillet-test -l "<your-command>"
tmux -S "$SOCKET" send-keys -t skillet-test Enter
```

## Reading output

Always use `-J` (joins wrapped lines) and `-S -200` (200 lines of scrollback):

```bash
tmux -S "$SOCKET" capture-pane -p -J -S -200 -t skillet-test
```

`-J` prevents garbled output when parsing multi-line wizard prompts. `-S -200` ensures prompt text is not lost in scrollback.

## Waiting for a prompt

Use `wait-for-text.sh` to block until expected text appears:

```bash
HARNESS_DIR="$(git rev-parse --show-toplevel)/test-manual"
"$HARNESS_DIR/scripts/wait-for-text.sh" -S "$SOCKET" -t skillet-test -p "Which skill" -T 15
```

The relative path `./scripts/wait-for-text.sh` fails when the agent's working directory is not `test-manual/`. Resolve from the repo root with `git rev-parse --show-toplevel` so the call works regardless of where the agent is.

## `@inquirer/prompts` key sequences

| Action | Key |
|--------|-----|
| Navigate list | `Up` / `Down` |
| Select checkbox item | `Space` |
| Confirm / accept default | `Enter` |
| Clear a text field | `C-u` (Ctrl+U) |
| Cancel | `C-c` (Ctrl+C) |

## Keeping the log

Log entries are plain-text lines in the format `HH:MM <description>` — do **not** wrap them in `<!-- -->` HTML comment syntax. The format-examples block in `LOG.md` uses HTML comment syntax only to hide the examples from rendered output; actual entries must be visible text.

## Cleanup

> **Note:** Teardown is the guide's responsibility (`make test-teardown`). Do not run these commands during the session — they are provided for reference only.

```bash
tmux -S "$SOCKET" kill-session -t skillet-test
docker rm -f skillet-test-container
```

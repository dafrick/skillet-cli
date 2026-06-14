## ADDED Requirements

### Requirement: make prep-run clones a repo into the running container
`test-manual/Makefile` SHALL provide a `prep-run REPO_URL=<url>` target that, given a full GitHub (or any git) URL, derives a slug using the same `org-repo` format as `init-run` (last two path components of the URL joined with `-`) and clones the repository into `/repo/<org-repo>` inside the running `skillet-test-container`. The target SHALL create `/repo` inside the container if it does not exist before running the clone (using `mkdir -p /repo`). The target SHALL error with a usage message if `REPO_URL` is not set. The target SHALL require the container to already be running (started via `make test-start`); if the container is not running, `docker exec` will fail with a clear error.

The test-manual/README.md SHALL document `prep-run` as a required guide step in the "Before You Start" checklist, positioned after `make test-start` and before handing `TASK.md` to the test user. The TASK.md template SHALL note that the repository has been pre-cloned and tell the test user where to find it (`/repo/<org-repo>`, where `<org-repo>` matches the slug used with `init-run`).

#### Scenario: prep-run clones the repo into the container
- **WHEN** a guide runs `make prep-run REPO_URL=https://github.com/org/repo` after `make test-start`
- **THEN** the repository is cloned to `/repo/org-repo` inside `skillet-test-container` and the command exits 0

#### Scenario: prep-run errors without REPO_URL
- **WHEN** a guide runs `make prep-run` without a REPO_URL argument
- **THEN** Make exits with a non-zero code and a message explaining the required usage

#### Scenario: TASK.md tells the test user where to find the pre-cloned repo
- **WHEN** a test user reads their TASK.md
- **THEN** it informs them that the repository has already been cloned and gives them the path inside the container (`/repo/<org-repo>`, using the same slug the guide passed to `make init-run REPO=<org-repo>`)

#### Scenario: Test user LOG does not contain clone steps
- **WHEN** a test user follows a session using the pre-cloned repo
- **THEN** their LOG.md contains no `git clone` entries because cloning happened before the session started

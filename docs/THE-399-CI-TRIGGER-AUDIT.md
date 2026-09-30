# GitHub Actions trigger audit — opt-in only (THE-399)

Board policy (2026-09-30, THE-396): GitHub-hosted runners are **opt-in only**. They
must never run on ordinary pushes or PR updates, and are used only to test a pull
request immediately before merge when explicitly requested. The authoritative
validation is host-executed CI plus independent verification.

This repository (`nerdynigel/wdk-rgb-lightning`, a fork of
`UTEXO-Protocol/wdk-rgb-lightning`) is in Nigel's namespace, so the fork's own
workflows are governed by the same policy. Upstream ownership does not waive it.
Upstream's repository was not edited.

Trigger policy applied to every workflow in this fork:

```yaml
on:
  workflow_dispatch:
  pull_request:
    types: [labeled]
```

with a job gate:

```yaml
if: github.event_name == 'workflow_dispatch' || github.event.label.name == 'ci:run'
```

A GitHub run is requested by adding the `ci:run` label to a PR or by manual
dispatch. `push` triggers are never re-added. No product or test semantics,
dependency pins, secrets or Actions spending were changed. No
`repository_dispatch` or `schedule` trigger exists in this repository.

## 1. Workflows changed

| Workflow | Triggers before | Triggers after |
|---|---|---|
| `.github/workflows/build.yml` | `push` (main), `pull_request` (main) | `workflow_dispatch`, `pull_request: [labeled]`; `build` job gated on `ci:run` |
| `.github/workflows/release.yml` | `push` (tags `v*.*.*`), `workflow_dispatch` (input `tag`) | `workflow_dispatch` only (inputs `phase`, `tag`); `stage` and `finalize` jobs selected by `phase` |

### Release workflow detail

The `Release` workflow keeps its two-phase, 2FA-gated flow but is now entirely
manual:

- `phase: stage` checks out the requested tag, validates the tag against
  `package.json` and the current `main`, runs the full release test suite, and
  stages the tarball through npm OIDC.
- `phase: finalize` verifies the published npm artifact, provenance, `latest`
  dist-tag, signatures and immutable releases, then creates the immutable GitHub
  release.

Pushing a tag no longer starts the workflow; a maintainer dispatches
`phase: stage` after pushing the tag and `phase: finalize` after approving the
staged package with 2FA. This is documented in `RELEASING.md`.

## 2. Confirmation

Within `nerdynigel/wdk-rgb-lightning`, **no workflow remains that auto-runs on an
ordinary push or PR update**. The only run paths are `workflow_dispatch` and
`pull_request` gated on the `ci:run` label.

## 3. Rollback

This change is a pure workflow-trigger/documentation change with no product
artifacts. To revert, on `main`:

```bash
git revert <merge-or-task-commit>
```

or restore the previous files from the parent commit:

```bash
git checkout <parent-commit> -- .github/workflows/build.yml .github/workflows/release.yml RELEASING.md
git rm docs/THE-399-CI-TRIGGER-AUDIT.md
```

Reverting re-introduces the automatic `push`/PR triggers and the tag-triggered
release; it does not affect npm state, tags, GitHub releases or Actions spending.

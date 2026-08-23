---
name: commit-and-push
description: >-
  Commits local changes with a concise why-focused message and pushes the
  current branch to origin. Use when the user asks to commit and push, đẩy
  code, @commit-and-push, or lưu thay đổi lên remote.
disable-model-invocation: true
---

# Commit and push

Commit relevant work, then push the current branch. Do not create a PR unless the user asks.

## Safety

- Never update git config
- Never `--no-verify`, `--no-gpg-sign`, or skip hooks
- Never `push --force` to `main` or `master`; warn if the user asks
- Never destructive git (`reset --hard`, `clean -fd`) unless the user explicitly asks
- Never `--amend` unless all hold: user asked or a hook edited files of a commit you just made; HEAD is yours; branch is not pushed
- If a commit fails a hook, fix and make a **new** commit (do not amend)
- Do not commit secrets (`.env`, `.env.local`, `credentials.json`, keys)
- Do not use `git -i` (`rebase -i`, `add -i`)

Invoking this skill **is** an explicit request to commit and push.

## Inspect (parallel)

Run together:

1. `git status`
2. `git diff` and `git diff --cached`
3. `git log -12 --oneline` and `git branch -vv`

On PowerShell, do not join with `&&`. Use `;` or separate calls.

## Stage and commit

1. Stage only files that belong to the change. Skip `.next`, build output, and secrets.
2. Message: 1–2 sentences, **why** not what. Match recent `git log` style (this repo: sentence case, e.g. `Add …`).
3. Commit, then `git status`.

PowerShell:

```powershell
git commit -m @"
Commit message here.

"@
```

Bash:

```bash
git commit -m "$(cat <<'EOF'
Commit message here.

EOF
)"
```

If there is nothing to commit, stop. Do not create an empty commit. Still push if the branch is already ahead.

## Push

```powershell
git push -u origin HEAD
```

- First push of a branch: keep `-u`
- Do not push if commit failed
- After push, report: commit hash, message, remote branch

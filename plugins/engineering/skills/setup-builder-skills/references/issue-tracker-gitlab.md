# Issue tracker: GitLab

Issues and specs for this repo live as GitLab issues. Use the [`glab`](https://gitlab.com/gitlab-org/cli) CLI for all operations.

## Conventions

- **Create an issue**: `glab issue create --title "..." --description "..."`. Use a heredoc for a multi-line description. Pass `--description -` to open an editor.
- **Read an issue**: `glab issue view <number> --comments`. Use `-F json` for machine-readable output.
- **List issues**: `glab issue list -F json`. Add `--label` filters as required.
- **Comment on an issue**: `glab issue note <number> --message "..."`. GitLab calls comments "notes".
- **Apply / remove labels**: `glab issue update <number> --label "..."` / `--unlabel "..."`. Separate multiple labels with commas, or repeat the flag.
- **Close**: `glab issue close <number>`. `glab issue close` does not accept a closing comment, so post the explanation first with `glab issue note <number> --message "..."`, then close the issue.
- **Merge requests**: GitLab calls PRs "merge requests". Use `glab mr create`, `glab mr view`, `glab mr note`, and the other `glab mr` commands. They have the same shape as the `gh pr` commands, with `mr` in place of `pr`, and `note`/`--message` in place of `comment`/`--body`.

`glab` finds the repo from `git remote -v` when you run it inside a clone.

## Merge requests as a triage surface

**MRs as a request surface: no.** _(Set this to `yes` if this repo treats external merge requests as feature requests. `/triage` reads this flag.)_

When the flag is `yes`, MRs use the same labels and states as issues. Use the `glab mr` commands:

- **Read an MR**: `glab mr view <number> --comments`, and `glab mr diff <number>` for the diff.
- **List external MRs for triage**: `glab mr list -F json`, then keep only the MRs whose author is not a project member or owner. These are contributor MRs, not a maintainer's own open work.
- **Comment / label / close**: `glab mr note`, `glab mr update --label`/`--unlabel`, `glab mr close`.

GitLab numbers issues and MRs separately, so `#42` is unambiguous once you know whether the maintainer means an issue or an MR.

## When a skill says "publish to the issue tracker"

Create a GitLab issue.

## When a skill says "fetch the relevant ticket"

Run `glab issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue, and its **child** issues are the tickets.

- **Map**: a single issue labeled `wayfinder:map` that holds the Notes / Decisions-so-far / Fog body. Create it with `glab issue create --label wayfinder:map`. On GitLab tiers that have epics, an epic can hold the map instead; a labeled issue works on every tier.
- **Child ticket**: an issue that carries `Part of #<map>` at the top of its description and the label `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). After a dev claims the ticket, assign it to that dev.
- **Blocking**: use GitLab's **native blocking link**. This is the record that the GitLab UI shows. Add it with the `/blocked_by #<n>` quick action, posted as a note (`glab issue note <child> --message "/blocked_by #<blocker>"`). Native blocking links require Premium or Ultimate. On the free tier, or where the feature is not available, put a `Blocked by: #<n>, #<n>` line at the top of the description. A ticket is unblocked when every blocker is closed.
- **Frontier query**: run `glab issue list -F json`, scoped to the map's children. Drop each child that has an open blocker: a native `blocked_by` link to an open issue (`glab api projects/:id/issues/:iid/links`), or an open issue in the `Blocked by` line. Also drop each child that has an assignee. Take the first child in map order.
- **Claim**: `glab issue update <n> --assignee @me`. Make this the session's first write.
- **Resolve**: `glab issue note <n> --message "<answer>"`, then `glab issue close <n>`, then append a context pointer (gist and link) to the map's Decisions-so-far.

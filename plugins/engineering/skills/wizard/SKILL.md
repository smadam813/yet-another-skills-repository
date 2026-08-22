---
name: wizard
description: Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, working through an unfamiliar third-party dashboard, or running a one-off migration or cutover. Do not invoke this for steps the agent can perform itself.
---

# Wizard

A **wizard** is a bash script that walks a human, step by step, through a manual procedure that is tedious to do by hand and tedious to re-explain to an AI every time. It opens each URL, says what to click and copy, captures the values, and writes them where they belong, such as `.env` or GitHub secrets. It confirms at every stage and shows how many stages are left. A wizard might configure third-party services, run a one-off migration, or move the project from one state to another.

[template.sh](references/template.sh) already provides the user experience: stage-by-stage progress, confirmation gates, cross-platform URL opening that includes WSL, hidden secret entry, repeatable `.env` writes, `gh secret` and `gh variable` writes, and a closing summary. **Your job is only to scope the procedure and write its stages.** The library above the `STAGES` marker is identical in every wizard. That consistency is the point, so never hand-edit it.

A wizard is temporary by default. Build it for one run, save it to a scratch path or `scripts/`, and delete it when the job is done. Commit it only when the user wants a repeatable setup path that lives in the repo.

## Process

### 1. Scope the procedure

Work out every manual step the human must take and every value the wizard captures along the way. Read the repo first; do not start by asking the user.

- For setup, read `.env`, `.env.example`, `.env.*`, `README`, `docker-compose*`, the framework config, and `.github/workflows/*`. Every `secrets.*` and `vars.*` reference is a value the wizard must produce.
- For a migration or transition, find the current state, the target state, and the irreversible actions between them.

Then show the user the ordered list of stages and the values each stage produces. Confirm the list. The user may add, drop, or reorder stages.

**Done when:** every stage is named in order, and for each captured value you know three things: where the human gets it, where the wizard writes it (`.env`, a GitHub secret, both, or nowhere, because some stages are pure actions), and whether it is secret and needs hidden entry.

### 2. Map each stage's path

For each stage, write the exact path a human follows: which URL to open, what to do there, where the page shows the value, and which variable it fills. For example: "Dashboard → Developers → API keys → Reveal test key → copy". If you do not know the current UI or the exact command, say so, then ask the user or read the documentation. Never invent steps that may not exist.

**Done when:** every stage traces to concrete instructions a stranger could follow.

### 3. Write the wizard

Copy `references/template.sh` to the target path. Replace the example stage with one `stage` per step, in dependency order. Use the library helpers: `stage`, `say` and `step`, `open_url`, `ask` and `ask_secret`, `write_env`, `set_secret` and `set_var`, `pause` and `confirm`. Set `TOTAL_STAGES` to the number of stages you wrote.

Keep the standard the template sets. Open the URL before you ask for its value. Use `ask_secret` for anything secret. Use `write_env` for every persisted value. Use `set_secret` only for the values CI needs. Use `confirm` before any irreversible action. Each `stage` clears the screen, so only the current step stays visible. Keep each stage to one task, so that nothing the human needs scrolls away. Do not hand-edit the library above the marker.

### 4. Verify and hand off

- Run `bash -n <script>`, then run `shellcheck` if it is available.
- Run `chmod +x <script>`.
- Do not run the wizard end to end yourself. It opens browsers and waits for human input. Trace it statically instead: check that every value from step 1 is captured and lands where step 1 said, and that every `set_secret` name matches a `secrets.*` reference in CI exactly.
- Tell the user how to run it. If it is a repeatable setup path, commit it and link it from the README, so that the next person runs the script instead of asking an AI.

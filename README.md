# yet-another-skills-repository

A collection of agent skills, packaged as docs and installable plugins.

This repository is a plugin marketplace for **both Claude Code and Cursor**. Both tools
install the same skills. Neither install path needs the other tool.

## Plugins

- [**engineering**](plugins/engineering/README.md) — skills for software engineering
  workflows: design, diagnosis, review, and ticket flow.
- [**productivity**](plugins/productivity/README.md) — skills for everyday work:
  writing, teaching, handoffs, and stress-testing ideas.

## Claude Code

```
/plugin marketplace add smadam813/yet-another-skills-repository
/plugin install <plugin>@yet-another-skills-repository
```

## Cursor

Cursor imports a marketplace from a repository URL rather than a slash command. On a Teams
or Enterprise plan, go to **Dashboard → Settings → Plugins**, click **Import** under Team
Marketplaces, and paste:

```
https://github.com/smadam813/yet-another-skills-repository
```

Cursor reads `.cursor-plugin/marketplace.json` and lists the plugins it finds. Turn on
**Enable Auto Refresh** to get new changes from the tracked branch.

Without a team plan, install a single plugin by hand: copy its directory from `plugins/`
into `~/.cursor/plugins/local/`, then run **Developer: Reload Window**.

## License

MIT — see [LICENSE](LICENSE).

# yet-another-skills-repository

A collection of agent skills, packaged as helpful docs and installable plugins.

This repository is a plugin marketplace for **both Claude Code and Cursor** — the same
skills, installed from whichever one you use. Neither install path needs the other tool.

There are no plugins in it yet.

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
**Enable Auto Refresh** to pick up changes pushed to the tracked branch.

Without a team plan, install a single plugin by hand: copy its directory from `plugins/`
into `~/.cursor/plugins/local/`, then run **Developer: Reload Window**.

## License

MIT — see [LICENSE](LICENSE).

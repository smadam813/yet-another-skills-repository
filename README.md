# yet-another-skills-repository

A Claude Code plugin marketplace. It currently ships one plugin, **builder-tools**:
18 skills that carry a piece of work from a vague idea through to reviewed code.

Most of these skills were written by other people. See [Credits](#credits).

## Install

```
/plugin marketplace add smadam813/yet-another-skills-repository
/plugin install builder-tools@yet-another-skills-repository
```

To try it without installing:

```
claude --plugin-dir ./plugins/builder-tools
```

## Set up a repo first

Five skills read per-repo configuration from `docs/agents/`: which issue tracker
you use, your triage label vocabulary, and where domain docs live. Run this once
in each repo where you want to use them:

```
/setup-builder-tools
```

It asks a few questions and writes the files. Without it, `to-spec`, `to-tickets`,
`triage`, `wayfinder`, and `review-changes` have to guess. The other 13 skills
work anywhere with no setup.

## The workflow

The skills are meant to chain. A typical path through a feature:

```
  idea
    ↓  /grilling            stress-test it until nothing is silently assumed
    ↓  /to-spec             write up what you just agreed
    ↓  /to-tickets          break it into tickets with blocking edges
    ↓  /implement           build it, test-first via /tdd
    ↓  /review-changes      check it against standards and against the spec
  done
```

Bigger than one session? Start with `/wayfinder`, which plans the work as a map
of decision tickets and resolves them one at a time. Inheriting someone else's
issue queue? Start with `/triage`.

## What's in it

Eight skills are slash-only — they run when you ask for them by name. The other
ten can also trigger on their own when the situation fits.

### Planning and thinking

| Skill | | What it does |
|---|---|---|
| `grilling` | auto | Interrogates a plan until every branch of the design tree has been visited |
| `grill-with-docs` | slash | The same interview, but it writes ADRs and a glossary as it goes |
| `research` | auto | Investigates a question against primary sources, saves the findings as Markdown |
| `prototype` | auto | Builds something throwaway to answer a design question |

### Turning talk into work

| Skill | | What it does |
|---|---|---|
| `to-spec` | slash | Turns the conversation you just had into a spec, no interview |
| `to-tickets` | slash | Breaks a plan into tracer-bullet tickets that declare what blocks what |
| `wayfinder` | slash | Plans work too big for one session as a map of decision tickets |
| `triage` | slash | Moves issues and external PRs through a state machine of triage roles |
| `setup-builder-tools` | slash | Configures a repo for the five skills above |

### Building

| Skill | | What it does |
|---|---|---|
| `implement` | slash | Builds a spec or ticket set, test-first, then hands off to review |
| `tdd` | auto | Red-green-refactor, with guidance on test shape and mocking |
| `codebase-design` | auto | Vocabulary for deep modules: interface, depth, seam, adapter, leverage |
| `domain-modeling` | auto | Pins down domain terms and records architectural decisions |
| `improve-codebase-architecture` | slash | Scans for deepening opportunities and reports them as HTML |

### Reviewing and finishing

| Skill | | What it does |
|---|---|---|
| `review-changes` | auto | Reviews a diff on two axes: repo standards, and what the issue asked for |
| `receiving-code-review` | auto | How to take review feedback — verify first, push back when wrong |
| `resolving-merge-conflicts` | auto | Works through an in-progress merge or rebase |
| `orwell-writing` | auto | Plain-English discipline for prose, via Orwell's six rules and ASD-STE100 |

## Credits

This repository mostly redistributes other people's work under the MIT License.
Full license texts are in [NOTICE](NOTICE), and every skill records its own
provenance in its `SKILL.md` frontmatter under `metadata`.

| Author | Project | Skills |
|---|---|---|
| Matt Pocock | [mattpocock/skills](https://github.com/mattpocock/skills) | 16 — all modified |
| Jesse Vincent | [obra/superpowers](https://github.com/obra/superpowers) | `receiving-code-review`, verbatim |
| Tam Nguyen | [tamdogood/builder-essential-skills](https://github.com/tamdogood/builder-essential-skills) | `orwell-writing`, verbatim |

The modifications to Matt Pocock's skills fall into two groups. Structural: two
skills renamed (`code-review` → `review-changes`, `setup-matt-pocock-skills` →
`setup-builder-tools`) with the references that point at them retargeted, and
GitLab issue-tracker support removed. Editorial: every body has been run through
`orwell-writing`, which switched spelling to American English, shortened
sentences, made passive constructions active, and cut decorative idiom. Code
blocks, commands, templates, label strings, and each skill's defined vocabulary
were left alone. Each skill's `metadata.local_changes` says exactly what changed.

Superpowers asks that its skill wording not be reworded without evidence, since
it is tuned against their eval harness. `receiving-code-review` is therefore
byte-identical to upstream, and should stay that way.

## Layout

```
.claude-plugin/marketplace.json     the catalog
plugins/builder-tools/
  .claude-plugin/plugin.json        the plugin manifest
  skills/<name>/SKILL.md            one directory per skill
NOTICE                              third-party licenses
```

Adding a skill means creating `plugins/builder-tools/skills/<name>/SKILL.md`
with `name` and `description` frontmatter. Supporting files live beside it and
load only when the skill links to them. If the skill came from somewhere else,
add it to `NOTICE` and record its provenance in the frontmatter.

Check your work before pushing:

```
claude plugin validate .
claude plugin validate ./plugins/builder-tools --strict
```

## License

MIT — see [LICENSE](LICENSE) for original work here, and [NOTICE](NOTICE) for
the third-party terms it does not supersede.

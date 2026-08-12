# yet-another-skills-repository

A Claude Code plugin marketplace. It ships one plugin, **builder-tools**: 18
skills that take a piece of work from a vague idea to reviewed code.

Other people wrote most of these skills. See [Credits](#credits).

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

Five skills read their configuration from `docs/agents/` in your repo: which
issue tracker you use, which triage labels you use, and where your domain docs
live. Run this once in each repo that needs them:

```
/setup-builder-tools
```

It asks a few questions and writes the files. Without it, `to-spec`, `to-tickets`,
`triage`, `wayfinder`, and `review-changes` have to guess. The other 13 skills
work anywhere with no setup.

## The workflow

The skills chain together. A typical path through a feature:

```
  idea
    ↓  /grilling            question the idea until no assumption stays hidden
    ↓  /to-spec             write down what you just agreed
    ↓  /to-tickets          break it into tickets that say what blocks what
    ↓  /implement           build it, test-first via /tdd
    ↓  /review-changes      check it against the standards and the spec
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
| `grilling` | auto | Questions a plan until it has covered every branch of the design tree |
| `grill-with-docs` | slash | The same interview, and it writes decision records and a glossary as it goes |
| `research` | auto | Answers a question from primary sources and saves the findings as Markdown |
| `prototype` | auto | Builds something throwaway to answer a design question |

### Turning talk into work

| Skill | | What it does |
|---|---|---|
| `to-spec` | slash | Turns the conversation you just had into a spec, no interview |
| `to-tickets` | slash | Breaks a plan into tracer-bullet tickets that say what blocks what |
| `wayfinder` | slash | Plans work too big for one session as a map of decision tickets |
| `triage` | slash | Walks issues and outside pull requests through the triage roles in order |
| `setup-builder-tools` | slash | Configures a repo for the five skills above |

### Building

| Skill | | What it does |
|---|---|---|
| `implement` | slash | Builds a spec or ticket set, test-first, then hands off to review |
| `tdd` | auto | Red-green-refactor, with guidance on test shape and mocking |
| `codebase-design` | auto | Vocabulary for deep modules: interface, depth, seam, adapter, leverage |
| `domain-modeling` | auto | Pins down domain terms and records architectural decisions |
| `improve-codebase-architecture` | slash | Looks for modules worth deepening and reports them as HTML |

### Reviewing and finishing

| Skill | | What it does |
|---|---|---|
| `review-changes` | auto | Reviews a diff twice: against the repo standards, and against what the issue asked for |
| `receiving-code-review` | auto | How to take review feedback — verify first, push back when wrong |
| `resolving-merge-conflicts` | auto | Works through an in-progress merge or rebase |
| `orwell-writing` | auto | Plain-English rules for prose, from Orwell's six rules and ASD-STE100 |

## Credits

This repository mostly redistributes other people's work under the MIT License.
Full license texts are in [NOTICE](NOTICE), and every skill records its own
provenance in its `SKILL.md` frontmatter under `metadata`.

| Author | Project | Skills |
|---|---|---|
| Matt Pocock | [mattpocock/skills](https://github.com/mattpocock/skills) | 16 — all modified |
| Jesse Vincent | [obra/superpowers](https://github.com/obra/superpowers) | `receiving-code-review`, verbatim |
| Tam Nguyen | [tamdogood/builder-essential-skills](https://github.com/tamdogood/builder-essential-skills) | `orwell-writing`, verbatim |

The changes to Matt Pocock's skills come in two kinds. Structural: this repo
renames two skills (`code-review` → `review-changes`, `setup-matt-pocock-skills`
→ `setup-builder-tools`), points every reference at the new names, and drops
GitLab issue-tracker support. Editorial: `orwell-writing` has rewritten every
skill body. It switched spelling to American English, shortened sentences, turned
passive sentences into active ones, and cut decorative idiom. It left code
blocks, commands, templates, label strings, and each skill's own vocabulary
alone. Each skill's `metadata.local_changes` says what changed.

Superpowers asks people not to reword its skills without evidence, because it
tunes the wording against an eval harness, which is a scored test run. So
`receiving-code-review` is byte-for-byte the same as upstream. Keep it that way.

## Layout

```
.claude-plugin/marketplace.json     the catalog
plugins/builder-tools/
  .claude-plugin/plugin.json        the plugin manifest
  skills/<name>/SKILL.md            one directory per skill
NOTICE                              third-party licenses
```

To add a skill, create `plugins/builder-tools/skills/<name>/SKILL.md` with
`name` and `description` frontmatter. Put supporting files beside it; they load
only when the skill links to them. If the skill came from somewhere else, add it
to `NOTICE` and record where it came from in the frontmatter.

Check your work before pushing:

```
claude plugin validate .
claude plugin validate ./plugins/builder-tools --strict
```

## License

MIT. See [LICENSE](LICENSE) for the original work in this repo, and
[NOTICE](NOTICE) for the third-party terms that it does not replace.

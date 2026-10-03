# Learning Record Format

Learning records live in `./learning-records/` and use sequential numbers: `0001-<dash-case-name>.md`, `0002-<dash-case-name>.md`, and so on. Create the directory only when you write the first record.

They are the teaching equivalent of architectural decision records. They hold the non-obvious lessons, the key insights, and the prior knowledge the user has stated. These steer future sessions, and you use them to calculate the zone of proximal development.

## Template

```md
# {Short title of what was learned or established}

{1-3 sentences: what the user learned, or what prior knowledge they established, and why it matters for future sessions.}
```

That is the whole format. A learning record can be a single paragraph. The value is the record of _what_ the user now knows and _why_ it changes what to teach next, not in filling out sections.

## Optional sections

Include these only when they add real value. Most records do not need them.

- **Status** frontmatter (`active | superseded by 0002-<dash-case-name>`): use it when a later record replaces an earlier understanding that turned out to be wrong.
- **Evidence**: how the user showed the understanding. They answered a question, completed an exercise, or cited prior experience. Use it when someone may revisit the claim.
- **Implications**: what this opens up or rules out for future sessions. Record it when it is not obvious.

## Numbering

Scan `./learning-records/` for the highest existing number and increment by one.

## When to write a learning record

Write one when any of these is true:

1. **The user showed genuine understanding of something hard.** Exposure is not enough. You need evidence that they use the concept correctly. This sets a new floor for what to teach next.
2. **The user disclosed prior knowledge**, such as "I already know X." Record it so that future sessions do not teach it again. Record the _depth_ they claim.
3. **You corrected a misconception.** The user believed something wrong and now sees why. These records are high-value: they predict where the user will stumble on related topics.
4. **The mission shifted because of what the user learned.** The user found that they cared about something other than they thought. Link to `MISSION.md` and update it.

### What does _not_ qualify

- Material you only covered. Coverage is not learning. Wait for evidence.
- Anything `GLOSSARY.md` already holds tersely as a term definition. Do not duplicate it.
- Session-by-session activity logs. A learning record is not a journal. It is an insight you can decide from.

## Supersession

When a later record contradicts an earlier one, because the user deepened their understanding or you corrected it, mark the old record `Status: superseded by 0002-<dash-case-name>`. Do not delete it. The history of how the understanding changed is itself useful signal.

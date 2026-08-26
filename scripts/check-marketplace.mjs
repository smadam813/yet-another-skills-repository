#!/usr/bin/env node
// Checks that this repo installs as a plugin marketplace in both Claude Code and Cursor.
// Runs on Node alone, so a contributor with only one of the two tools can still verify both.
//   node scripts/check-marketplace.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join as pjoin, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Paths appear in messages next to the forward-slash paths used in the docs.
const join = (...p) => pjoin(...p).split(sep).join('/')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

const readJson = (rel) => {
  const abs = join(root, rel)
  if (!existsSync(abs)) return err(`${rel}: missing`), null
  try {
    return JSON.parse(readFileSync(abs, 'utf8'))
  } catch (e) {
    return err(`${rel}: invalid JSON — ${e.message}`), null
  }
}

const claude = readJson('.claude-plugin/marketplace.json')
const cursor = readJson('.cursor-plugin/marketplace.json')

// Both tools need a name, an owner and a plugins array before they will parse the manifest.
for (const [label, m] of [['.claude-plugin/marketplace.json', claude], ['.cursor-plugin/marketplace.json', cursor]]) {
  if (!m) continue
  if (!m.name) err(`${label}: no "name"`)
  if (!m.owner?.name) err(`${label}: no "owner.name"`)
  if (!Array.isArray(m.plugins)) err(`${label}: "plugins" must be an array`)
}

const claudeEntries = claude?.plugins ?? []
const cursorEntries = cursor?.plugins ?? []
const names = (entries) => new Set(entries.map((p) => p.name).filter(Boolean))
const claudeNames = names(claudeEntries)
const cursorNames = names(cursorEntries)

// A plugin listed in one marketplace but not the other is only installable in one tool.
for (const n of claudeNames) if (!cursorNames.has(n)) err(`plugin "${n}" is in the Claude marketplace but not the Cursor one`)
for (const n of cursorNames) if (!claudeNames.has(n)) err(`plugin "${n}" is in the Cursor marketplace but not the Claude one`)

// Cursor prefixes every source with metadata.pluginRoot; Claude spells the path out in full.
const pluginRoot = cursor?.metadata?.pluginRoot ?? ''
const sourcePath = (entry) => (typeof entry.source === 'string' ? entry.source : entry.source?.path)

const skillNames = new Map()

for (const name of [...claudeNames].sort()) {
  const cEntry = claudeEntries.find((p) => p.name === name)
  const xEntry = cursorEntries.find((p) => p.name === name)
  const cDir = sourcePath(cEntry ?? {})
  const xDir = sourcePath(xEntry ?? {})
  if (!cDir) err(`plugin "${name}": no "source" in the Claude marketplace`)
  if (!xDir) err(`plugin "${name}": no "source" in the Cursor marketplace`)
  if (!cDir || !xDir) continue

  const cResolved = resolve(root, cDir)
  const xResolved = resolve(root, pluginRoot, xDir)
  if (cResolved !== xResolved) {
    err(`plugin "${name}": the two marketplaces point at different directories (${cDir} vs ${join(pluginRoot, xDir)})`)
    continue
  }
  if (!existsSync(cResolved)) {
    err(`plugin "${name}": source directory ${cDir} does not exist`)
    continue
  }

  // Each tool reads its own manifest out of the shared plugin directory.
  const manifests = {}
  for (const [tool, rel] of [['Claude Code', '.claude-plugin/plugin.json'], ['Cursor', '.cursor-plugin/plugin.json']]) {
    const abs = join(cResolved, rel)
    if (!existsSync(abs)) {
      err(`plugin "${name}": no ${rel}, so ${tool} cannot load it`)
      continue
    }
    try {
      const m = JSON.parse(readFileSync(abs, 'utf8'))
      manifests[tool] = m
      if (m.name !== name) err(`${join(cDir, rel)}: "name" is "${m.name}" but the marketplace calls it "${name}"`)
    } catch (e) {
      err(`${join(cDir, rel)}: invalid JSON — ${e.message}`)
    }
  }

  // Four manifests carry the same facts; drift between them is the cost of dual support.
  const a = manifests['Claude Code']
  const b = manifests['Cursor']
  if (a && b) {
    for (const field of ['description', 'version', 'license']) {
      if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) {
        err(`plugin "${name}": "${field}" differs between the Claude and Cursor plugin.json`)
      }
    }
    const kw = (m) => JSON.stringify([...(m.keywords ?? [])].sort())
    if (kw(a) !== kw(b)) err(`plugin "${name}": "keywords" differ between the Claude and Cursor plugin.json`)
    for (const [entry, m, label] of [[cEntry, a, 'Claude'], [xEntry, b, 'Cursor']]) {
      if (entry.description && m.description && entry.description !== m.description) {
        err(`plugin "${name}": the ${label} marketplace description does not match its plugin.json`)
      }
    }
  }

  // Skills are the one thing both tools read from the same path, in the same format.
  const skillsDir = join(cResolved, 'skills')
  if (!existsSync(skillsDir)) continue
  for (const entry of readdirSync(skillsDir)) {
    const dir = join(skillsDir, entry)
    if (!statSync(dir).isDirectory()) continue
    const md = join(dir, 'SKILL.md')
    const rel = join(cDir, 'skills', entry, 'SKILL.md')
    if (!existsSync(md)) {
      err(`${join(cDir, 'skills', entry)}: no SKILL.md`)
      continue
    }
    const text = readFileSync(md, 'utf8')
    const badScalars = []
    const fm = frontmatter(text, badScalars)
    if (!fm) {
      err(`${rel}: no YAML frontmatter; both tools need a --- block`)
      continue
    }
    for (const k of badScalars) err(`${rel}: "${k}" has an unquoted ":" inside its value; strict YAML parsers reject the block — quote the whole value`)
    // Cursor requires name, and requires it to equal the folder name. Claude Code does not.
    if (!fm.name) err(`${rel}: no "name"; Cursor requires it. Add "name: ${entry}".`)
    else if (fm.name !== entry) err(`${rel}: "name" is "${fm.name}" but the directory is "${entry}"; Cursor rejects the mismatch`)
    if (!/^[a-z0-9-]+$/.test(entry)) err(`${rel}: directory "${entry}" must be lowercase letters, numbers and hyphens`)
    if (!fm.description) err(`${rel}: no "description"; Cursor requires it`)
    // The frontmatter name already titles the skill; an opening H1 restates it and can drift after a rename.
    const first = body(text).split(/\r?\n/).find((l) => l.trim() !== '')
    if (first?.startsWith('# ')) err(`${rel}: body opens with the heading "${first.trim()}"; the frontmatter name already titles the skill — start the body at its first real line`)
    const owner = skillNames.get(fm.name ?? entry)
    if (owner) warn(`skill "${fm.name ?? entry}" is defined by both "${owner}" and "${name}"; Claude Code namespaces skills per plugin, Cursor does not`)
    else skillNames.set(fm.name ?? entry, name)
  }
}

// Reads top-level scalar keys out of the leading --- block. Enough for name and description.
function frontmatter(text, badScalars) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return null
  const out = {}
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return out
    const m = /^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$/.exec(lines[i])
    if (!m) continue
    const raw = m[2].trim()
    // YAML forbids ": " (or a trailing ":") inside an unquoted plain scalar.
    if (!/^["'].*["']$/.test(raw) && /:(\s|$)/.test(raw)) badScalars.push(m[1])
    out[m[1]] = raw.replace(/^["'](.*)["']$/, '$1')
  }
  return null // unterminated block
}

// The text after the frontmatter's closing ---.
function body(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const end = lines[0]?.trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1
  return end === -1 ? '' : lines.slice(end + 1).join('\n')
}

for (const w of warnings) console.log(`WARN  ${w}`)
for (const e of errors) console.log(`ERROR ${e}`)
const n = claudeNames.size
console.log(`\nChecked ${n} plugin${n === 1 ? '' : 's'} and ${skillNames.size} skill${skillNames.size === 1 ? '' : 's'}: ${errors.length} error(s), ${warnings.length} warning(s).`)
process.exit(errors.length ? 1 : 0)

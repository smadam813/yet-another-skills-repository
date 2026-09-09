// PostToolUse hook: re-run the marketplace checker after an edit to a manifest, SKILL.md or plugin README.
// Exit 2 on checker errors so the output reaches Claude; anything else stays silent.
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (d) => (raw += d))
process.stdin.on('end', () => {
  let file = ''
  try { file = JSON.parse(raw).tool_input?.file_path ?? '' } catch {}
  file = file.split('\\').join('/')
  if (!/(\/\.claude-plugin\/.*\.json|\/\.cursor-plugin\/.*\.json|\/SKILL\.md|\/plugins\/[^/]+\/README\.md)$/.test(file)) process.exit(0)
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const r = spawnSync(process.execPath, [resolve(root, 'scripts/check-marketplace.mjs')], { encoding: 'utf8' })
  if (r.status === 0) process.exit(0)
  process.stderr.write(`check-marketplace failed after editing ${file}:\n${r.stdout}${r.stderr}`)
  process.exit(2)
})

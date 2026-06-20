import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = process.argv[2] ?? '/tmp/qybaihe-Pixel'
const sourceFile = path.join(sourceRoot, 'ClipClashPixel', 'Resources', 'ExpertPersonas.json')
const targetRoot = path.join(repoRoot, 'skills', 'piroom')

if (!fs.existsSync(sourceFile)) {
  throw new Error(`Pixel ExpertPersonas.json not found: ${sourceFile}`)
}

const personas = JSON.parse(fs.readFileSync(sourceFile, 'utf8'))
fs.mkdirSync(targetRoot, { recursive: true })
fs.writeFileSync(
  path.join(targetRoot, 'pixel-personas.raw.json'),
  `${JSON.stringify(personas, null, 2)}\n`,
)

const importedAt = new Date().toISOString()
const manifest = personas.map((persona) => {
  const slug = persona.id
  const skillName = `${slug}-perspective`
  const skillDir = path.join(targetRoot, slug)
  const skillPath = path.join(skillDir, 'SKILL.md')
  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(skillPath, renderSkill(persona, skillName), 'utf8')
  fs.writeFileSync(
    path.join(skillDir, 'persona.json'),
    `${JSON.stringify({
      ...persona,
      skillName,
      skillPath: path.relative(repoRoot, skillPath),
      importedFrom: 'qybaihe/Pixel',
      importedAt,
    }, null, 2)}\n`,
    'utf8',
  )
  return {
    id: slug,
    name: persona.displayName,
    title: persona.role,
    description: persona.coreBelief,
    category: persona.category,
    skillName,
    sourceUrl: 'https://github.com/qybaihe/Pixel',
    sourceLabel: 'qybaihe/Pixel',
    sourcePath: persona.skillSourcePath,
    skillPath: path.relative(repoRoot, skillPath),
    avatar: avatarFor(persona.id, persona.category),
    available: true,
    importedAt,
  }
})

fs.writeFileSync(path.join(targetRoot, 'personas.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Imported ${manifest.length} Pixel personas into ${path.relative(repoRoot, targetRoot)}`)

function renderSkill(persona, skillName) {
  const list = (items) => (items ?? []).map((item) => `- ${item}`).join('\n') || '- 无'
  return `# ${persona.displayName} Perspective

name: ${skillName}
source: qybaihe/Pixel
source_path: ${persona.skillSourcePath}
category: ${persona.category}
role: ${persona.role}

## Purpose

Use this skill inside EvoPi PiRoom to provide a clearly labeled, AI-generated simulated perspective inspired by public-style material and the structured persona data imported from Pixel.

This skill must not claim to be the real person, must not imply private access, and must keep advice grounded in the user's provided context. For topics involving current facts, law, finance, health, admissions, employment data, or politics, say that fresh verification is needed.

## Core Belief

${persona.coreBelief}

## Speech Style

${persona.speechStyle}

## Debate Style

${persona.debateStyle}

## Agreement Triggers

${list(persona.agreementTriggers)}

## Disagreement Triggers

${list(persona.disagreementTriggers)}

## Catchphrases

${list(persona.catchphrases)}

## Safety Notes

${persona.safetyNotes}

## Response Contract

- Reply in Chinese unless the user explicitly asks otherwise.
- Start with the judgment or framing first, then give 2-4 concrete reasons.
- Keep the role boundary visible when needed: this is a simulated perspective, not the real person.
- Do not fabricate quotes, private opinions, private messages, endorsements, or up-to-date claims.
- When the user asks for a decision, turn the persona style into practical criteria, tradeoffs, and next actions.
`
}

function avatarFor(id, category) {
  const direct = {
    zhangxuefeng: 'soft-role-users',
    musk: 'soft-target-bullseye',
    trump: 'soft-microphone-voice',
    leijun: 'soft-sparkle-twinkle',
    zhangyiming: 'soft-dashboard-tiles',
    'sam-altman': 'soft-sparkle-edit',
    'jensen-huang': 'soft-settings-gear',
    feynman: 'soft-idea-bulb',
    claude: 'soft-shield-check',
    doubao: 'soft-heart-favorite',
  }
  if (direct[id]) return direct[id]
  if (category === '商业科技') return 'soft-target-bullseye'
  if (category === '思想艺术') return 'soft-book-open'
  if (category === '社会观察') return 'soft-search-spark'
  if (category === '动漫推理') return 'soft-notebook-lines'
  return 'soft-chat-bubble'
}

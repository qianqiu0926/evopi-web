import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.PORT ?? process.env.EVOPI_API_PORT ?? 8787)
loadEnvFile(path.join(repoRoot, '.env.local'))
loadEnvFile(path.join(repoRoot, '.env'))

const statePath = path.join(repoRoot, 'data', 'backend-state.json')
const piroomRoot = path.join(repoRoot, 'skills', 'piroom')
const productivityRoot = path.join(repoRoot, 'skills', 'productivity')
const personasManifestPath = path.join(piroomRoot, 'personas.json')
const minimaxApiKey = process.env.MINIMAX_API_KEY ?? process.env.VITE_MINIMAX_API_KEY ?? ''
const minimaxBaseUrl = (process.env.MINIMAX_BASE_URL ?? 'https://api.minimaxi.com/v1').replace(/\/+$/, '')
const minimaxModel = process.env.MINIMAX_MODEL ?? 'MiniMax-M3'

ensureDir(path.dirname(statePath))

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(error)
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.code, message: error.message })
      return
    }
    sendJson(res, 500, {
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error',
    })
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`EvoPi API listening on http://127.0.0.1:${port}`)
})

async function handle(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `127.0.0.1:${port}`}`)
  const pathname = url.pathname

  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      minimaxConfigured: Boolean(minimaxApiKey),
      personas: loadPersonas().length,
    })
  }

  if (req.method === 'GET' && pathname === '/api/piroom/personas') {
    return sendJson(res, 200, { personas: piRoomPersonas() })
  }

  if (req.method === 'GET' && pathname === '/api/piclub') {
    return sendJson(res, 200, piClubState())
  }

  if (req.method === 'POST' && pathname === '/api/piclub/posts') {
    const input = await readJson(req)
    const { post, state } = createPiClubPost(input)
    return sendJson(res, 200, { post, state })
  }

  const piClubJoinMatch = pathname.match(/^\/api\/piclub\/communities\/([^/]+)\/join$/)
  if (req.method === 'POST' && piClubJoinMatch) {
    const { community, state } = joinPiClubCommunity(decodeURIComponent(piClubJoinMatch[1]))
    return sendJson(res, 200, { community, state })
  }

  if (req.method === 'POST' && pathname === '/api/photos/apple/drop') {
    const input = await readJson(req)
    const { drop, state } = createPhotoDrop(input)
    return sendJson(res, 200, { drop, state })
  }

  if (req.method === 'POST' && pathname === '/api/vibecoding/products') {
    const input = await readJson(req)
    const { product, post, state } = createVibeProduct(input)
    return sendJson(res, 200, { product, post, state })
  }

  if (req.method === 'GET' && pathname === '/api/external-agents/skills') {
    return sendJson(res, 200, { skills: externalSkills() })
  }

  if (req.method === 'POST' && pathname === '/api/reminders/apple') {
    const input = await readJson(req)
    const result = await createAppleReminder(input)
    return sendJson(res, 200, result)
  }

  if (req.method === 'GET' && pathname === '/api/external-agents/connections') {
    return sendJson(res, 200, { connections: externalConnections() })
  }

  if (req.method === 'GET' && pathname === '/api/external-agents/discover') {
    return sendJson(res, 200, { discoveries: externalDiscoveries() })
  }

  if (req.method === 'POST' && pathname === '/api/external-agents/discover') {
    await readJson(req).catch(() => ({}))
    return sendJson(res, 200, { discoveries: externalDiscoveries() })
  }

  if (req.method === 'POST' && pathname === '/api/external-agents/import') {
    return sendJson(res, 200, { connections: externalConnections() })
  }

  if (req.method === 'POST' && pathname === '/api/external-agents/bootstrap') {
    return sendJson(res, 200, { connections: externalConnections(), imported: true })
  }

  if (req.method === 'POST' && pathname === '/api/external-agents/call') {
    const input = await readJson(req)
    const { result, operation } = await callAgent(input)
    return sendJson(res, 200, { result, operation })
  }

  if (req.method === 'POST' && pathname === '/api/agent-runs/external') {
    const input = await readJson(req)
    const { result, operation } = await callAgent(input)
    const run = createReceiptRunRecord({
      goalName: input.goalName,
      title: `${input.workspaceTitle ?? 'Agent run'} · ${externalAgentLabel(input.kind)}`,
      evomapSearchQuery: input.evomapSearchQuery,
      referencedEvoMapIds: input.referencedEvoMapIds ?? [],
      steps: [
        {
          title: `${externalAgentLabel(input.kind)} 返回结果`,
          status: operation.status === 'completed' ? 'done' : 'failed',
          inputSummary: String(input.message ?? '').slice(0, 300),
          outputSummary: extractOutput(result).slice(0, 500),
          referencedEvoMapIds: input.referencedEvoMapIds ?? [],
        },
      ],
    })
    addEvolutionEvent({
      type: 'receipt_run.created',
      subjectId: run.id,
      summary: `${run.title} 已生成小票`,
      evidence: { operationId: operation.operationId },
    })
    return sendJson(res, 200, { result, run, operation })
  }

  if (req.method === 'POST' && pathname === '/api/agent-runs/pi') {
    const input = await readJson(req)
    const { result, operation } = await callAgent({ ...input, kind: 'pi' })
    const run = createReceiptRunRecord({
      goalName: input.goalName,
      title: `${input.workspaceTitle ?? 'Pi run'} · Pi`,
      evomapSearchQuery: input.evomapSearchQuery,
      referencedEvoMapIds: input.referencedEvoMapIds ?? [],
      steps: [
        {
          title: 'Pi 返回结果',
          status: operation.status === 'completed' ? 'done' : 'failed',
          inputSummary: String(input.message ?? '').slice(0, 300),
          outputSummary: extractOutput(result).slice(0, 500),
          referencedEvoMapIds: input.referencedEvoMapIds ?? [],
        },
      ],
    })
    return sendJson(res, 200, { result, run, operation })
  }

  if (req.method === 'POST' && pathname === '/api/receipt-runs') {
    const input = await readJson(req)
    const run = createReceiptRunRecord(input)
    addEvolutionEvent({
      type: 'receipt_run.created',
      subjectId: run.id,
      summary: `${run.title} 已创建`,
      evidence: { goalName: input.goalName },
    })
    return sendJson(res, 200, { run })
  }

  const attachMatch = pathname.match(/^\/api\/receipt-runs\/([^/]+)\/evomap\/attach$/)
  if (req.method === 'POST' && attachMatch) {
    const input = await readJson(req)
    const state = readState()
    const run = state.receiptRuns.find((item) => item.id === decodeURIComponent(attachMatch[1]))
    if (!run) return sendJson(res, 404, { error: 'not_found', message: 'Receipt run not found' })
    run.referencedEvoMapIds = unique([...(run.referencedEvoMapIds ?? []), input.evomapId].filter(Boolean))
    writeState(state)
    return sendJson(res, 200, { run })
  }

  if (req.method === 'POST' && pathname === '/api/skills') {
    const input = await readJson(req)
    const skill = createSkillRecord(input)
    return sendJson(res, 200, { skill })
  }

  const receiptSkillMatch = pathname.match(/^\/api\/receipt-runs\/([^/]+)\/skill$/)
  if (req.method === 'POST' && receiptSkillMatch) {
    const input = await readJson(req)
    const state = readState()
    const run = state.receiptRuns.find((item) => item.id === decodeURIComponent(receiptSkillMatch[1]))
    if (!run) return sendJson(res, 404, { error: 'not_found', message: 'Receipt run not found' })
    const skill = createSkillRecord({ ...input, sourceReceiptRunId: run.id })
    return sendJson(res, 200, { skill, run })
  }

  const skillGetMatch = pathname.match(/^\/api\/skills\/([^/]+)$/)
  if (req.method === 'GET' && skillGetMatch) {
    const state = readState()
    const skill = state.skills.find((item) => item.id === decodeURIComponent(skillGetMatch[1]))
    if (!skill) return sendJson(res, 404, { error: 'not_found', message: 'Skill not found' })
    return sendJson(res, 200, { skill })
  }

  const syncExternalSkillMatch = pathname.match(/^\/api\/external-agents\/skills\/([^/]+)\/sync-to-evopi$/)
  if (req.method === 'POST' && syncExternalSkillMatch) {
    const externalSkill = externalSkills().find((skill) => skill.id === decodeURIComponent(syncExternalSkillMatch[1]))
    if (!externalSkill) return sendJson(res, 404, { error: 'not_found', message: 'External skill not found' })
    const skill = createSkillRecord({
      name: externalSkill.title ?? externalSkill.name,
      description: externalSkill.description ?? externalSkill.path,
      trigger: `PiRoom 调用 ${externalSkill.name}`,
      contextCache: [`External skill imported from ${externalSkill.path}`],
      referencedEvoMapIds: [],
      privacyPolicy: 'summary_only',
      externalSkillId: externalSkill.id,
    })
    return sendJson(res, 200, { skill })
  }

  if (req.method === 'POST' && pathname === '/api/external-agents/skills/sync-to-evopi') {
    const input = await readJson(req).catch(() => ({}))
    const kinds = new Set(input.kinds?.length ? input.kinds : ['pi'])
    const selected = externalSkills().filter((skill) => kinds.has(skill.kind)).slice(0, Number(input.limit ?? 500))
    const state = readState()
    const results = []
    let created = 0
    let skipped = 0
    for (const externalSkill of selected) {
      const existing = state.skills.find((skill) => skill.externalSkillId === externalSkill.id)
      if (existing) {
        skipped += 1
        results.push({ status: 'skipped', reason: 'already_synced', externalSkillId: externalSkill.id, kind: externalSkill.kind, skill: existing })
      } else {
        const skill = createSkillRecord({
          name: externalSkill.title ?? externalSkill.name,
          description: externalSkill.description ?? externalSkill.path,
          trigger: `PiRoom 调用 ${externalSkill.name}`,
          contextCache: [`External skill imported from ${externalSkill.path}`],
          referencedEvoMapIds: [],
          privacyPolicy: 'summary_only',
          externalSkillId: externalSkill.id,
        })
        created += 1
        results.push({ status: 'created', externalSkillId: externalSkill.id, kind: externalSkill.kind, skill })
      }
    }
    return sendJson(res, 200, { created, skipped, results })
  }

  const skillDraftMatch = pathname.match(/^\/api\/skills\/([^/]+)\/evomap\/draft$/)
  if (req.method === 'POST' && skillDraftMatch) {
    const skill = updateSkill(decodeURIComponent(skillDraftMatch[1]), (current) => ({
      ...current,
      status: 'drafted',
      recipeLink: {
        evomapRecipeId: `draft_${current.id}`,
        status: 'draft',
        livemode: false,
        lastSyncedAt: new Date().toISOString(),
      },
    }))
    return sendJson(res, 200, { skill, recipe: skill.recipeLink, recipeInput: skillToRecipeInput(skill) })
  }

  const skillPublishMatch = pathname.match(/^\/api\/skills\/([^/]+)\/evomap\/test-publish$/)
  if (req.method === 'POST' && skillPublishMatch) {
    const skill = updateSkill(decodeURIComponent(skillPublishMatch[1]), (current) => ({
      ...current,
      status: 'test_published',
      recipeLink: {
        ...(current.recipeLink ?? { evomapRecipeId: `recipe_${current.id}` }),
        evomapRecipeId: current.recipeLink?.evomapRecipeId ?? `recipe_${current.id}`,
        status: 'test_published',
        livemode: false,
        lastSyncedAt: new Date().toISOString(),
      },
    }))
    return sendJson(res, 200, { skill, recipe: skill.recipeLink, recipeInput: skillToRecipeInput(skill) })
  }

  const skillReuseMatch = pathname.match(/^\/api\/skills\/([^/]+)\/evomap\/reuse$/)
  if (req.method === 'POST' && skillReuseMatch) {
    const input = await readJson(req).catch(() => ({}))
    const reuse = mockReuseGraph(input.limit ?? 8)
    const skill = updateSkill(decodeURIComponent(skillReuseMatch[1]), (current) => ({
      ...current,
      recipeLink: {
        ...(current.recipeLink ?? { evomapRecipeId: `recipe_${current.id}`, status: 'draft', livemode: false }),
        reuseGraph: {
          lastQueriedAt: new Date().toISOString(),
          relatedRecipeCount: reuse.relatedRecipes.length,
          reusedInRecipeCount: reuse.reusedInRecipes.length,
        },
      },
    }))
    return sendJson(res, 200, { skill, reuse })
  }

  const exportSkillMatch = pathname.match(/^\/api\/skills\/([^/]+)\/external-agents\/export$/)
  if (req.method === 'POST' && exportSkillMatch) {
    const input = await readJson(req)
    const state = readState()
    const skill = state.skills.find((item) => item.id === decodeURIComponent(exportSkillMatch[1]))
    if (!skill) return sendJson(res, 404, { error: 'not_found', message: 'Skill not found' })
    const slug = slugify(input.slug || skill.name)
    const targetDir = path.join(repoRoot, 'skills', input.kind ?? 'pi', slug)
    const skillPath = path.join(targetDir, 'SKILL.md')
    const content = renderExportedSkill(skill)
    if (input.apply) {
      ensureDir(targetDir)
      fs.writeFileSync(skillPath, content, 'utf8')
    }
    return sendJson(res, 200, {
      result: {
        kind: input.kind ?? 'pi',
        apply: Boolean(input.apply),
        slug,
        targetDir,
        skillPath,
        content,
      },
    })
  }

  const openClawExportMatch = pathname.match(/^\/api\/skills\/([^/]+)\/openclaw\/export$/)
  if (req.method === 'POST' && openClawExportMatch) {
    const input = await readJson(req).catch(() => ({}))
    const state = readState()
    const skill = state.skills.find((item) => item.id === decodeURIComponent(openClawExportMatch[1]))
    if (!skill) return sendJson(res, 404, { error: 'not_found', message: 'Skill not found' })
    const slug = slugify(input.slug || skill.name)
    const targetDir = path.join(repoRoot, 'skills', 'openclaw', slug)
    const skillPath = path.join(targetDir, 'SKILL.md')
    const content = renderExportedSkill(skill)
    if (input.apply) {
      ensureDir(targetDir)
      fs.writeFileSync(skillPath, content, 'utf8')
    }
    return sendJson(res, 200, { result: { apply: Boolean(input.apply), slug, targetDir, skillPath, content } })
  }

  if (req.method === 'GET' && pathname === '/api/evolution/events') {
    const limit = Number(url.searchParams.get('limit') ?? 30)
    return sendJson(res, 200, { events: readState().evolutionEvents.slice(-limit).reverse() })
  }

  if (req.method === 'GET' && pathname === '/api/evolution/events/stream') {
    setCors(res)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    for (const event of readState().evolutionEvents.slice(-Number(url.searchParams.get('limit') ?? 30))) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }
    res.end()
    return
  }

  if (req.method === 'GET' && pathname.startsWith('/api/evomap/')) {
    return handleEvoMapGet(pathname, url, res)
  }

  if (req.method === 'POST' && pathname.startsWith('/api/evomap/')) {
    return handleEvoMapPost(pathname, req, res)
  }

  if (pathname.startsWith('/api/developer-environments/evomap')) {
    return handleDeveloperEnvironment(pathname, req, res)
  }

  if (pathname.startsWith('/api/connectors')) {
    return handleConnectors(pathname, req, res)
  }

  return sendJson(res, 404, { error: 'not_found', message: `No route for ${req.method} ${pathname}` })
}

async function callAgent(input) {
  const kind = input.kind ?? 'pi'
  const startedAt = Date.now()
  const operationId = newId('op')
  const agent = input.agent ?? input.skillName
  const persona = findPersona(agent)
  const prompt = String(input.message ?? '').trim()
  const fallback = fallbackReply(prompt, persona)

  let stdout = ''
  let stderr = ''
  let json
  let status = 'completed'
  let runtimeReason

  try {
    if (!minimaxApiKey) throw new Error('MINIMAX_API_KEY is not configured')
    const reply = await callMiniMax(prompt, persona)
    stdout = reply
    json = { reply, provider: 'minimax', model: minimaxModel }
  } catch (error) {
    status = 'runtime_error'
    runtimeReason = error instanceof Error ? error.message : 'MiniMax request failed'
    stdout = fallback
    stderr = runtimeReason
    json = { reply: fallback, fallback: true, reason: runtimeReason }
  }

  const result = {
    kind,
    command: ['minimax', minimaxModel],
    stdout,
    stderr,
    json,
  }
  const operation = {
    operationId,
    kind,
    status,
    agent,
    skillName: input.skillName,
    hasSession: Boolean(input.sessionKey),
    sessionKeyHash: input.sessionKey ? hash(input.sessionKey).slice(0, 12) : undefined,
    local: false,
    command: ['POST', `${minimaxBaseUrl}/chat/completions`],
    hasJson: Boolean(json),
    jsonKeys: json ? Object.keys(json) : [],
    fallback: status === 'runtime_error',
    runtimeReason,
    provider: 'minimax',
    model: minimaxModel,
    modelOverride: input.model,
    stdoutPreview: stdout.slice(0, 220),
    stderrPreview: stderr.slice(0, 220),
    outputPreview: stdout.slice(0, 220),
    durationMs: Date.now() - startedAt,
  }
  addEvolutionEvent({
    type: 'external_agent.called',
    subjectId: operationId,
    summary: `${externalAgentLabel(kind)}${persona ? ` / ${persona.name}` : ''} 已回复`,
    evidence: { status, model: minimaxModel, fallback: status !== 'completed' },
  })
  return { result, operation }
}

async function callMiniMax(prompt, persona) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch(`${minimaxBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${minimaxApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: minimaxModel,
        messages: [
          { role: 'system', content: systemPrompt(persona) },
          { role: 'user', content: prompt || '请先给我一个判断。' },
        ],
        temperature: 0.75,
        stream: false,
        thinking: { type: 'disabled' },
      }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      const message = body?.error?.message ?? body?.message ?? `MiniMax returned ${res.status}`
      throw new Error(message)
    }
    const content = body?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new Error('MiniMax response had no text content')
    return stripThink(content.trim())
  } finally {
    clearTimeout(timeout)
  }
}

function systemPrompt(persona) {
  const base = [
    '你是 EvoPi 的 PiRoom 后端。你要提供有帮助、可执行、中文优先的回复。',
    '你可以模拟一个“观点视角”，但不能声称自己是真人本人，也不能编造私下信息、真实引用或实时事实。',
    '回答要先给判断，再给理由和下一步。涉及最新政策、价格、升学就业、法律、医疗、金融或政治动员时，提醒需要查证最新信息。',
  ]
  if (!persona) return base.join('\n')
  return [
    ...base,
    `当前视角：${persona.name}（${persona.title}）。`,
    `核心信念：${persona.persona?.coreBelief ?? persona.description}`,
    `表达风格：${persona.persona?.speechStyle ?? '清晰、直接'}`,
    `论辩方式：${persona.persona?.debateStyle ?? '基于证据和约束给建议'}`,
    `偏好触发：${(persona.persona?.agreementTriggers ?? []).join('、')}`,
    `反感触发：${(persona.persona?.disagreementTriggers ?? []).join('、')}`,
    `安全边界：${persona.persona?.safetyNotes ?? '模拟视角，不代表真人本人。'}`,
  ].join('\n')
}

function fallbackReply(prompt, persona) {
  const name = persona?.name ?? 'Pi'
  const belief = persona?.persona?.coreBelief ?? '先把问题拆清楚，再给可执行建议。'
  const style = persona?.persona?.speechStyle ?? '直接、清楚、实用'
  const catchphrase = persona?.persona?.catchphrases?.[0]
  const target = prompt || '这个问题'
  return [
    `我先按「${name}」的模拟视角给你一个可用判断：${target.length > 80 ? `${target.slice(0, 80)}…` : target}，关键不是继续泛聊，而是把选择条件压实。`,
    '',
    `判断依据：${belief}`,
    `表达方式会偏「${style}」。${catchphrase ? `一句话：${catchphrase}` : ''}`,
    '',
    '你现在可以补三类信息：目标、约束、可接受成本。我拿到这三项后，就能把建议收束成一张行动小票。',
    '',
    '注：这是基于 Skill 的风格化模拟回复，不代表真人本人。',
  ].join('\n')
}

function piRoomPersonas() {
  return loadPersonas()
    .filter((persona) => persona.id !== 'joseph-stalin-hidden')
    .map((persona) => ({
      id: persona.id,
      name: persona.name,
      title: persona.title,
      description: persona.description,
      skillName: persona.skillName,
      sourceUrl: persona.sourceUrl,
      sourceLabel: persona.sourceLabel,
      basis: `${persona.sourceLabel} · ${persona.category ?? 'Pixel persona'} · ${persona.sourcePath ?? 'ExpertPersonas.json'}`,
      avatar: persona.avatar,
      skillPath: path.join(repoRoot, persona.skillPath),
      available: true,
    }))
}

function externalSkills() {
  const personaSkills = loadPersonas()
    .filter((persona) => persona.id !== 'joseph-stalin-hidden')
    .map((persona) => ({
      id: `pi:${persona.id}`,
      kind: 'pi',
      name: persona.skillName,
      path: path.join(repoRoot, persona.skillPath),
      title: persona.name,
      description: persona.description,
      version: 'pixel-import',
      tags: ['piroom', 'persona', persona.category].filter(Boolean),
      source: 'piroom',
      importedAt: persona.importedAt ?? new Date(0).toISOString(),
      connectionId: 'piroom-minimax',
      connectionStatus: 'imported',
    }))
  return [...productivitySkills(), ...personaSkills]
}

function externalConnections() {
  const skills = externalSkills()
  const personaSkills = skills.filter((skill) => skill.source === 'piroom')
  const productivity = skills.filter((skill) => skill.source === 'productivity')
  return [
    {
      id: 'piroom-minimax',
      kind: 'pi',
      status: 'imported',
      homePath: repoRoot,
      configPath: path.join(repoRoot, '.env.local'),
      workspacePath: repoRoot,
      skillsRootPaths: [piroomRoot],
      detectedVersion: minimaxModel,
      dashboardUrl: 'https://platform.minimaxi.com/',
      configSummary: {
        provider: 'minimax',
        model: minimaxModel,
        keyConfigured: Boolean(minimaxApiKey),
      },
      skills: personaSkills,
    },
    {
      id: 'productivity-skills',
      kind: 'pi',
      status: 'imported',
      homePath: repoRoot,
      configPath: path.join(repoRoot, 'skills', 'productivity'),
      workspacePath: repoRoot,
      skillsRootPaths: [productivityRoot],
      detectedVersion: 'workspace',
      dashboardUrl: 'https://github.com/qianqiu0926/evopi-web',
      configSummary: {
        provider: 'local-skill',
        count: productivity.length,
      },
      skills: productivity,
    },
    emptyExternalConnection('openclaw'),
    emptyExternalConnection('hermes'),
  ]
}

function externalDiscoveries() {
  return externalConnections().map(({ id, status, ...connection }) => ({
    ...connection,
    detected: status !== 'missing',
    warnings: connection.kind === 'pi' && !minimaxApiKey ? ['MINIMAX_API_KEY is not configured; local fallback replies will be used.'] : [],
  }))
}

function emptyExternalConnection(kind) {
  return {
    id: `${kind}-missing`,
    kind,
    status: 'missing',
    homePath: '',
    configPath: '',
    workspacePath: '',
    skillsRootPaths: [],
    detectedVersion: '',
    configSummary: {},
    skills: [],
  }
}

function createReceiptRunRecord(input) {
  const state = readState()
  const run = {
    id: newId('run'),
    title: input.title ?? 'EvoPi 小票',
    goalName: input.goalName,
    evomapSearchQuery: input.evomapSearchQuery,
    referencedEvoMapIds: unique(input.referencedEvoMapIds ?? []),
    steps: (input.steps ?? []).map((step, index) => ({
      id: step.id ?? `step_${index + 1}`,
      title: step.title,
      status: step.status ?? 'done',
      inputSummary: step.inputSummary,
      outputSummary: step.outputSummary,
      referencedEvoMapIds: unique(step.referencedEvoMapIds ?? []),
    })),
    createdAt: new Date().toISOString(),
  }
  state.receiptRuns.push(run)
  writeState(state)
  return run
}

function createSkillRecord(input) {
  const state = readState()
  const skill = {
    id: newId('skill'),
    sourceReceiptRunId: input.sourceReceiptRunId,
    externalSkillId: input.externalSkillId,
    goalName: input.goalName,
    name: input.name || 'EvoPi 本地 Skill',
    description: input.description || (input.contextCache ?? []).join('；').slice(0, 240) || '从 PiRoom 对话沉淀的本地 Skill。',
    trigger: input.trigger,
    contextCache: input.contextCache ?? [],
    referencedEvoMapIds: input.referencedEvoMapIds ?? [],
    privacyPolicy: input.privacyPolicy ?? 'summary_only',
    status: 'local',
    createdAt: new Date().toISOString(),
  }
  state.skills.push(skill)
  writeState(state)
  addEvolutionEvent({
    type: 'skill.confirmed',
    subjectId: skill.id,
    summary: `本地 Skill「${skill.name}」已确认`,
    evidence: { goalName: input.goalName, privacyPolicy: skill.privacyPolicy },
  })
  return skill
}

function updateSkill(skillId, updater) {
  const state = readState()
  const index = state.skills.findIndex((item) => item.id === skillId)
  if (index < 0) throw new HttpError(404, 'not_found', 'Skill not found')
  state.skills[index] = updater(state.skills[index])
  writeState(state)
  return state.skills[index]
}

function handleEvoMapGet(pathname, url, res) {
  if (pathname === '/api/evomap/connection') {
    return sendJson(res, 200, { configured: false, connected: false })
  }
  if (pathname === '/api/evomap/connect-url') {
    return sendJson(res, 200, {
      url: 'http://127.0.0.1:8787/api/evomap/mock-connect',
      scopes: (url.searchParams.get('scopes') ?? 'recipes:read genes:read').split(/\s+/).filter(Boolean),
      mode: 'test',
    })
  }
  if (pathname === '/api/evomap/recipes/search') {
    const q = url.searchParams.get('q') ?? 'EvoPi'
    const limit = Number(url.searchParams.get('limit') ?? 6)
    return sendJson(res, 200, { recipes: mockRecipes(q, limit), pagination: { limit }, livemode: false })
  }
  if (pathname === '/api/evomap/genes') {
    const limit = Number(url.searchParams.get('limit') ?? 6)
    return sendJson(res, 200, { genes: mockGenes(limit), pagination: { limit } })
  }
  if (pathname === '/api/evomap/reuse') {
    const limit = Number(url.searchParams.get('limit') ?? 6)
    return sendJson(res, 200, mockReuseGraph(limit))
  }
  return sendJson(res, 404, { error: 'not_found', message: `No EvoMap route: ${pathname}` })
}

async function handleEvoMapPost(pathname, req, res) {
  await readJson(req).catch(() => ({}))
  if (pathname === '/api/evomap/revoke') return sendJson(res, 200, { ok: true, connected: false })
  return sendJson(res, 404, { error: 'not_found', message: `No EvoMap route: ${pathname}` })
}

async function handleDeveloperEnvironment(pathname, req, res) {
  if (req.method === 'GET' && pathname === '/api/developer-environments/evomap') {
    return sendJson(res, 200, { environment: developerEnv(), imported: false })
  }
  if (req.method === 'POST' && pathname.endsWith('/discover')) {
    await readJson(req).catch(() => ({}))
    const { id, importedAt, updatedAt, ...discovery } = developerEnv()
    return sendJson(res, 200, { discovery })
  }
  if (req.method === 'POST' && pathname.endsWith('/bootstrap')) {
    await readJson(req).catch(() => ({}))
    return sendJson(res, 200, { environment: developerEnv(), imported: false })
  }
  if (req.method === 'POST' && pathname.endsWith('/run')) {
    const input = await readJson(req)
    const workflowId = input.workflowId ?? 'recipe-search'
    const result = workflowId === 'gene-list'
      ? { genes: mockGenes(input.limit ?? 6), pagination: { limit: input.limit ?? 6 } }
      : workflowId === 'reuse-query'
        ? mockReuseGraph(input.limit ?? 6)
        : workflowId === 'quickstart-test'
          ? { kind: 'quickstart-test', passed: true, stdoutPreview: 'Local EvoPi mock developer workflow is available.' }
          : { recipes: mockRecipes(input.query ?? 'EvoPi', input.limit ?? 6), pagination: { limit: input.limit ?? 6 }, livemode: false }
    const operation = {
      operationId: newId('devop'),
      kind: 'evomap-developers',
      workflowId,
      status: 'completed',
      mode: 'test',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 1,
      resultCount: Array.isArray(result.recipes) ? result.recipes.length : Array.isArray(result.genes) ? result.genes.length : 1,
      input,
    }
    const run = createReceiptRunRecord({ title: `EvoMap ${workflowId}`, steps: [{ title: '读取本地 mock workflow', status: 'done' }] })
    return sendJson(res, 200, { result, operation, run })
  }
  return sendJson(res, 404, { error: 'not_found', message: `No developer route: ${pathname}` })
}

async function handleConnectors(pathname, req, res) {
  const state = readState()
  if (req.method === 'GET' && pathname === '/api/connectors') return sendJson(res, 200, { connectors: [wechatConnector(state)] })
  if (req.method === 'GET' && pathname === '/api/connectors/wechat/relay-contract') {
    return sendJson(res, 200, { contract: wechatRelayContract(state) })
  }
  if (req.method === 'POST' && pathname === '/api/connectors/wechat/session') {
    const session = createWeChatSession()
    state.wechatSession = session
    writeState(state)
    return sendJson(res, 200, { connector: wechatConnector(state), session })
  }
  const sessionMatch = pathname.match(/^\/api\/connectors\/wechat\/session\/([^/]+)$/)
  if (req.method === 'GET' && sessionMatch) {
    const session = state.wechatSession
    if (!session || session.id !== decodeURIComponent(sessionMatch[1])) return sendJson(res, 404, { error: 'not_found', message: 'Session not found' })
    return sendJson(res, 200, { connector: wechatConnector(state), session })
  }
  const confirmMatch = pathname.match(/^\/api\/connectors\/wechat\/session\/([^/]+)\/confirm$/)
  if (req.method === 'POST' && confirmMatch) {
    const input = await readJson(req).catch(() => ({}))
    if (!state.wechatSession || state.wechatSession.id !== decodeURIComponent(confirmMatch[1])) return sendJson(res, 404, { error: 'not_found', message: 'Session not found' })
    state.wechatSession = {
      ...state.wechatSession,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      displayName: input.displayName ?? 'EvoPi WeChat',
      chatId: input.chatId ?? 'local-wechat',
    }
    writeState(state)
    return sendJson(res, 200, { connector: wechatConnector(state), session: state.wechatSession })
  }
  if (req.method === 'POST' && pathname === '/api/connectors/wechat/follow-up') {
    const input = await readJson(req)
    return sendJson(res, 200, {
      ok: true,
      delivery: { platform: 'wechat', status: 'queued', chatId: state.wechatSession?.chatId, messagePreview: String(input.message ?? '').slice(0, 120) },
    })
  }
  if (req.method === 'POST' && pathname === '/api/connectors/wechat/inbound') {
    const input = await readJson(req)
    const session = state.wechatSession ?? createWeChatSession()
    state.wechatSession = { ...session, status: 'connected', connectedAt: session.connectedAt ?? new Date().toISOString(), displayName: session.displayName ?? 'EvoPi WeChat', chatId: session.chatId ?? 'local-wechat' }
    writeState(state)
    const { result, operation } = await callAgent({ kind: 'pi', agent: 'doubao-perspective', message: input.message, sessionKey: input.sessionId ?? 'wechat-local' })
    const run = createReceiptRunRecord({ goalName: input.goalName, title: input.workspaceTitle ?? '微信消息处理', steps: [{ title: '生成微信回复草稿', status: 'done', outputSummary: extractOutput(result).slice(0, 300) }] })
    return sendJson(res, 200, { ok: true, connector: wechatConnector(readState()), session: readState().wechatSession, result, run, operation, replyPreview: extractOutput(result).slice(0, 300) })
  }
  if (req.method === 'POST' && pathname === '/api/connectors/wechat/disconnect') {
    state.wechatSession = null
    writeState(state)
    return sendJson(res, 200, { ok: true, connector: wechatConnector(state) })
  }
  return sendJson(res, 404, { error: 'not_found', message: `No connector route: ${pathname}` })
}

function loadPersonas() {
  if (!fs.existsSync(personasManifestPath)) return []
  const manifest = JSON.parse(fs.readFileSync(personasManifestPath, 'utf8'))
  return manifest.map((item) => {
    const personaPath = path.join(repoRoot, 'skills', 'piroom', item.id, 'persona.json')
    const persona = fs.existsSync(personaPath) ? JSON.parse(fs.readFileSync(personaPath, 'utf8')) : {}
    return { ...item, persona }
  })
}

function productivitySkills() {
  if (!fs.existsSync(productivityRoot)) return []
  return fs.readdirSync(productivityRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readProductivitySkill(entry.name))
    .filter(Boolean)
}

function readProductivitySkill(slug) {
  const skillPath = path.join(productivityRoot, slug, 'SKILL.md')
  if (!fs.existsSync(skillPath)) return null
  const content = fs.readFileSync(skillPath, 'utf8')
  const frontmatter = parseFrontmatter(content)
  const fallback = productivityDefaults(slug)
  return {
    id: `productivity:${slug}`,
    kind: 'pi',
    name: frontmatter.name ?? fallback.name,
    path: skillPath,
    title: fallback.title,
    description: frontmatter.description ?? fallback.description,
    version: 'workspace',
    tags: fallback.tags,
    source: 'productivity',
    importedAt: skillMtime(skillPath),
    connectionId: 'productivity-skills',
    connectionStatus: 'imported',
  }
}

function productivityDefaults(slug) {
  const defaults = {
    wewrite: {
      name: 'wewrite',
      title: '公众号自动发布',
      description: '从热点选题、文章写作、微信排版到推送公众号草稿箱的全流程 Skill。',
      tags: ['wechat', 'publishing', 'writing'],
    },
    'codex-ppt': {
      name: 'codex-ppt',
      title: '自动做 PPT',
      description: '从主题或资料生成 16:9 演示文稿，支持图片型 PDF 和可编辑 PPTX 工作流。',
      tags: ['ppt', 'slides', 'deck'],
    },
  }
  return defaults[slug] ?? {
    name: slug,
    title: slug,
    description: 'Workspace productivity skill.',
    tags: ['workspace'],
  }
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return {}
  const end = content.indexOf('\n---', 3)
  if (end < 0) return {}
  const yaml = content.slice(3, end).trim()
  const output = {}
  let currentKey = ''
  for (const line of yaml.split(/\r?\n/)) {
    const trimmed = line.trimEnd()
    const match = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (match) {
      currentKey = match[1]
      const value = match[2].trim()
      if (value === '|') output[currentKey] = ''
      else output[currentKey] = value.replace(/^['"]|['"]$/g, '')
      continue
    }
    if (currentKey && typeof output[currentKey] === 'string' && /^\s+/.test(line)) {
      output[currentKey] = `${output[currentKey]}\n${trimmed.trim()}`
    }
  }
  return output
}

function skillMtime(file) {
  try {
    return fs.statSync(file).mtime.toISOString()
  } catch {
    return new Date(0).toISOString()
  }
}

function findPersona(agent) {
  if (!agent) return null
  const normalized = String(agent).toLowerCase()
  return loadPersonas().find((persona) => (
    persona.skillName?.toLowerCase() === normalized
    || persona.id?.toLowerCase() === normalized
    || `pi:${persona.id}`.toLowerCase() === normalized
    || persona.name?.toLowerCase() === normalized
  )) ?? null
}

function readState() {
  if (!fs.existsSync(statePath)) {
    return defaultState()
  }
  try {
    return { ...defaultState(), ...JSON.parse(fs.readFileSync(statePath, 'utf8')) }
  } catch {
    return defaultState()
  }
}

function writeState(state) {
  ensureDir(path.dirname(statePath))
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

function defaultState() {
  return {
    receiptRuns: [],
    skills: [],
    evolutionEvents: [],
    wechatSession: null,
    piClub: defaultPiClubState(),
  }
}

function piClubState() {
  const state = readState()
  if (!state.piClub) state.piClub = defaultPiClubState()
  return {
    communities: state.piClub.communities ?? [],
    posts: state.piClub.posts ?? [],
    photoDrops: state.piClub.photoDrops ?? [],
    products: state.piClub.products ?? [],
  }
}

function defaultPiClubState() {
  return {
    communities: [
      {
        id: 'academic-lab',
        name: 'AI 学术共研组',
        desc: 'Pi 们一起读论文、拆实验、整理参考资料，适合研究生、老师和科研团队。',
        type: 'research',
        members: 128,
        piAgents: 76,
        joined: true,
        owner: '清北学术组织',
      },
      {
        id: 'founder-room',
        name: '创业者产品会客厅',
        desc: '用 Pi 快速验证需求、做小产品、投放到社区收反馈。',
        type: 'founder',
        members: 86,
        piAgents: 52,
        joined: false,
        owner: 'EvoPi Club',
      },
      {
        id: 'boss-lab',
        name: '老板的组织控制台',
        desc: '老板可以创建组织，管理成员的 EvoPi、分配研究任务、汇总小票和产品资产。',
        type: 'org',
        members: 24,
        piAgents: 24,
        joined: false,
        owner: '组织管理员',
      },
    ],
    posts: [
      {
        id: 'post-research-1',
        author: '小奶狗',
        avatar: 'soft-favorite-collection',
        community: 'AI 学术共研组',
        title: '今天读到一篇可以复用的 Agent 论文',
        text: '我把 ReAct 和状态机式 Agent 的差异整理成了三条笔记，下一步会把它们做成目标舱里的研究 Skill。',
        source: '论文笔记三篇',
        time: '12 分钟前',
        likes: 18,
        replies: 5,
      },
      {
        id: 'post-product-1',
        author: '小奶狗',
        avatar: 'soft-sparkle-twinkle',
        community: '创业者产品会客厅',
        title: '投放一个刚做好的小产品',
        text: '访谈洞察落地页已经部署好，适合把 10 位用户访谈压缩成一页可分享的产品判断。',
        source: 'VibeCoding',
        product: '访谈洞察落地页',
        time: '今天 11:48',
        likes: 31,
        replies: 9,
      },
    ],
    photoDrops: [],
    products: [
      {
        id: 'prod-insight-landing',
        name: '访谈洞察落地页',
        desc: '把创业计划里的访谈结论整理成一个可分享的产品介绍页。',
        status: 'deployed',
        url: 'https://evopi.local/products/insight-landing',
        community: '创业者产品会客厅',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date().toISOString(),
        stack: ['React', 'Pi 生成文案', '静态部署'],
      },
      {
        id: 'prod-course-practice',
        name: '课程练习小站',
        desc: '为第二讲自动生成练习题、答案解析和学生反馈入口。',
        status: 'building',
        url: 'https://evopi.local/products/course-practice',
        community: '教学实验室',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date().toISOString(),
        stack: ['Vite', '题库记忆', '表单收集'],
      },
    ],
  }
}

function createPiClubPost(input) {
  const state = readState()
  state.piClub = state.piClub ?? defaultPiClubState()
  const post = {
    id: newId('post'),
    author: '小奶狗',
    avatar: input.product ? 'soft-sparkle-twinkle' : 'soft-favorite-collection',
    community: sanitizePlain(input.community || joinedCommunityName(state.piClub) || 'PiClub 广场'),
    title: sanitizePlain(input.title || 'Pi 的新动态'),
    text: sanitizePlain(input.text || '我刚整理完一段新的工作进展，先发到 PiClub 记录一下。'),
    source: sanitizePlain(input.source || 'EvoPi'),
    media: input.media ? sanitizePlain(input.media) : undefined,
    product: input.product ? sanitizePlain(input.product) : undefined,
    time: '刚刚',
    likes: 0,
    replies: 0,
  }
  state.piClub.posts = [post, ...(state.piClub.posts ?? [])].slice(0, 80)
  writeState(state)
  addEvolutionEvent({
    type: 'piclub.post_created',
    subjectId: post.id,
    summary: `PiClub 动态「${post.title}」已发布`,
    evidence: { community: post.community, source: post.source, product: post.product },
  })
  return { post, state: piClubState() }
}

function joinPiClubCommunity(communityId) {
  const state = readState()
  state.piClub = state.piClub ?? defaultPiClubState()
  const communities = state.piClub.communities ?? []
  const index = communities.findIndex((item) => item.id === communityId)
  if (index < 0) throw new HttpError(404, 'not_found', 'Community not found')
  communities[index] = {
    ...communities[index],
    joined: true,
    members: communities[index].joined ? communities[index].members : communities[index].members + 1,
    piAgents: communities[index].joined ? communities[index].piAgents : communities[index].piAgents + 1,
  }
  state.piClub.communities = communities
  writeState(state)
  addEvolutionEvent({
    type: 'piclub.community_joined',
    subjectId: communityId,
    summary: `已加入 PiClub 社区「${communities[index].name}」`,
    evidence: { owner: communities[index].owner, type: communities[index].type },
  })
  return { community: communities[index], state: piClubState() }
}

function createPhotoDrop(input) {
  const state = readState()
  state.piClub = state.piClub ?? defaultPiClubState()
  const source = ['apple-photos', 'airdrop', 'upload'].includes(input.source) ? input.source : 'apple-photos'
  const useCase = ['moments', 'video', 'research'].includes(input.useCase) ? input.useCase : 'moments'
  const count = Math.max(1, Math.min(99, Number(input.count ?? 6)))
  const title = sanitizePlain(input.title || 'Apple 相册新素材')
  const drop = {
    id: newId('photo'),
    title,
    source,
    count,
    status: 'drafted',
    useCase,
    createdAt: new Date().toISOString(),
    draftText: formatPhotoDraft(title, count, useCase),
  }
  state.piClub.photoDrops = [drop, ...(state.piClub.photoDrops ?? [])].slice(0, 40)
  writeState(state)
  addEvolutionEvent({
    type: 'piclub.photo_drop_created',
    subjectId: drop.id,
    summary: `相册素材「${drop.title}」已进入 PiClub 草稿`,
    evidence: { source, count, useCase },
  })
  return { drop, state: piClubState() }
}

function createVibeProduct(input) {
  const state = readState()
  state.piClub = state.piClub ?? defaultPiClubState()
  const name = sanitizePlain(input.name || 'Pi 生成的小产品')
  const brief = sanitizePlain(input.brief || '根据你的产品逻辑生成一个可演示的小网站。')
  const slug = asciiSlugify(name) || newId('product')
  const product = {
    id: newId('prod'),
    name,
    desc: brief,
    status: 'deployed',
    url: `https://evopi.local/products/${slug}`,
    community: sanitizePlain(input.community || '创业者产品会客厅'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stack: ['VibeCoding', 'React 原型', 'Pi 部署小票'],
  }
  state.piClub.products = [product, ...(state.piClub.products ?? [])].slice(0, 40)
  const post = {
    id: newId('post'),
    author: '小奶狗',
    avatar: 'soft-sparkle-twinkle',
    community: product.community,
    title: `新产品已部署：${product.name}`,
    text: `我根据你的描述做了一个可演示版本：${product.desc}`,
    source: 'VibeCoding',
    product: product.name,
    time: '刚刚',
    likes: 0,
    replies: 0,
  }
  state.piClub.posts = [post, ...(state.piClub.posts ?? [])].slice(0, 80)
  writeState(state)
  addEvolutionEvent({
    type: 'vibecoding.product_deployed',
    subjectId: product.id,
    summary: `VibeCoding 产品「${product.name}」已部署`,
    evidence: { url: product.url, community: product.community },
  })
  return { product, post, state: piClubState() }
}

function sanitizePlain(value) {
  return String(value)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

function asciiSlugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function joinedCommunityName(piClub) {
  return piClub.communities?.find((item) => item.joined)?.name
}

function formatPhotoDraft(title, count, useCase) {
  const intent = {
    moments: '我已经挑出适合发朋友圈的画面，会配一段克制一点的说明。',
    video: '我会先按镜头顺序整理素材，再做一个短视频脚本。',
    research: '我会把照片当作现场证据，整理成研究记录和可引用素材。',
  }[useCase] ?? '我会先整理素材，再生成可发布草稿。'
  return `【${title}】收到 ${count} 张照片。${intent}`
}

async function createAppleReminder(input) {
  const topic = sanitizeReminderPart(input.topic || 'Pi 正在工作')
  const body = sanitizeReminderPart(input.body || '我正在整理当前任务进度，完成后会回来给你确认。')
  const mobileMessage = formatMobileMessage(topic, body)
  const dueAt = input.dueInMinutes
    ? new Date(Date.now() + Math.max(1, Number(input.dueInMinutes)) * 60_000).toISOString()
    : undefined
  const reminder = {
    id: newId('reminder'),
    title: mobileMessage,
    notes: mobileMessage,
    list: sanitizeReminderPart(input.list || 'EvoPi'),
    dueAt,
    createdAt: new Date().toISOString(),
  }

  try {
    await addMacReminder(reminder)
  } catch (error) {
    reminder.localOnly = true
    reminder.error = error instanceof Error ? error.message : 'Apple Reminders unavailable'
  }

  const state = readState()
  state.reminders = [...(state.reminders ?? []), reminder].slice(-80)
  writeState(state)
  addEvolutionEvent({
    type: 'apple_reminder.created',
    subjectId: reminder.id,
    summary: reminder.localOnly ? `本地记录提醒：${mobileMessage}` : `已写入 Apple 提醒事项：${mobileMessage}`,
    evidence: { list: reminder.list, dueAt, localOnly: reminder.localOnly ?? false },
  })
  return { ok: !reminder.localOnly, reminder, mobileMessage }
}

function addMacReminder(reminder) {
  const script = `
on sanitizeDate(isoText)
  if isoText is "" then return missing value
  set y to text 1 thru 4 of isoText as integer
  set m to text 6 thru 7 of isoText as integer
  set d to text 9 thru 10 of isoText as integer
  set hh to text 12 thru 13 of isoText as integer
  set mm to text 15 thru 16 of isoText as integer
  set dueDate to current date
  set year of dueDate to y
  set month of dueDate to m
  set day of dueDate to d
  set hours of dueDate to hh
  set minutes of dueDate to mm
  set seconds of dueDate to 0
  return dueDate
end sanitizeDate

set reminderTitle to ${osascriptString(reminder.title)}
set reminderBody to ${osascriptString(reminder.notes)}
set reminderListName to ${osascriptString(reminder.list)}
set reminderDueIso to ${osascriptString(reminder.dueAt || '')}

tell application "Reminders"
  if not (exists list reminderListName) then
    make new list with properties {name:reminderListName}
  end if
  set targetList to list reminderListName
  if reminderDueIso is "" then
    make new reminder at end of reminders of targetList with properties {name:reminderTitle, body:reminderBody}
  else
    make new reminder at end of reminders of targetList with properties {name:reminderTitle, body:reminderBody, due date:my sanitizeDate(reminderDueIso)}
  end if
end tell
`
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], { timeout: 45_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message))
      } else {
        resolve(stdout)
      }
    })
  })
}

function sanitizeReminderPart(value) {
  return String(value)
    .replace(/\*/g, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 360)
}

function formatMobileMessage(topic, body) {
  const cleanTopic = sanitizeReminderPart(topic).replace(/^【|】$/g, '') || 'Pi 正在工作'
  const cleanBody = sanitizeReminderPart(body) || '我正在处理任务，完成后回来给你确认。'
  return `【${cleanTopic}】${cleanBody}`
}

function osascriptString(value) {
  return JSON.stringify(String(value)).replace(/\u2028|\u2029/g, '')
}

function addEvolutionEvent(input) {
  const state = readState()
  state.evolutionEvents.push({
    id: newId('evt'),
    type: input.type,
    subjectId: input.subjectId,
    summary: input.summary,
    createdAt: new Date().toISOString(),
    evidence: input.evidence,
  })
  state.evolutionEvents = state.evolutionEvents.slice(-200)
  writeState(state)
}

function mockRecipes(query, limit) {
  return Array.from({ length: Math.min(limit, 6) }, (_, index) => ({
    id: `mock_recipe_${index + 1}`,
    title: `${query} · 可复用流程 ${index + 1}`,
    description: '本地后端 mock 的 EvoMap recipe，用于目标舱小票和 Skill 沉淀联动验证。',
    status: 'test',
    livemode: false,
  }))
}

function mockGenes(limit) {
  return Array.from({ length: Math.min(limit, 6) }, (_, index) => ({
    id: `gene_mock_${index + 1}`,
    type: 'behavior',
    title: `EvoPi 行为基因 ${index + 1}`,
    description: '本地后端 mock 的 Gene，用于前端验证。',
    livemode: false,
  }))
}

function mockReuseGraph(limit) {
  return {
    recipeId: 'mock_recipe',
    relatedRecipes: mockRecipes('关联经验', Math.min(limit, 4)),
    reusedInRecipes: mockRecipes('复用场景', Math.min(limit, 3)),
    pagination: { limit },
  }
}

function developerEnv() {
  return {
    id: 'evomap-dev-local',
    kind: 'evomap-developers',
    status: 'missing',
    rootPath: '',
    packagePath: '',
    examplePath: '',
    docsPaths: [],
    detectedVersion: '',
    baseUrl: 'http://127.0.0.1:8787',
    configured: false,
    connected: false,
    mode: 'test',
    defaultScopes: ['recipes:read', 'genes:read'],
    webhookConfigured: false,
    capabilities: [],
    workflows: [
      { id: 'recipe-search', label: 'Recipe 搜索', description: '本地 mock recipe search', route: '/api/evomap/recipes/search', method: 'GET', scopes: ['recipes:read'], mode: 'read', requiresConnection: false, available: true },
      { id: 'gene-list', label: 'Gene 列表', description: '本地 mock gene list', route: '/api/evomap/genes', method: 'GET', scopes: ['genes:read'], mode: 'read', requiresConnection: false, available: true },
      { id: 'reuse-query', label: 'Reuse Graph', description: '本地 mock reuse graph', route: '/api/evomap/reuse', method: 'GET', scopes: ['recipes:read'], mode: 'read', requiresConnection: false, available: true },
      { id: 'quickstart-test', label: 'Quickstart Test', description: '本地后端健康检查', route: '/api/health', method: 'GET', scopes: [], mode: 'read', requiresConnection: false, available: true },
    ],
    configSummary: { localMock: true },
    warnings: ['EvoMap 真实接入未在本轮启用。'],
    importedAt: new Date(0).toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function wechatConnector(state) {
  const session = state.wechatSession
  return {
    id: 'wechat-local',
    kind: 'wechat',
    status: session?.status === 'connected' ? 'connected' : session?.status === 'qr_pending' ? 'qr_pending' : 'disconnected',
    label: '微信',
    descriptor: wechatDescriptor(),
    activeSessionId: session?.id,
    connectedIdentity: session?.status === 'connected' ? { displayName: session.displayName, chatId: session.chatId } : undefined,
    lastSeenAt: session?.updatedAt,
    createdAt: session?.createdAt ?? new Date(0).toISOString(),
    updatedAt: session?.updatedAt ?? new Date().toISOString(),
  }
}

function createWeChatSession() {
  const now = Date.now()
  const manualCode = String(Math.floor(100000 + Math.random() * 900000))
  return {
    id: newId('wechat'),
    kind: 'wechat',
    status: 'qr_pending',
    qrPayload: `evopi://wechat/local/${manualCode}`,
    qrDataUrl: svgQrDataUrl(manualCode),
    manualCode,
    nonceHash: hash(manualCode),
    expiresAt: new Date(now + 5 * 60_000).toISOString(),
    expiresInSec: 300,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  }
}

function wechatDescriptor() {
  return {
    contractVersion: 1,
    platform: 'wechat',
    label: '微信',
    maxMessageLength: 2000,
    supportsDraftStreaming: false,
    supportsEdit: true,
    supportsThreads: false,
    markdownDialect: 'plain',
    lenUnit: 'chars',
    piiSafe: true,
    platformHint: '本地 mock 微信桥接，用于验证 Pi 回复闭环。',
  }
}

function wechatRelayContract(state) {
  return {
    contractVersion: 1,
    platform: 'wechat',
    label: '微信',
    relayConfigured: true,
    endpoint: 'http://127.0.0.1:8787/api/connectors/wechat/inbound',
    method: 'POST',
    contentType: 'application/json',
    signature: {
      scheme: 'wechat-relay-v1',
      algorithm: 'HMAC-SHA256',
      signedPayload: 't.<rawBody>',
      headerNames: ['x-evopi-timestamp', 'x-evopi-signature'],
      exampleHeader: 'x-evopi-signature: v1=<hex>',
      secretLocation: 'backend-env',
      secretExposed: false,
    },
    delivery: {
      idHeaderName: 'x-evopi-wechat-delivery',
      idBodyField: 'deliveryId',
      duplicatePolicy: 'idempotent',
    },
    payloadSchemas: [
      { type: 'ping', required: ['type'], optional: [], notes: '健康检查', example: { type: 'ping' } },
      { type: 'session.confirmed', required: ['type', 'sessionId'], optional: ['displayName', 'chatId'], notes: '确认连接', example: { type: 'session.confirmed', sessionId: state.wechatSession?.id } },
      { type: 'message.received', required: ['type', 'message'], optional: ['sessionId'], notes: '转入 Pi 处理', example: { type: 'message.received', message: '帮我整理一下' } },
    ],
    descriptor: wechatDescriptor(),
    current: { connector: wechatConnector(state), session: state.wechatSession ? compactWeChatSession(state.wechatSession) : undefined },
    copyConfig: {
      endpoint: 'http://127.0.0.1:8787/api/connectors/wechat/inbound',
      method: 'POST',
      contentType: 'application/json',
      signatureScheme: 'wechat-relay-v1',
      signatureHeaders: ['x-evopi-timestamp', 'x-evopi-signature'],
      deliveryHeader: 'x-evopi-wechat-delivery',
      supportedEvents: ['ping', 'session.confirmed', 'message.received'],
      maxMessageLength: 2000,
    },
  }
}

function compactWeChatSession(session) {
  return {
    id: session.id,
    status: session.status,
    manualCode: session.manualCode,
    expiresAt: session.expiresAt,
    expiresInSec: session.expiresInSec,
    connectedAt: session.connectedAt,
    displayName: session.displayName,
    chatId: session.chatId,
  }
}

function sendJson(res, status, body) {
  setCors(res)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text.trim()) return {}
  return JSON.parse(text)
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index < 0) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function stripThink(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function extractOutput(result) {
  if (typeof result?.json?.reply === 'string') return result.json.reply
  if (typeof result?.stdout === 'string') return result.stdout
  return ''
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/skill[:：]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'skill'
}

function renderExportedSkill(skill) {
  return `# ${skill.name}

## Description

${skill.description}

## Trigger

${skill.trigger ?? 'EvoPi needs this reusable context.'}

## Context Cache

${(skill.contextCache ?? []).map((item) => `- ${item}`).join('\n') || '- Empty'}
`
}

function skillToRecipeInput(skill) {
  return {
    name: skill.name,
    description: skill.description,
    trigger: skill.trigger,
    privacyPolicy: skill.privacyPolicy,
    referencedEvoMapIds: skill.referencedEvoMapIds ?? [],
  }
}

function svgQrDataUrl(code) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="#fff8f0"/><rect x="18" y="18" width="38" height="38" rx="6" fill="#2f2a25"/><rect x="104" y="18" width="38" height="38" rx="6" fill="#2f2a25"/><rect x="18" y="104" width="38" height="38" rx="6" fill="#2f2a25"/><path d="M78 30h10v10H78zM92 44h10v10H92zM72 70h16v16H72zM98 76h12v12H98zM116 96h20v20h-20zM70 116h10v10H70zM88 122h12v12H88z" fill="#2f2a25"/><text x="80" y="89" text-anchor="middle" font-family="Arial" font-size="16" fill="#2f2a25">${code}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function externalAgentLabel(kind) {
  if (kind === 'openclaw') return 'OpenClaw'
  if (kind === 'hermes') return 'Hermes'
  return 'Pi'
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

process.on('SIGTERM', () => server.close(() => process.exit(0)))
process.on('SIGINT', () => server.close(() => process.exit(0)))

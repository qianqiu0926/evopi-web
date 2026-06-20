const API_BASE = (import.meta.env.VITE_EVOPI_API_BASE ?? 'http://127.0.0.1:8787').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export type EvoMapRecipe = {
  id?: string
  title?: string
  description?: string
  status?: string
  livemode?: boolean
  [key: string]: unknown
}

export type EvoMapRecipeSearchResponse = {
  recipes?: EvoMapRecipe[]
  pagination?: Record<string, unknown>
  livemode?: boolean
}

export type EvoMapGene = {
  id?: string
  type?: string
  title?: string
  name?: string
  description?: string
  livemode?: boolean
  [key: string]: unknown
}

export type EvoMapGenesResponse = {
  genes?: EvoMapGene[]
  pagination?: Record<string, unknown>
}

export type EvoMapReuseResponse = {
  recipeId?: string
  relatedRecipes?: EvoMapRecipe[]
  assetId?: string
  reusedInRecipes?: EvoMapRecipe[]
  pagination?: Record<string, unknown>
}

export type ReceiptRun = {
  id: string
  title: string
  referencedEvoMapIds: string[]
  steps?: Array<{
    id: string
    title: string
    status: 'pending' | 'running' | 'done' | 'blocked' | 'failed'
    inputSummary?: string
    outputSummary?: string
    referencedEvoMapIds: string[]
  }>
}

export type Skill = {
  id: string
  sourceReceiptRunId?: string
  name: string
  description: string
  status: 'local' | 'drafted' | 'test_published' | 'published'
  recipeLink?: {
    evomapRecipeId: string
    status: 'draft' | 'test_published' | 'published'
    livemode: boolean
    lastSyncedAt?: string
    webhook?: {
      lastEventType: string
      lastDeliveryId: string
      lastReceivedAt: string
      signatureScheme?: string
    }
    reuseGraph?: {
      lastQueriedAt: string
      relatedRecipeCount: number
      reusedInRecipeCount: number
    }
  }
}

export type EvolutionEvent = {
  id: string
  type: string
  subjectId?: string
  summary: string
  createdAt: string
  evidence?: Record<string, unknown>
}

export type EvoMapConnectionStatus = {
  configured: boolean
  connected: boolean
  connection?: {
    id?: string
    evomapSub?: string
    evomapName?: string
    evomapEmail?: string
    clientId?: string
    mode: 'test' | 'live' | 'unknown'
    scopes: string[]
    expiresAt?: string
    createdAt?: string
    updatedAt?: string
  }
}

export type ExternalAgentKind = 'openclaw' | 'hermes' | 'pi'

export type ExternalAgentSkill = {
  id: string
  kind: ExternalAgentKind
  name: string
  path: string
  title?: string
  description?: string
  version?: string
  tags: string[]
  source: 'workspace' | 'global' | 'bundled' | 'managed' | 'hermes' | 'piroom' | 'productivity' | 'unknown'
  syncedSkillId?: string
  importedAt: string
  connectionId?: string
  connectionStatus?: 'detected' | 'imported' | 'missing'
}

export type ExternalAgentConnection = {
  id: string
  kind: ExternalAgentKind
  status: 'detected' | 'imported' | 'missing'
  binPath?: string
  homePath?: string
  configPath?: string
  workspacePath?: string
  skillsRootPaths: string[]
  detectedVersion?: string
  dashboardUrl?: string
  configSummary?: Record<string, unknown>
  skills: ExternalAgentSkill[]
}

export type ExternalAgentDiscovery = Omit<ExternalAgentConnection, 'id' | 'status'> & {
  detected: boolean
  warnings: string[]
}

export type ExternalAgentConfigOverrides = {
  openclaw?: {
    bin?: string
    home?: string
    configPath?: string
    workspacePath?: string
    model?: string
  }
  hermes?: {
    bin?: string
    home?: string
    configPath?: string
    skillsPath?: string
  }
  pi?: {
    bin?: string
    home?: string
    projectPath?: string
    skillsPath?: string
    sessionDir?: string
  }
}

export type HermesMigrationPreview = {
  available: boolean
  command: string[]
  fromPath?: string
  stdout: string
  stderr: string
  json?: unknown
  warning?: string
}

export type PiRoomPersona = {
  id: string
  name: string
  title: string
  description: string
  skillName: string
  sourceUrl: string
  sourceLabel: string
  basis: string
  avatar: string
  skillPath?: string
  available: boolean
}

export type ConnectorKind = 'wechat'
export type ConnectorStatus = 'disconnected' | 'qr_pending' | 'connected' | 'expired' | 'error'

export type ConnectorCapabilityDescriptor = {
  contractVersion: 1
  platform: ConnectorKind
  label: string
  maxMessageLength: number
  supportsDraftStreaming: boolean
  supportsEdit: boolean
  supportsThreads: boolean
  markdownDialect: 'plain' | 'markdown'
  lenUnit: 'chars' | 'utf16'
  piiSafe: boolean
  platformHint: string
}

export type MessagingConnector = {
  id: string
  kind: ConnectorKind
  status: ConnectorStatus
  label: string
  descriptor: ConnectorCapabilityDescriptor
  activeSessionId?: string
  connectedIdentity?: {
    displayName?: string
    chatId?: string
  }
  lastSeenAt?: string
  createdAt: string
  updatedAt: string
}

export type ConnectorSession = {
  id: string
  kind: ConnectorKind
  status: ConnectorStatus
  qrPayload: string
  qrDataUrl: string
  manualCode: string
  nonceHash?: string
  expiresAt: string
  expiresInSec: number
  createdAt: string
  updatedAt: string
  connectedAt?: string
  displayName?: string
  chatId?: string
  lastError?: string
}

export type WeChatRelayContract = {
  contractVersion: 1
  platform: 'wechat'
  label: string
  relayConfigured: boolean
  endpoint: string
  method: 'POST'
  contentType: 'application/json'
  signature: {
    scheme: 'wechat-relay-v1'
    algorithm: 'HMAC-SHA256'
    signedPayload: 't.<rawBody>'
    headerNames: string[]
    exampleHeader: string
    secretLocation: 'backend-env'
    secretExposed: false
  }
  delivery: {
    idHeaderName: 'x-evopi-wechat-delivery'
    idBodyField: 'deliveryId'
    duplicatePolicy: 'idempotent'
  }
  payloadSchemas: Array<{
    type: 'ping' | 'session.confirmed' | 'message.received'
    required: string[]
    optional: string[]
    notes: string
    example: Record<string, unknown>
  }>
  descriptor: ConnectorCapabilityDescriptor
  current: {
    connector: MessagingConnector
    session?: {
      id: string
      status: ConnectorStatus
      manualCode: string
      expiresAt: string
      expiresInSec: number
      connectedAt?: string
      displayName?: string
      chatId?: string
    }
  }
  copyConfig: {
    endpoint: string
    method: 'POST'
    contentType: 'application/json'
    signatureScheme: 'wechat-relay-v1'
    signatureHeaders: string[]
    deliveryHeader: 'x-evopi-wechat-delivery'
    supportedEvents: Array<'ping' | 'session.confirmed' | 'message.received'>
    maxMessageLength: number
  }
}

export type VolcengineRealtimeConfig = {
  provider: 'volcengine-rtc'
  configured: boolean
  appIdConfigured: boolean
  appKeyConfigured: boolean
  appIdPreview: string
  scene: string
  missing: string[]
  nextAction: string
  notes: string[]
}

export type DoubaoSpeechResponse = {
  provider: 'doubao-tts'
  configured: boolean
  audioMime: string
  audioBase64: string
  voiceType: string
}

export type ExternalAgentCallResult = {
  kind: ExternalAgentKind
  command: string[]
  stdout: string
  stderr: string
  json?: unknown
}

export type ExternalAgentOperation = {
  operationId: string
  kind: ExternalAgentKind
  status: 'completed' | 'runtime_error' | 'failed'
  agent?: string
  skillName?: string
  hasSession?: boolean
  sessionKeyHash?: string
  local?: boolean
  command?: string[]
  hasJson?: boolean
  jsonKeys?: string[]
  fallback?: unknown
  reason?: unknown
  runtimeReason?: string
  provider?: string
  model?: string
  modelOverride?: string
  stdoutPreview?: string
  stderrPreview?: string
  outputPreview?: string
  errorCode?: string
  statusCode?: number
}

export type DeveloperEnvironmentKind = 'evomap-developers'

export type DeveloperCapability = {
  id: string
  label: string
  description: string
  source: 'repo' | 'api' | 'webhook' | 'oauth' | 'example'
  scopes: string[]
  readOnly: boolean
  destructive: boolean
  available: boolean
  evidencePath?: string
}

export type DeveloperWorkflow = {
  id: 'oauth-connect' | 'recipe-search' | 'gene-list' | 'reuse-query' | 'quickstart-test' | 'recipe-draft' | 'test-publish' | 'webhook-verify'
  label: string
  description: string
  route: string
  method: 'GET' | 'POST'
  scopes: string[]
  mode: 'preview' | 'read' | 'write' | 'publish'
  requiresConnection: boolean
  available: boolean
}

export type DeveloperEnvironmentConnection = {
  id: string
  kind: DeveloperEnvironmentKind
  status: 'detected' | 'imported' | 'missing' | 'needs_auth'
  rootPath?: string
  packagePath?: string
  examplePath?: string
  docsPaths: string[]
  detectedVersion?: string
  baseUrl: string
  configured: boolean
  connected: boolean
  mode: 'test' | 'live' | 'unknown'
  defaultScopes: string[]
  webhookConfigured: boolean
  capabilities: DeveloperCapability[]
  workflows: DeveloperWorkflow[]
  configSummary: Record<string, unknown>
  warnings: string[]
  importedAt: string
  updatedAt: string
}

export type DeveloperWorkflowOperation = {
  operationId: string
  kind: DeveloperEnvironmentKind
  workflowId: 'recipe-search' | 'gene-list' | 'reuse-query' | 'quickstart-test'
  status: 'completed' | 'failed'
  mode: 'test' | 'live' | 'unknown'
  startedAt?: string
  endedAt?: string
  durationMs?: number
  resultCount?: number
  input?: Record<string, unknown>
}

export type EvoMapQuickstartTestResponse = {
  kind: 'quickstart-test'
  passed: boolean
  command?: string[]
  cwd?: string
  exitCode?: number
  durationMs?: number
  testCount?: number
  stdoutPreview?: string
  stderrPreview?: string
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const errorBody = body && typeof body === 'object' ? body as Record<string, unknown> : {}
    throw new ApiError(
      res.status,
      typeof errorBody.error === 'string' ? errorBody.error : 'api_error',
      typeof errorBody.message === 'string' ? errorBody.message : `API request failed: ${res.status}`,
      errorBody.details,
    )
  }
  return body as T
}

function compactExternalOverrides(input?: ExternalAgentConfigOverrides): ExternalAgentConfigOverrides {
  if (!input) return {}
  const compactRuntime = (runtime?: Record<string, string | undefined>) => (
    Object.fromEntries(Object.entries(runtime ?? {}).map(([key, value]) => [key, value?.trim()]).filter(([, value]) => Boolean(value)))
  )
  const openclaw = compactRuntime(input.openclaw)
  const hermes = compactRuntime(input.hermes)
  const pi = compactRuntime(input.pi)
  return {
    ...(Object.keys(openclaw).length ? { openclaw } : {}),
    ...(Object.keys(hermes).length ? { hermes } : {}),
    ...(Object.keys(pi).length ? { pi } : {}),
  }
}

function hasExternalOverrides(input: ExternalAgentConfigOverrides): boolean {
  return Object.values(input).some((runtime) => runtime && Object.keys(runtime).length > 0)
}

export async function getEvoMapConnection() {
  return api<EvoMapConnectionStatus>('/api/evomap/connection')
}

export async function getEvoMapConnectUrl(scopes?: string[]) {
  const query = scopes?.length ? `?scopes=${encodeURIComponent(scopes.join(' '))}` : ''
  return api<{ url: string; scopes: string[]; mode: 'test' | 'live' | 'unknown' }>(`/api/evomap/connect-url${query}`)
}

export async function revokeEvoMapConnection() {
  return api<{ ok: boolean; connected: boolean }>('/api/evomap/revoke', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function searchEvoMapRecipes(q: string, limit = 6) {
  const params = new URLSearchParams({ q, limit: String(limit) })
  return api<EvoMapRecipeSearchResponse>(`/api/evomap/recipes/search?${params}`)
}

export async function listEvoMapGenes(type?: string, limit = 6) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (type?.trim()) params.set('type', type.trim())
  return api<EvoMapGenesResponse>(`/api/evomap/genes?${params}`)
}

export async function queryEvoMapReuse(input: { recipeId?: string; assetId?: string; limit?: number }) {
  const params = new URLSearchParams({ limit: String(input.limit ?? 6) })
  if (input.recipeId) params.set('recipeId', input.recipeId)
  if (input.assetId) params.set('assetId', input.assetId)
  return api<EvoMapReuseResponse>(`/api/evomap/reuse?${params}`)
}

export async function createReceiptRun(input: {
  goalName?: string
  title: string
  evomapSearchQuery?: string
  referencedEvoMapIds?: string[]
  steps?: Array<{
    title: string
    status?: 'pending' | 'running' | 'done' | 'blocked' | 'failed'
    inputSummary?: string
    outputSummary?: string
    referencedEvoMapIds?: string[]
  }>
}) {
  return api<{ run: ReceiptRun }>('/api/receipt-runs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function attachEvoMapReference(runId: string, input: {
  evomapId: string
  source: 'recipe' | 'gene'
  title?: string
}) {
  return api<{ run: ReceiptRun }>(`/api/receipt-runs/${runId}/evomap/attach`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createSkill(input: {
  goalName?: string
  name?: string
  description?: string
  trigger?: string
  contextCache: string[]
  referencedEvoMapIds: string[]
  privacyPolicy?: 'private' | 'summary_only' | 'publishable'
}) {
  return api<{ skill: Skill }>('/api/skills', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getSkill(skillId: string) {
  return api<{ skill: Skill }>(`/api/skills/${encodeURIComponent(skillId)}`)
}

export async function createSkillFromReceiptRun(runId: string, input: {
  goalName?: string
  name?: string
  description?: string
  trigger?: string
  contextCache?: string[]
  referencedEvoMapIds?: string[]
  privacyPolicy?: 'private' | 'summary_only' | 'publishable'
}) {
  return api<{ skill: Skill; run: ReceiptRun }>(`/api/receipt-runs/${runId}/skill`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createEvoMapDraft(skillId: string) {
  return api<{ skill: Skill; recipe: unknown; recipeInput: unknown }>(`/api/skills/${skillId}/evomap/draft`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function testPublishEvoMapRecipe(skillId: string) {
  return api<{ skill: Skill; recipe: unknown; recipeInput: unknown }>(`/api/skills/${skillId}/evomap/test-publish`, {
    method: 'POST',
    body: JSON.stringify({ confirmLivePublish: false }),
  })
}

export async function syncSkillEvoMapReuse(skillId: string, limit = 8) {
  return api<{ skill: Skill; reuse: EvoMapReuseResponse }>(`/api/skills/${skillId}/evomap/reuse`, {
    method: 'POST',
    body: JSON.stringify({ limit }),
  })
}

export async function listEvolutionEvents(limit = 30) {
  return api<{ events: EvolutionEvent[] }>(`/api/evolution/events?limit=${limit}`)
}

export function evolutionEventsStreamUrl(limit = 30) {
  return `${API_BASE}/api/evolution/events/stream?limit=${encodeURIComponent(String(limit))}`
}

export async function discoverExternalAgents(input: { overrides?: ExternalAgentConfigOverrides } = {}) {
  const overrides = compactExternalOverrides(input.overrides)
  if (!hasExternalOverrides(overrides)) return api<{ discoveries: ExternalAgentDiscovery[] }>('/api/external-agents/discover')
  return api<{ discoveries: ExternalAgentDiscovery[] }>('/api/external-agents/discover', {
    method: 'POST',
    body: JSON.stringify({ overrides }),
  })
}

export async function importExternalAgents(kinds: ExternalAgentKind[] = ['pi', 'openclaw', 'hermes'], overrides?: ExternalAgentConfigOverrides) {
  return api<{ connections: ExternalAgentConnection[] }>('/api/external-agents/import', {
    method: 'POST',
    body: JSON.stringify({ kinds, overrides: compactExternalOverrides(overrides) }),
  })
}

export async function bootstrapExternalAgents(input: { kinds?: ExternalAgentKind[]; force?: boolean; overrides?: ExternalAgentConfigOverrides } = {}) {
  return api<{ connections: ExternalAgentConnection[]; imported: boolean }>('/api/external-agents/bootstrap', {
    method: 'POST',
    body: JSON.stringify({
      kinds: input.kinds ?? ['pi', 'openclaw', 'hermes'],
      force: Boolean(input.force),
      overrides: compactExternalOverrides(input.overrides),
    }),
  })
}

export async function listExternalConnections() {
  return api<{ connections: ExternalAgentConnection[] }>('/api/external-agents/connections')
}

export async function listExternalSkills() {
  return api<{ skills: ExternalAgentSkill[] }>('/api/external-agents/skills')
}

export async function getEvoMapDeveloperEnvironment() {
  return api<{ environment: DeveloperEnvironmentConnection; imported: boolean }>('/api/developer-environments/evomap')
}

export async function discoverEvoMapDeveloperEnvironment(input: { rootPath?: string } = {}) {
  return api<{ discovery: Omit<DeveloperEnvironmentConnection, 'id' | 'importedAt' | 'updatedAt'> }>('/api/developer-environments/evomap/discover', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function bootstrapEvoMapDeveloperEnvironment(input: { rootPath?: string; force?: boolean } = {}) {
  return api<{ environment: DeveloperEnvironmentConnection; imported: boolean }>('/api/developer-environments/evomap/bootstrap', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function runEvoMapDeveloperWorkflow(input: {
  workflowId: 'recipe-search' | 'gene-list' | 'reuse-query' | 'quickstart-test'
  query?: string
  type?: string
  recipeId?: string
  assetId?: string
  limit?: number
}) {
  return api<{
    result: EvoMapRecipeSearchResponse | EvoMapGenesResponse | EvoMapReuseResponse | EvoMapQuickstartTestResponse
    operation: DeveloperWorkflowOperation
    run: ReceiptRun
  }>('/api/developer-environments/evomap/run', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function listPiRoomPersonas() {
  return api<{ personas: PiRoomPersona[] }>('/api/piroom/personas')
}

export async function previewHermesMigration(input: { fromPath?: string; timeoutSec?: number } = {}) {
  return api<{ preview: HermesMigrationPreview }>('/api/external-agents/hermes/migrate-preview', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function syncExternalSkillToEvoPi(externalSkillId: string) {
  return api<{ skill: Skill }>(`/api/external-agents/skills/${externalSkillId}/sync-to-evopi`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function syncExternalSkillsToEvoPi(input: { kinds?: ExternalAgentKind[]; limit?: number } = {}) {
  return api<{
    created: number
    skipped: number
    results: Array<{
      status: 'created' | 'skipped'
      reason?: 'already_synced'
      externalSkillId: string
      kind: ExternalAgentKind
      skill: Skill
    }>
  }>('/api/external-agents/skills/sync-to-evopi', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function callExternalAgent(input: {
  kind: ExternalAgentKind
  message: string
  agent?: string
  skillName?: string
  model?: string
  sessionKey?: string
  visualFrameDataUrl?: string
  local?: boolean
  timeoutSec?: number
}) {
  return api<{ result: ExternalAgentCallResult; operation: ExternalAgentOperation }>('/api/external-agents/call', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function runPiAgent(input: {
  goalName?: string
  workspaceTitle?: string
  message: string
  visualFrameDataUrl?: string
  agent?: string
  sessionKey?: string
  evomapSearchQuery?: string
  referencedEvoMapIds?: string[]
  timeoutSec?: number
}) {
  return api<{ result: ExternalAgentCallResult; run: ReceiptRun; operation: ExternalAgentOperation }>('/api/agent-runs/pi', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function runExternalAgentWithReceipt(input: {
  kind: ExternalAgentKind
  goalName?: string
  workspaceTitle?: string
  message: string
  agent?: string
  skillName?: string
  model?: string
  sessionKey?: string
  local?: boolean
  evomapSearchQuery?: string
  referencedEvoMapIds?: string[]
  timeoutSec?: number
}) {
  return api<{ result: ExternalAgentCallResult; run: ReceiptRun; operation: ExternalAgentOperation }>('/api/agent-runs/external', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getVolcengineRealtimeConfig() {
  return api<VolcengineRealtimeConfig>('/api/volcengine/realtime/config')
}

export async function synthesizeDoubaoSpeech(input: {
  text: string
  voiceType?: string
  speedRatio?: number
  pitchRatio?: number
}) {
  return api<DoubaoSpeechResponse>('/api/voice/doubao/tts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function exportSkillToOpenClaw(skillId: string, input: { slug?: string; apply?: boolean } = {}) {
  return api<{ result: { apply: boolean; slug: string; targetDir: string; skillPath: string; content: string } }>(`/api/skills/${skillId}/openclaw/export`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function exportSkillToExternalAgent(skillId: string, input: { kind: ExternalAgentKind; slug?: string; apply?: boolean }) {
  return api<{ result: { kind: ExternalAgentKind; apply: boolean; slug: string; targetDir: string; skillPath: string; content: string } }>(`/api/skills/${skillId}/external-agents/export`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function listConnectors() {
  return api<{ connectors: MessagingConnector[] }>('/api/connectors')
}

export async function getWeChatRelayContract() {
  return api<{ contract: WeChatRelayContract }>('/api/connectors/wechat/relay-contract')
}

export async function createWeChatSession() {
  return api<{ connector: MessagingConnector; session: ConnectorSession }>('/api/connectors/wechat/session', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function getWeChatSession(sessionId: string) {
  return api<{ connector: MessagingConnector; session: ConnectorSession }>(`/api/connectors/wechat/session/${encodeURIComponent(sessionId)}`)
}

export async function confirmWeChatSession(sessionId: string, input: { displayName?: string; chatId?: string; nonce?: string; manualCode?: string } = {}) {
  return api<{ connector: MessagingConnector; session: ConnectorSession }>(`/api/connectors/wechat/session/${encodeURIComponent(sessionId)}/confirm`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function sendWeChatFollowUp(input: { goalName?: string; receiptRunId?: string; message: string }) {
  return api<{ ok: boolean; delivery: { platform: 'wechat'; status: 'queued'; chatId?: string; messagePreview: string } }>('/api/connectors/wechat/follow-up', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function sendWeChatInbound(input: {
  sessionId?: string
  goalName?: string
  workspaceTitle?: string
  message: string
  referencedEvoMapIds?: string[]
  timeoutSec?: number
}) {
  return api<{ ok: boolean; connector: MessagingConnector; session: ConnectorSession; result: ExternalAgentCallResult; run: ReceiptRun; operation: ExternalAgentOperation; replyPreview: string }>('/api/connectors/wechat/inbound', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function disconnectWeChat() {
  return api<{ ok: boolean; connector: MessagingConnector }>('/api/connectors/wechat/disconnect', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export type AppleReminderResponse = {
  ok: boolean
  reminder: {
    id: string
    title: string
    notes: string
    list: string
    dueAt?: string
    createdAt: string
    localOnly?: boolean
  }
  mobileMessage: string
}

export type PiClubCommunity = {
  id: string
  name: string
  desc: string
  type: 'research' | 'founder' | 'org'
  members: number
  piAgents: number
  joined: boolean
  owner: string
}

export type PiClubPost = {
  id: string
  author: string
  avatar: string
  community: string
  title: string
  text: string
  source: string
  media?: string
  product?: string
  time: string
  likes: number
  replies: number
  comments?: PiClubComment[]
}

export type PiClubComment = {
  id: string
  author: string
  text: string
  time: string
}

export type PiClubPhotoDrop = {
  id: string
  title: string
  source: 'apple-photos' | 'airdrop' | 'upload'
  count: number
  status: 'received' | 'drafted' | 'published'
  useCase: 'moments' | 'video' | 'research'
  createdAt: string
  draftText: string
}

export type PiClubProduct = {
  id: string
  name: string
  desc: string
  status: 'draft' | 'building' | 'deployed'
  url: string
  community?: string
  createdAt: string
  updatedAt: string
  stack: string[]
}

export type PiClubState = {
  communities: PiClubCommunity[]
  posts: PiClubPost[]
  photoDrops: PiClubPhotoDrop[]
  products: PiClubProduct[]
}

export async function createAppleReminder(input: {
  topic: string
  body: string
  list?: string
  dueInMinutes?: number
}) {
  return api<AppleReminderResponse>('/api/reminders/apple', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getPiClubState() {
  return api<PiClubState>('/api/piclub')
}

export async function createPiClubPost(input: {
  title: string
  text: string
  community?: string
  source?: string
  media?: string
  product?: string
}) {
  return api<{ post: PiClubPost; state: PiClubState }>('/api/piclub/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function likePiClubPost(postId: string) {
  return api<{ post: PiClubPost; state: PiClubState }>(`/api/piclub/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function commentPiClubPost(postId: string, text: string) {
  return api<{ comment: PiClubComment; post: PiClubPost; state: PiClubState }>(`/api/piclub/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export async function joinPiClubCommunity(communityId: string) {
  return api<{ community: PiClubCommunity; state: PiClubState }>(`/api/piclub/communities/${encodeURIComponent(communityId)}/join`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function createPhotoDrop(input: {
  title: string
  count: number
  source?: PiClubPhotoDrop['source']
  useCase?: PiClubPhotoDrop['useCase']
}) {
  return api<{ drop: PiClubPhotoDrop; state: PiClubState }>('/api/photos/apple/drop', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createVibeProduct(input: {
  name: string
  brief: string
  community?: string
}) {
  return api<{ product: PiClubProduct; state: PiClubState }>('/api/vibecoding/products', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

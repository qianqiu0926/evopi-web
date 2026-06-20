import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  assetLibrary,
  coEvolutionLoop,
  collaborationLevels,
  evolutionLogs,
  goals,
  goalSnippets,
  greeting,
  installedSkills,
  memories,
  memoryCategories,
  navGroups,
  pageMeta,
  pendingCount,
  presetPersons,
  privacyRows,
  quickStarts,
  recentMemories,
  receiptTemplates,
  sampleChat,
  storeSkills,
  todayFocus,
  userEvolutionLog,
  type AuthUser,
  type PetMood,
} from './data'
import type { Asset, ChatMsg, Goal, GoalSnippet, RoomPerson } from './data'
import { GroupedNav } from './components/GroupedNav'
import { PiCorePanel } from './components/PiCorePanel'
import { InteractiveBg } from './components/InteractiveBg'
import { AuthModal } from './components/AuthModal'
import { EvolutionMindMap } from './components/EvolutionMindMap'
import { Onboarding } from './components/Onboarding'
import {
  ApiError,
  attachEvoMapReference,
  bootstrapEvoMapDeveloperEnvironment,
  bootstrapExternalAgents,
  callExternalAgent,
  confirmWeChatSession,
  createEvoMapDraft,
  createReceiptRun,
  createSkill,
  createSkillFromReceiptRun,
  createWeChatSession,
  disconnectWeChat,
  discoverEvoMapDeveloperEnvironment,
  discoverExternalAgents,
  evolutionEventsStreamUrl,
  exportSkillToExternalAgent,
  getEvoMapDeveloperEnvironment,
  getWeChatRelayContract,
  getSkill,
  getWeChatSession,
  importExternalAgents,
  getEvoMapConnectUrl,
  getEvoMapConnection,
  listConnectors,
  listExternalConnections,
  listExternalSkills,
  listEvoMapGenes,
  listEvolutionEvents,
  listPiRoomPersonas,
  previewHermesMigration,
  queryEvoMapReuse,
  revokeEvoMapConnection,
  runEvoMapDeveloperWorkflow,
  runExternalAgentWithReceipt,
  searchEvoMapRecipes,
  syncSkillEvoMapReuse,
  syncExternalSkillsToEvoPi,
  syncExternalSkillToEvoPi,
  testPublishEvoMapRecipe,
  type EvoMapConnectionStatus,
  type EvoMapGene,
  type EvoMapGenesResponse,
  type EvoMapQuickstartTestResponse,
  type EvoMapRecipe,
  type EvoMapRecipeSearchResponse,
  type EvoMapReuseResponse,
  type EvolutionEvent,
  type ConnectorSession,
  type DeveloperEnvironmentConnection,
  type DeveloperWorkflow,
  type DeveloperWorkflowOperation,
  type ExternalAgentCallResult,
  type ExternalAgentConnection,
  type ExternalAgentConfigOverrides,
  type ExternalAgentDiscovery,
  type ExternalAgentKind,
  type ExternalAgentOperation,
  type ExternalAgentSkill,
  type HermesMigrationPreview,
  type MessagingConnector,
  type PiRoomPersona,
  type Skill,
  type WeChatRelayContract,
} from './api'
import { useActionState, useInlineHint, type ActionStatus } from './hooks/useActionState'

/* ============================================================
   类型与基础
   ============================================================ */
type AppPage = 'launch' | 'today' | 'goals' | 'memory' | 'room' | 'skills' | 'evolution' | 'privacy'
type Theme = 'cute' | 'notion' | 'glass'
type WorkspaceRuntimeKind = ExternalAgentKind | 'evomap-developers'
type ExternalRuntimePathForm = {
  openclaw: {
    bin: string
    home: string
    configPath: string
    workspacePath: string
    model: string
  }
  hermes: {
    bin: string
    home: string
    configPath: string
    skillsPath: string
  }
  evomap: {
    rootPath: string
  }
}

type CuteIconName =
  | 'soft-dashboard-tiles' | 'soft-goal-flag' | 'soft-database-stack' | 'soft-chat-bubble'
  | 'soft-settings-gear' | 'soft-log-lines' | 'soft-privacy-eye' | 'soft-calendar-reminder'
  | 'soft-send-plane' | 'soft-search-spark' | 'soft-file-upload' | 'soft-shield-check'
  | 'soft-folder-tab' | 'soft-success-check' | 'soft-warning-triangle' | 'soft-sparkle-twinkle'
  | 'soft-loading-loop' | 'soft-target-bullseye' | 'soft-sparkle-edit' | 'soft-book-open'
  | 'soft-notebook-lines' | 'soft-document-page' | 'soft-role-users' | 'soft-microphone-voice'
  | 'soft-lock-keyhole' | 'soft-bookmark-study' | 'soft-refresh-loop' | 'soft-note-sticky'
  | 'soft-arrow-left' | 'soft-add-plus' | 'soft-import-data' | 'soft-user-add'
  | 'soft-idea-bulb' | 'soft-image-landscape' | 'soft-waveform-audio' | 'soft-arrow-right'
  | 'soft-favorite-collection' | 'soft-heart-favorite'

const iconPath = (name: string) => `/cute-line-icons/${name}.png`

function CuteIcon({
  name, className = '', alt = '',
}: { name: string; className?: string; alt?: string }) {
  return <img className={`cute-icon ${className}`} src={iconPath(name)} alt={alt} loading="lazy" />
}

// 页面 key → 中文标签（用于 header kicker），来源：navGroups
const pageLabelMap: Record<string, string> = Object.fromEntries(
  navGroups.flatMap((g) => g.items.map((i) => [i.key, i.label])),
)

/* ============================================================
   App 根：launch 模式 / 应用模式
   - 集中管理：页面 / 主题 / PiCore 心情 / 暂停 / 登录态
   - 根据页面状态推断宠物心情（PiCore 状态体语义）
   ============================================================ */
type Mode = 'login' | 'register' | null

function App() {
  const [page, setPage] = useState<AppPage>('today')
  const [theme, setTheme] = useState<Theme>('cute')
  const [activePerson, setActivePerson] = useState<RoomPerson | null>(null)
  const [navCollapsed, setNavCollapsed] = useState(false) // 控制台整体收起
  const [paused, setPaused] = useState(false) // PiCore 暂停
  const [user, setUser] = useState<AuthUser | null>(null) // 登录态
  const [authOpen, setAuthOpen] = useState<Mode>(null) // 'login' | 'register' | null
  const [onboardingFor, setOnboardingFor] = useState<AuthUser | null>(null) // 新用户需先完成预配置
  const [onboardDepth, setOnboardDepth] = useState(2) // 预配置推导的初始介入深度

  useEffect(() => { document.body.dataset.theme = theme }, [theme])
  useEffect(() => {
    const area = document.querySelector('.page-area')
    if (area) area.scrollTop = 0
  }, [page])

  // 由页面状态推断 PiCore 心情（产品方案语义）
  const mood: PetMood = useMemo(() => {
    if (paused) return 'sleeping'
    if (page === 'evolution') return 'happy'
    if (page === 'memory' || page === 'today') return pendingCount > 0 ? 'feeding' : 'idle'
    if (page === 'skills') return 'learning'
    return 'idle'
  }, [page, paused])

  // 认证完成：新用户走 onboarding，老用户直接进入
  const handleAuthed = (u: AuthUser, isNew: boolean) => {
    setUser(u)
    setAuthOpen(null)
    if (isNew) setOnboardingFor(u)
  }

  // 新用户预配置：必须完成才能领 Pi 伙伴
  if (onboardingFor) {
    return (
      <Onboarding
        userName={onboardingFor.name}
        onFinish={(r) => {
          setOnboardDepth(r.depth)
          setOnboardingFor(null)
          setPage('today')
        }}
      />
    )
  }

  if (page === 'launch') {
    return (
      <>
        <LaunchPage
          onEnter={(p) => setPage(p)}
          theme={theme}
          setTheme={setTheme}
          user={user}
          onAuth={(m) => setAuthOpen(m)}
        />
        {authOpen && (
          <AuthModal
            initialMode={authOpen}
            onClose={() => setAuthOpen(null)}
            onAuthed={(u) => handleAuthed(u, authOpen === 'register')}
          />
        )}
      </>
    )
  }
  return (
    <>
    <AppShell
      page={page}
      setPage={setPage}
      theme={theme}
      setTheme={setTheme}
      activePerson={activePerson}
      setActivePerson={setActivePerson}
      navCollapsed={navCollapsed}
      setNavCollapsed={setNavCollapsed}
      mood={mood}
      paused={paused}
      setPaused={setPaused}
      user={user}
      onboardDepth={onboardDepth}
      onAuth={(m) => setAuthOpen(m)}
      onLogout={() => setUser(null)}
    />
    {authOpen && (
      <AuthModal
        initialMode={authOpen}
        onClose={() => setAuthOpen(null)}
        onAuthed={(u) => { setUser(u); setAuthOpen(null) }}
      />
    )}
  </>
  )
}

/* ============================================================
   发布页（Launching Page）—— 全屏入口
   ============================================================ */
function LaunchPage({
  onEnter, theme, setTheme, user, onAuth,
}: {
  onEnter: (p: AppPage) => void
  theme: Theme
  setTheme: (t: Theme) => void
  user: AuthUser | null
  onAuth: (m: 'login' | 'register') => void
}) {
  const [text, setText] = useState('')
  return (
    <main className="launch">
      <div className="doodle-bg" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <span className="blob blob-d" />
      </div>
      <InteractiveBg />
      <ThemeSwitcher theme={theme} setTheme={setTheme} />
      <div className="launch-auth">
        {user ? (
          <span className="auth-user-tag">
            <img className="cute-icon" src="/cute-line-icons/soft-role-users.png" alt="" />
            {user.name}
          </span>
        ) : (
          <>
            <button className="ghost-btn sm" onClick={() => onAuth('login')}>登录</button>
            <button className="primary-btn sm" onClick={() => onAuth('register')}>注册</button>
          </>
        )}
      </div>
      <section className="launch-inner">
        <div className="launch-brand">
          <div className="brand-mark big">Pi</div>
          <span className="launch-hello">{greeting.hello}{greeting.name ? '，' + greeting.name : ''}</span>
        </div>
        <h1 className="launch-title">{greeting.sub}</h1>
        <div className="launch-compose">
          <CuteIcon name="soft-sparkle-twinkle" />
          <input
            autoFocus
            placeholder="比如：我想和张雪峰聊聊我现在的职业方向……"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onEnter('today') }}
          />
          <button className="send-button" aria-label="开始" onClick={() => onEnter('today')}>
            <CuteIcon name="soft-arrow-right" />
          </button>
        </div>
        <div className="quick-grid">
          {quickStarts.map((q) => (
            <button
              className="quick-card"
              key={q.title}
              onClick={() => onEnter(q.tag === 'PiRoom' ? 'room' : q.tag === '目标舱' ? 'goals' : q.tag === '记忆库' ? 'memory' : 'today')}
            >
              <CuteIcon name={q.icon} />
              <div>
                <strong>{q.title}</strong>
                <span>{q.desc}</span>
              </div>
              <em className="tag">{q.tag}</em>
            </button>
          ))}
        </div>
        <button className="launch-enter" onClick={() => onEnter('today')}>
          进入工作台 <CuteIcon name="soft-arrow-right" />
        </button>
      </section>
    </main>
  )
}

/* ============================================================
   应用主体壳（三栏）
   ============================================================ */
function AppShell({
  page, setPage, theme, setTheme, activePerson, setActivePerson,
  navCollapsed, setNavCollapsed, mood, paused, setPaused, user, onboardDepth, onAuth, onLogout,
}: {
  page: AppPage
  setPage: (p: AppPage) => void
  theme: Theme
  setTheme: (t: Theme) => void
  activePerson: RoomPerson | null
  setActivePerson: (p: RoomPerson | null) => void
  navCollapsed: boolean
  setNavCollapsed: (v: boolean) => void
  mood: PetMood
  paused: boolean
  setPaused: (v: boolean) => void
  user: AuthUser | null
  onboardDepth: number
  onAuth: (m: 'login' | 'register') => void
  onLogout: () => void
}) {
  const inRoomChat = page === 'room' && activePerson
  const headerHint = useInlineHint(2400)


  const selectPage = (key: string) => {
    setPage(key as AppPage)
    setActivePerson(null)
  }

  return (
    <main className={`app-shell ${inRoomChat ? 'wide-center' : ''} ${navCollapsed ? 'nav-collapsed' : ''}`}>
      <div className="doodle-bg" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <span className="blob blob-d" />
      </div>
      <InteractiveBg />

      <button className="back-launch" onClick={() => setPage('launch')} aria-label="返回首页">
        <CuteIcon name="soft-arrow-left" />
        <span>首页</span>
      </button>

      <aside className={`app-nav ${navCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <div className="brand-mark">Pi</div>
          {!navCollapsed && (
            <div>
              <strong>EvoPi</strong>
              <span>自进化个人助理</span>
            </div>
          )}
          <button
            className="nav-collapse-btn"
            onClick={() => setNavCollapsed(!navCollapsed)}
            aria-label={navCollapsed ? '展开控制台' : '收起控制台'}
            title={navCollapsed ? '展开控制台' : '收起控制台'}
          >
            <CuteIcon name={navCollapsed ? 'soft-arrow-right' : 'soft-arrow-left'} />
          </button>
        </div>

        <GroupedNav active={page} collapsed={navCollapsed} onSelect={selectPage} />

        {!navCollapsed && (
          <section className="nav-note">
            <CuteIcon name="soft-shield-check" />
            <div>
              <strong>安全边界已开启</strong>
              <p>采集、整理、发布前都经权限与脱敏检查。</p>
            </div>
          </section>
        )}

        {/* 登录态入口（控制台底部） */}
        <section className={`nav-auth ${navCollapsed ? 'nav-auth-collapsed' : ''}`}>
          {user ? (
            <>
              <span className="auth-user-tag" title={user.name}>
                <CuteIcon name="soft-role-users" />
                {!navCollapsed && user.name}
              </span>
              {!navCollapsed && <button className="ghost-btn sm" onClick={onLogout}>退出</button>}
              {navCollapsed && (
                <button className="nav-auth-icon-only" onClick={onLogout} title="退出" aria-label="退出">
                  <CuteIcon name="soft-arrow-left" />
                </button>
              )}
            </>
          ) : (
            <>
              {navCollapsed ? (
                <>
                  <button className="nav-auth-icon-only" onClick={() => onAuth('login')} title="登录" aria-label="登录">
                    <CuteIcon name="soft-role-users" />
                  </button>
                  <button className="nav-auth-icon-only primary" onClick={() => onAuth('register')} title="注册" aria-label="注册">
                    <CuteIcon name="soft-user-add" />
                  </button>
                </>
              ) : (
                <>
                  <button className="ghost-btn sm" onClick={() => onAuth('login')}>登录</button>
                  <button className="primary-btn sm" onClick={() => onAuth('register')}>注册</button>
                </>
              )}
            </>
          )}
        </section>
      </aside>

      <section className="page-area">
        {!inRoomChat && (
          <header className="page-header">
            <div className="page-head-main">
              <CuteIcon name={pageIcon(page)} className="page-head-icon" />
              <div>
                <h1>{pageMeta[page]?.title ?? pageLabelMap[page]}</h1>
                {pageMeta[page]?.desc && <p className="page-head-desc">{pageMeta[page].desc}</p>}
              </div>
            </div>
            <div className="header-actions">
              <button className="round-action" aria-label="搜索" onClick={() => headerHint.show('全局搜索准备中')}><CuteIcon name="soft-search-spark" /></button>
              <button className="soft-button" onClick={() => headerHint.show('日程与提醒即将上线')}><CuteIcon name="soft-calendar-reminder" />提醒事项</button>
              {headerHint.hint && (
                <div className="inline-hint header-hint"><CuteIcon name="soft-search-spark" />{headerHint.hint}</div>
              )}
            </div>
          </header>
        )}

        {page === 'today' && <TodayPage goRoom={() => { setPage('room') }} />}
        {page === 'goals' && <GoalsPage />}
        {page === 'memory' && <MemoryPage />}
        {page === 'room' && (
          <RoomPage activePerson={activePerson} setActivePerson={setActivePerson} />
        )}
        {page === 'skills' && <SkillsPage />}
        {page === 'evolution' && <EvolutionPage />}
        {page === 'privacy' && <PrivacyPage initialLevel={onboardDepth} />}
      </section>

      {!inRoomChat && (
        <aside className="state-rail">
          <PiCorePanel mood={mood} paused={paused} onTogglePause={() => setPaused(!paused)} />
        </aside>
      )}

      <ThemeSwitcher theme={theme} setTheme={setTheme} />
    </main>
  )
}

// 页面 key → header 图标
function pageIcon(page: string): CuteIconName {
  const map: Record<string, CuteIconName> = {
    today: 'soft-dashboard-tiles',
    goals: 'soft-goal-flag',
    memory: 'soft-database-stack',
    room: 'soft-chat-bubble',
    skills: 'soft-settings-gear',
    evolution: 'soft-log-lines',
    privacy: 'soft-privacy-eye',
  }
  return map[page] ?? 'soft-sparkle-twinkle'
}

/* ============================================================
   今日工作台（Notion 风精简）
   ============================================================ */

// 可轮换的「今日聚焦」候选（本地 mock，点「换一件」切换）
const todayFocusOptions: string[] = [
  todayFocus.next,
  '整理本周三次会议的关键结论，写进目标舱',
  '把上周的职业方向对话沉淀成一条可复用记忆',
  '为「内容创作」目标补一版本周推进计划',
]

function TodayPage({ goRoom }: { goRoom: () => void }) {
  const [text, setText] = useState('')
  const [focusIdx, setFocusIdx] = useState(0)
  const [externalConnections, setExternalConnections] = useState<ExternalAgentConnection[]>([])
  const [developerEnvironment, setDeveloperEnvironment] = useState<DeveloperEnvironmentConnection | null>(null)
  const [externalBootState, setExternalBootState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [externalBootMessage, setExternalBootMessage] = useState('')

  // 开始推进：loading → 已推进（停留）+ 就近提示
  const push = useActionState({ ttl: 2200 })
  const pushHint = useInlineHint(2600)
  // 换一件：loading → 切换文案
  const swap = useActionState()
  // 发送：loading → 清空 + 提示
  const send = useActionState()
  const sendHint = useInlineHint(2600)
  // 语音：仅就近提示
  const voiceHint = useInlineHint(2200)

  const bootExternalAgents = async (force = false) => {
    setExternalBootState('loading')
    setExternalBootMessage('')
    try {
      const [runtimeResult, developerResult] = await Promise.all([
        bootstrapExternalAgents({ force }),
        bootstrapEvoMapDeveloperEnvironment({ force }),
      ])
      setExternalConnections(runtimeResult.connections)
      setDeveloperEnvironment(developerResult.environment)
      setExternalBootState('ready')
      setExternalBootMessage(runtimeResult.imported || developerResult.imported ? '已同步本机开发环境' : '已读取开发环境快照')
    } catch (error) {
      setExternalBootState('error')
      setExternalBootMessage(formatApiError(error))
    }
  }

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      Promise.all([
        bootstrapExternalAgents({ force: false }),
        bootstrapEvoMapDeveloperEnvironment({ force: false }),
      ])
        .then(([runtimeResult, developerResult]) => {
          if (cancelled) return
          setExternalConnections(runtimeResult.connections)
          setDeveloperEnvironment(developerResult.environment)
          setExternalBootState('ready')
          setExternalBootMessage(runtimeResult.imported || developerResult.imported ? '已同步本机开发环境' : '已读取开发环境快照')
        })
        .catch((error) => {
          if (cancelled) return
          setExternalBootState('error')
          setExternalBootMessage(formatApiError(error))
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const onPush = () =>
    push.run(() => pushHint.show('EvoPi 已记下这次推进，相关进展会同步到目标舱'), { duration: 700 })

  const onSwap = () =>
    swap.run(() => setFocusIdx((i) => (i + 1) % todayFocusOptions.length), { duration: 500 })

  const onSend = () => {
    if (!text.trim()) return
    send.run(
      () => {
        setText('')
        sendHint.show('已记下，EvoPi 会按这个方向准备')
      },
      { duration: 600 },
    )
  }

  return (
    <div className="today-narrow">
      <article className="focus-hero">
        <div className="focus-label">
          <CuteIcon name="soft-target-bullseye" />
          <span>今日聚焦</span>
          <em className="tag">{todayFocus.deadline}</em>
        </div>
        <h2>{todayFocusOptions[focusIdx]}</h2>
        <div className="focus-actions">
          <button
            className={`primary-btn ${statusCls(push.status)}`}
            onClick={onPush}
            disabled={push.status === 'loading'}
          >
            {push.status === 'loading'
              ? <><span className="btn-spinner" />推进中…</>
              : push.status === 'done'
                ? <><span className="btn-done-check">✓</span>已推进</>
                : <><CuteIcon name="soft-sparkle-edit" />开始推进</>}
          </button>
          <button
            className={`ghost-btn ${swap.status === 'loading' ? 'btn-loading' : ''}`}
            onClick={onSwap}
            disabled={swap.status === 'loading'}
          >
            {swap.status === 'loading' ? <span className="btn-spinner" /> : <CuteIcon name="soft-arrow-right" />}
            换一件
          </button>
        </div>
        {pushHint.hint && (
          <div className="inline-hint"><CuteIcon name="soft-success-check" />{pushHint.hint}</div>
        )}
      </article>

      <div className="today-compose">
        <CuteIcon name="soft-sparkle-twinkle" />
        <input
          placeholder="或者告诉 EvoPi 你现在想做什么……"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend() }}
        />
        <button
          className={`mini-action ${voiceHint.hint ? 'btn-loading' : ''}`}
          aria-label="语音"
          onClick={() => voiceHint.show('语音输入即将上线')}
        >
          <CuteIcon name="soft-microphone-voice" />
        </button>
        <button
          className={`send-button ${statusCls(send.status)}`}
          aria-label="发送"
          onClick={onSend}
          disabled={send.status === 'loading' || !text.trim()}
        >
          {send.status === 'loading' ? <span className="btn-spinner" /> : <CuteIcon name="soft-send-plane" />}
        </button>
      </div>
      {voiceHint.hint && (
        <div className="inline-hint"><CuteIcon name="soft-microphone-voice" />{voiceHint.hint}</div>
      )}
      {sendHint.hint && (
        <div className="inline-hint"><CuteIcon name="soft-success-check" />{sendHint.hint}</div>
      )}

      <section className="startup-env-panel">
        <div className="startup-env-head">
          <div>
            <span className="tag blue">开发环境</span>
            <strong>OpenClaw / Hermes / Pi / EvoMap Developers 启动接入</strong>
            <small>{externalBootState === 'loading' ? '正在读取本机配置、Skill 与开发框架快照…' : externalBootMessage}</small>
          </div>
          <button className="ghost-btn sm" onClick={() => void bootExternalAgents(true)} disabled={externalBootState === 'loading'}>
            <CuteIcon name="soft-refresh-loop" />重新同步
          </button>
        </div>
        <div className="startup-env-grid">
          {(['pi', 'openclaw', 'hermes'] as ExternalAgentKind[]).map((kind) => {
            const connection = externalConnections.find((item) => item.kind === kind)
            const ready = connection?.status === 'imported' || connection?.status === 'detected'
            const chips = externalCapabilityChips(connection)
            return (
              <article className={`startup-env-card ${ready ? 'ready' : 'missing'}`} key={kind}>
                <CuteIcon name={externalAgentIcon(kind)} />
                <div>
                  <strong>{externalAgentLabel(kind)}</strong>
                  <span>{ready ? `${connection?.skills.length ?? 0} skills` : '等待导入或配置路径'}</span>
                  {chips.length > 0 && (
                    <div className="startup-env-chips">
                      {chips.slice(0, 3).map((chip) => <em key={chip}>{chip}</em>)}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
          <article className={`startup-env-card ${developerEnvironment && developerEnvironment.status !== 'missing' ? 'ready' : 'missing'}`}>
            <CuteIcon name="soft-folder-tab" />
            <div>
              <strong>EvoMap Developers</strong>
              <span>{developerEnvironment?.connected ? 'OAuth 已授权' : developerEnvironment?.configured ? '框架已接入，待授权' : '等待配置开发框架'}</span>
              {developerCapabilityChips(developerEnvironment).length > 0 && (
                <div className="startup-env-chips">
                  {developerCapabilityChips(developerEnvironment).slice(0, 3).map((chip) => <em key={chip}>{chip}</em>)}
                </div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="recent-section">
        <div className="section-title">
          <CuteIcon name="soft-database-stack" />
          <strong>最近为你整理的</strong>
          <span>3 条 · 全部已自动归档</span>
        </div>
        <div className="recent-list">
          {recentMemories.map((m) => (
            <button className="recent-row" key={m.title}>
              <span className={`recent-dot ${m.tone}`} />
              <div className="recent-body">
                <strong>{m.title}</strong>
                <span>{m.meta}</span>
              </div>
              <span className="recent-time">{m.time}</span>
            </button>
          ))}
        </div>
      </section>

      <button className="pending-banner" onClick={goRoom}>
        <CuteIcon name="soft-warning-triangle" />
        <span>有 <strong>3 项</strong> 内容等你确认（会议结论、录音、私人片段）</span>
        <CuteIcon name="soft-arrow-right" />
      </button>
    </div>
  )
}

// 把 ActionStatus 映射成按钮 className
function statusCls(s: ActionStatus): string {
  if (s === 'loading') return 'btn-loading'
  if (s === 'done') return 'btn-done'
  return ''
}

/* ============================================================
   目标舱
   - 每个目标是一个会进化的专属工作舱
   - 卡片含：详细状态文案 / 宠物生长值 / 里程碑节奏
   - 「打开工作舱」是后台触发节点：点开后调出专属工作窗口（思维导图/教案/访谈…）
   ============================================================ */
function GoalsPage() {
  const [openWs, setOpenWs] = useState<string | null>(null)
  const [savedSnippets, setSavedSnippets] = useState<Record<string, GoalSnippet[]>>({})

  const addGoalSkill = (goalName: string, snippet: GoalSnippet) => {
    setSavedSnippets((prev) => ({
      ...prev,
      [goalName]: [snippet, ...(prev[goalName] ?? [])],
    }))
  }

  return (
    <div className="goals-page">
      <div className="content-grid">
        {goals.map((g) => {
          const active = openWs === g.name
          const snippets = [...(savedSnippets[g.name] ?? []), ...(goalSnippets[g.name] ?? [])]

          return (
          <article className={`goal-card ${active ? 'goal-card-open' : ''}`} key={g.name}>
            <div className="goal-card-head">
              <CuteIcon name={g.icon} />
              <div>
                <h2>{g.name}</h2>
                <span className="goal-status">{g.status}</span>
              </div>
            </div>

            <div className="progress-line"><span style={{ width: `${g.progress}%` }} /></div>
            <div className="goal-progress-cap">
              <span>进度 {g.progress}%</span>
              <span>下一步：{g.next}</span>
            </div>

            <div className="goal-meta-row">
              <div><span>当前里程碑</span><strong>{g.milestone}</strong></div>
              <div><span>复盘节奏</span><strong>{g.review}</strong></div>
              <div><span>关联记忆</span><strong>{g.memory}</strong></div>
            </div>

            {/* 宠物生长值（替代原"关联技能"） */}
            <div className="goal-growth">
              <div className="goal-growth-head">
                <CuteIcon name="soft-heart-favorite" />
                <strong>Pi 伙伴 · Lv.{g.growthLevel}</strong>
                <span>{g.growthLabel}</span>
              </div>
              <div className="growth-bar"><span style={{ width: `${Math.min(100, (g.growthXp % 150) / 1.5)}%` }} /></div>
              <span className="growth-xp">{g.growthXp} XP</span>
            </div>

            <footer className="goal-related">
              {g.related.map((r) => <span className="tag" key={r}>{r}</span>)}
            </footer>

            {/* 工作窗口触发节点：开启专属工作任务 */}
            <button
              className={`workspace-trigger ${active ? 'active' : ''}`}
              onClick={() => setOpenWs(active ? null : g.name)}
            >
              <CuteIcon name={g.workspace.icon} />
              <div className="workspace-trigger-body">
                <strong>{g.workspace.title}</strong>
                <span>{g.workspace.hint}</span>
              </div>
              <span className="workspace-open-label">
                {active ? '收起' : '打开'}{g.workspace.type}
              </span>
              <CuteIcon name="soft-arrow-right" className="ws-chev" />
            </button>

            {active && (
              <GoalWorkspace goal={g} snippets={snippets} onConfirmSkill={(snippet) => addGoalSkill(g.name, snippet)} />
            )}
          </article>
          )
        })}
      </div>
    </div>
  )
}

/* —— 目标专属工作窗口：补一版小票 + 大对话 + 模板库联动 —— */
function GoalWorkspace({
  goal,
  snippets,
  onConfirmSkill,
}: {
  goal: Goal
  snippets: GoalSnippet[]
  onConfirmSkill: (snippet: GoalSnippet) => void
}) {
  const receipt = useMemo(() => receiptTemplates[goal.name] ?? [], [goal.name])
  const doneTotal = receipt.filter((task) => task.done).length
  const [receiptRun, setReceiptRun] = useState(0)
  const [receiptStarted, setReceiptStarted] = useState(false)
  const [visibleDone, setVisibleDone] = useState(0)
  const [announcedRun, setAnnouncedRun] = useState(0)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      from: 'them',
      text: `我已进入「${goal.name}」工作舱。可以先补一版，也可以直接在这里继续聊「${goal.workspace.title}」。`,
      time: goal.workspace.lastOpen,
    },
  ])
  const [input, setInput] = useState('')
  const [draftSnippets, setDraftSnippets] = useState<GoalSnippet[]>([])
  const [contextCache, setContextCache] = useState<string[]>([])
  const [skillSaved, setSkillSaved] = useState(false)
  const [snippetFilter, setSnippetFilter] = useState<GoalSnippetFilter>('all')
  const [evomapQuery, setEvomapQuery] = useState(`${goal.name} ${goal.workspace.title}`)
  const [evomapRecipes, setEvomapRecipes] = useState<EvoMapRecipe[]>([])
  const [evomapStatus, setEvomapStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [evomapError, setEvomapError] = useState('')
  const [receiptRunRecordId, setReceiptRunRecordId] = useState<string | null>(null)
  const [referencedEvoMapIds, setReferencedEvoMapIds] = useState<string[]>([])
  const [reuseByRecipeId, setReuseByRecipeId] = useState<Record<string, EvoMapReuseResponse>>({})
  const [reuseLoadingId, setReuseLoadingId] = useState<string | null>(null)
  const [savedSkill, setSavedSkill] = useState<Skill | null>(null)
  const [skillSyncState, setSkillSyncState] = useState<'idle' | 'saving' | 'drafting' | 'publishing' | 'reuse' | 'refreshing' | 'error'>('idle')
  const [externalKind, setExternalKind] = useState<WorkspaceRuntimeKind>('pi')
  const [externalExportKind, setExternalExportKind] = useState<ExternalAgentKind>('pi')
  const [externalSkills, setExternalSkills] = useState<ExternalAgentSkill[]>([])
  const [selectedExternalSkillId, setSelectedExternalSkillId] = useState('')
  const [externalPrompt, setExternalPrompt] = useState(`围绕「${goal.name}」补一版：${goal.workspace.title}`)
  const [externalOpenClawModel, setExternalOpenClawModel] = useState('')
  const [externalState, setExternalState] = useState<'idle' | 'calling' | 'error'>('idle')
  const [openClawSyncState, setOpenClawSyncState] = useState<'idle' | 'previewing' | 'applying' | 'error'>('idle')
  const scrollRef = useRef<HTMLDivElement>(null)
  const snippetFilters: Array<{ key: GoalSnippetFilter; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'template', label: '模板' },
    { key: 'memory', label: '记忆' },
    { key: 'style', label: '风格' },
  ]
  const filteredSnippets = useMemo(
    () => snippetFilter === 'all'
      ? snippets
      : snippets.filter((snippet) => snippet.kind === snippetFilter),
    [snippetFilter, snippets],
  )
  const snippetCount = (filter: GoalSnippetFilter) => (
    filter === 'all'
      ? snippets.length
      : snippets.filter((snippet) => snippet.kind === filter).length
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    listExternalSkills()
      .then((result) => setExternalSkills(result.skills))
      .catch(() => setExternalSkills([]))
  }, [])

  const callableExternalSkills = isExternalAgentKind(externalKind)
    ? externalSkills.filter((skill) => skill.kind === externalKind)
    : []
  const effectiveSelectedExternalSkillId = callableExternalSkills.some((skill) => skill.id === selectedExternalSkillId)
    ? selectedExternalSkillId
    : ''

  useEffect(() => {
    const query = `${goal.name} ${goal.workspace.title}`
    setEvomapQuery(query)
    setExternalPrompt(`围绕「${goal.name}」补一版：${goal.workspace.title}`)
    void runEvoMapSearch(query)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.name, goal.workspace.title])

  useEffect(() => {
    if (receiptRun === 0 || visibleDone >= doneTotal) return
    const timer = window.setTimeout(() => {
      setVisibleDone((count) => Math.min(doneTotal, count + 1))
    }, 420)
    return () => window.clearTimeout(timer)
  }, [receiptRun, visibleDone, doneTotal])

  useEffect(() => {
    if (!receiptStarted || receiptRun === 0 || visibleDone !== doneTotal || announcedRun === receiptRun) return
    const finished = receipt.filter((task) => task.done).map((task) => task.title)
    const timer = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          from: 'them',
          text: `我已完成小票里 ${doneTotal} 项可自动处理内容。未点亮的部分需要你确认或补充，我先把可用结果放到对话里。`,
          time: '现在',
          attached: finished.slice(0, 3),
        },
      ])
      setContextCache((cache) => [
        ...cache,
        `补一版完成：${finished.join('；')}`,
      ].slice(-10))
      setAnnouncedRun(receiptRun)
      setSkillSaved(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [announcedRun, doneTotal, receipt, receiptRun, receiptStarted, visibleDone])

  const runReceipt = () => {
    setReceiptStarted(true)
    setVisibleDone(0)
    setReceiptRun((run) => run + 1)
    setSkillSaved(false)
    setSavedSkill(null)
  }

  const insertSnippet = (snippet: GoalSnippet) => {
    const inserted = `引用「${snippet.title}」：${snippet.preview}`
    setInput((value) => value.trim() ? `${value}\n${inserted}` : inserted)
    setDraftSnippets((selected) => {
      if (selected.some((item) => item.id === snippet.id)) return selected
      return [...selected, snippet]
    })
  }

  const send = () => {
    const text = input.trim()
    if (!text && draftSnippets.length === 0) return
    const attached = draftSnippets.map((snippet) => snippet.title)
    const cacheParts = [
      ...draftSnippets.map((snippet) => `${kindLabel(snippet.kind)}：${snippet.title}｜${snippet.preview}`),
      text,
    ].filter(Boolean)
    setMessages((m) => [
      ...m,
      {
        from: 'me',
        text: text || '先把这些目标上下文放进来。',
        time: '现在',
        attached: attached.length ? attached : undefined,
      },
    ])
    setContextCache((cache) => [...cache, ...cacheParts].slice(-10))
    setInput('')
    setDraftSnippets([])
    setSkillSaved(false)
    setSavedSkill(null)
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `收到。我会按「${goal.name}」的目标记忆和你刚放入的上下文继续收束：先保留可复用规则，再把只属于这次任务的内容留在当前工作舱。`,
          time: '现在',
        },
      ])
    }, 600)
  }

  const runEvoMapSearch = async (query = evomapQuery) => {
    const cleanQuery = query.trim()
    if (!cleanQuery) return
    setEvomapStatus('loading')
    setEvomapError('')
    try {
      const result = await searchEvoMapRecipes(cleanQuery, 6)
      setEvomapRecipes(result.recipes ?? [])
      setEvomapStatus('ready')
    } catch (error) {
      setEvomapRecipes([])
      setEvomapStatus('error')
      setEvomapError(formatApiError(error))
    }
  }

  const connectEvoMap = async () => {
    setEvomapStatus('loading')
    setEvomapError('')
    try {
      const { url } = await getEvoMapConnectUrl()
      window.location.href = url
    } catch (error) {
      setEvomapStatus('error')
      setEvomapError(formatApiError(error))
    }
  }

  const referenceEvoMapRecipe = async (recipe: EvoMapRecipe) => {
    const id = recipeId(recipe)
    if (!id) return
    const title = recipeTitle(recipe)
    const summary = `EvoMap Recipe：${title}｜${recipeDescription(recipe) || '已作为可复用经验引用'}`

    setReferencedEvoMapIds((items) => Array.from(new Set([...items, id])))
    setContextCache((cache) => [...cache, summary].slice(-10))
    setSkillSaved(false)
    setSavedSkill(null)
    setMessages((m) => [
      ...m,
      {
        from: 'them',
        text: `已把 EvoMap recipe「${title}」引用进当前小票流。后续确认成 Skill 时会记录这条外部经验来源。`,
        time: '现在',
        attached: [title],
      },
    ])

    try {
      let runId = receiptRunRecordId
      if (!runId) {
        const created = await createReceiptRun({
          goalName: goal.name,
          title: `${goal.workspace.title} · EvoMap 引用`,
          evomapSearchQuery: evomapQuery,
          referencedEvoMapIds: [id],
        })
        runId = created.run.id
        setReceiptRunRecordId(runId)
      }
      await attachEvoMapReference(runId, { evomapId: id, source: 'recipe', title })
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `引用已进入当前对话缓存，但写入后端小票流失败：${formatApiError(error)}`,
          time: '现在',
        },
      ])
    }
  }

  const inspectReuseGraph = async (recipe: EvoMapRecipe) => {
    const id = recipeId(recipe)
    if (!id) return
    setReuseLoadingId(id)
    try {
      const graph = await queryEvoMapReuse({ recipeId: id, limit: 4 })
      setReuseByRecipeId((current) => ({ ...current, [id]: graph }))
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `已读取 EvoMap reuse graph：${recipeTitle(recipe)}。关联结果会写入进化事件流。`,
          time: '现在',
          attached: [recipeTitle(recipe)],
        },
      ])
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `读取 reuse graph 失败：${formatApiError(error)}`,
          time: '现在',
        },
      ])
    } finally {
      setReuseLoadingId(null)
    }
  }

  const runExternalAgent = async () => {
    const prompt = externalPrompt.trim() || input.trim()
    if (!prompt) return
    const runtimeLabel = workspaceRuntimeLabel(externalKind)
    const selectedSkill = callableExternalSkills.find((skill) => skill.id === effectiveSelectedExternalSkillId)
    const targetLabel = selectedSkill ? `${runtimeLabel} / ${selectedSkill.title ?? selectedSkill.name}` : runtimeLabel
    setExternalState('calling')
    setMessages((m) => [
      ...m,
      {
        from: 'me',
        text: `调用 ${targetLabel}：${prompt}`,
        time: '现在',
      },
    ])
    try {
      if (externalKind === 'evomap-developers') {
        const workflow = await runEvoMapDeveloperWorkflow({
          workflowId: 'recipe-search',
          query: prompt,
          limit: 6,
        })
        const output = formatDeveloperWorkflowSummary(workflow.result, workflow.operation)
        const cacheLine = `${targetLabel} 工作流结果：${output.slice(0, 500)}`
        setContextCache((cache) => [...cache, cacheLine].slice(-10))
        setSkillSaved(false)
        setSavedSkill(null)
        setInput('')
        setMessages((m) => [
          ...m,
          {
            from: 'them',
            text: output || 'EvoMap Developers workflow 已返回，但没有可展示文本。',
            time: '现在',
            attached: [`${runtimeLabel}: recipe-search`],
          },
        ])
        setReceiptRunRecordId(workflow.run.id)
        setExternalState('idle')
        return
      }
      const sessionKey = `evopi:${goal.name}:${goal.workspace.title}`
      const agentRun = await runExternalAgentWithReceipt({
        kind: externalKind,
        goalName: goal.name,
        workspaceTitle: goal.workspace.title,
        message: prompt,
        agent: externalKind === 'pi' ? selectedSkill?.name : undefined,
        skillName: externalKind === 'pi' ? undefined : selectedSkill?.name,
        model: externalKind === 'openclaw' ? externalOpenClawModel.trim() || undefined : undefined,
        sessionKey,
        evomapSearchQuery: evomapQuery,
        referencedEvoMapIds,
        timeoutSec: 120,
      })
      const operation = agentRun.operation as ExternalAgentOperation
      const output = formatExternalCallSummary(agentRun.result, operation)
      const cacheLine = `${targetLabel} 调用结果：${output.slice(0, 500)}`
      setContextCache((cache) => [...cache, cacheLine].slice(-10))
      setSkillSaved(false)
      setSavedSkill(null)
      setInput('')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: output || `${targetLabel} 已返回，但没有可展示文本。`,
          time: '现在',
          attached: selectedSkill ? [`${runtimeLabel} skill: ${selectedSkill.name}`] : [`${runtimeLabel} agent run`],
        },
      ])
      setReceiptRunRecordId(agentRun.run.id)
      setExternalState('idle')
    } catch (error) {
      setExternalState('error')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `${targetLabel} 调用失败：${formatApiError(error)}`,
          time: '现在',
        },
      ])
    }
  }

  const confirmSkill = async () => {
    if (contextCache.length === 0) return
    setSkillSyncState('saving')
    try {
      const skillInput = {
        goalName: goal.name,
        name: `Skill：${goal.workspace.title}协作规则`,
        description: contextCache.slice(-4).join('；').slice(0, 240),
        trigger: `进入「${goal.name}」目标舱处理「${goal.workspace.title}」类似任务时`,
        contextCache,
        referencedEvoMapIds,
        privacyPolicy: 'summary_only' as const,
      }
      const { skill } = receiptRunRecordId
        ? await createSkillFromReceiptRun(receiptRunRecordId, skillInput)
        : await createSkill(skillInput)
      const nextSnippet: GoalSnippet = {
        id: skill.id,
        title: skill.name,
        kind: 'template',
        preview: skill.description.slice(0, 88),
      }
      onConfirmSkill(nextSnippet)
      setContextCache([])
      setSavedSkill(skill)
      setSkillSaved(true)
      setSkillSyncState('idle')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `已确认成本地 Skill「${skill.name}」，并写入后端。现在可以继续创建 EvoMap draft，或在 test mode 下发布验证。`,
          time: '现在',
          attached: [skill.name],
        },
      ])
    } catch (error) {
      setSkillSyncState('error')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `确认成 Skill 失败：${formatApiError(error)}`,
          time: '现在',
        },
      ])
    }
  }

  const syncDraft = async () => {
    if (!savedSkill) return
    setSkillSyncState('drafting')
    try {
      const { skill } = await createEvoMapDraft(savedSkill.id)
      setSavedSkill(skill)
      setSkillSyncState('idle')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `已创建 EvoMap recipe draft：${skill.recipeLink?.evomapRecipeId ?? skill.name}。`,
          time: '现在',
          attached: [skill.name],
        },
      ])
    } catch (error) {
      setSkillSyncState('error')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `创建 EvoMap draft 失败：${formatApiError(error)}`,
          time: '现在',
        },
      ])
    }
  }

  const testPublish = async () => {
    if (!savedSkill) return
    setSkillSyncState('publishing')
    try {
      const { skill } = await testPublishEvoMapRecipe(savedSkill.id)
      setSavedSkill(skill)
      setSkillSyncState('idle')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `EvoMap test publish 已完成：${skill.recipeLink?.evomapRecipeId ?? skill.name}。我继续同步 reuse graph，让进化日志补上价值网络。`,
          time: '现在',
          attached: [skill.name],
        },
      ])
      await syncPublishedReuse(skill, { silentStart: true })
    } catch (error) {
      setSkillSyncState('error')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `EvoMap test publish 失败：${formatApiError(error)}`,
          time: '现在',
        },
      ])
    }
  }

  const syncPublishedReuse = async (skillOverride?: Skill, options: { silentStart?: boolean } = {}) => {
    const skill = skillOverride ?? savedSkill
    if (!skill?.recipeLink?.evomapRecipeId) return
    if (!options.silentStart) setSkillSyncState('reuse')
    try {
      const result = await syncSkillEvoMapReuse(skill.id, 8)
      setSavedSkill(result.skill)
      setSkillSyncState('idle')
      const graph = result.skill.recipeLink?.reuseGraph
      const graphCount = (graph?.relatedRecipeCount ?? 0) + (graph?.reusedInRecipeCount ?? 0)
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `Reuse Graph 已同步：${result.skill.recipeLink?.evomapRecipeId}，发现 ${graphCount} 条关联/复用记录。EvolutionEvent 已补上 Reuse Graph 阶段。`,
          time: '现在',
          attached: [result.skill.name],
        },
      ])
    } catch (error) {
      setSkillSyncState('idle')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `Reuse Graph 暂未同步成功：${formatApiError(error)}。发布状态已保留，你可以稍后重试图谱同步。`,
          time: '现在',
        },
      ])
    }
  }

  const refreshSavedSkill = async () => {
    if (!savedSkill) return
    setSkillSyncState('refreshing')
    try {
      const result = await getSkill(savedSkill.id)
      setSavedSkill(result.skill)
      setSkillSyncState('idle')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `已刷新 EvoMap 回流状态：${result.skill.recipeLink?.webhook ? '收到 webhook 回执' : result.skill.recipeLink ? '等待 webhook 回执' : '尚未创建 recipe'}。`,
          time: '现在',
          attached: [result.skill.name],
        },
      ])
    } catch (error) {
      setSkillSyncState('error')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `刷新 Skill 状态失败：${formatApiError(error)}`,
          time: '现在',
        },
      ])
    }
  }

  const previewExternalSkill = async (apply = false) => {
    if (!savedSkill) return
    setOpenClawSyncState(apply ? 'applying' : 'previewing')
    const label = externalAgentLabel(externalExportKind)
    try {
      const { result } = await exportSkillToExternalAgent(savedSkill.id, { kind: externalExportKind, apply })
      setOpenClawSyncState('idle')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: apply
            ? `已写入 ${label} Skill：${result.skillPath}`
            : `已生成 ${label} SKILL.md 预览：${result.skillPath}\n\n${result.content.slice(0, 520)}`,
          time: '现在',
          attached: [result.slug],
        },
      ])
    } catch (error) {
      setOpenClawSyncState('error')
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: `同步 ${label} 失败：${formatApiError(error)}`,
          time: '现在',
        },
      ])
    }
  }

  const receiptProgress = receipt.length ? Math.round((visibleDone / receipt.length) * 100) : 0

  return (
    <div className="workspace-surface ws-workspace">
      <div className="workspace-surface-head">
        <CuteIcon name={goal.workspace.icon} />
        <div>
          <strong>{goal.workspace.title}</strong>
          <span>{goal.workspace.type} · 上次进入 {goal.workspace.lastOpen}</span>
        </div>
      </div>

      <section className="ws-receipt-panel">
        <div className="ws-receipt-copy">
          <span className="tag mint">主入口</span>
          <h3>让 EvoPi 补一版</h3>
          <p>自动调取当前目标的素材、记忆和模板，完成可先行处理的部分。</p>
        </div>
        <div className="ws-receipt-actions">
          <button className="primary-btn" onClick={runReceipt}>
            <CuteIcon name="soft-idea-bulb" />让 EvoPi 补一版
          </button>
          <span>{receiptStarted ? `${visibleDone} / ${receipt.length} 项` : '等待开始'}</span>
        </div>
        <div className="ws-progress" aria-label="补一版进度">
          <span style={{ width: `${receiptProgress}%` }} />
        </div>
        <div className="ws-receipt">
          {receipt.map((task, index) => {
            const doneOrder = task.done ? receipt.slice(0, index + 1).filter((item) => item.done).length : 0
            const active = receiptStarted && task.done && doneOrder <= visibleDone
            return (
              <div className={`ws-task ${active ? 'done' : task.done ? 'queued' : 'pending'}`} key={task.title}>
                <span>{active ? '✓' : index + 1}</span>
                <strong>{task.title}</strong>
                <em>{active ? '已完成' : task.done ? '排队中' : '待确认'}</em>
              </div>
            )
          })}
        </div>
      </section>

      <section className="ws-evomap-panel">
        <div className="ws-evomap-head">
          <div>
            <span className="tag pink">EvoMap</span>
            <h3>可复用经验</h3>
          </div>
          <div className="ws-evomap-search">
            <input
              value={evomapQuery}
              onChange={(e) => setEvomapQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runEvoMapSearch()
              }}
              placeholder="搜索 EvoMap recipes"
            />
            <button className="primary-btn sm" onClick={() => void runEvoMapSearch()} disabled={evomapStatus === 'loading'}>
              <CuteIcon name="soft-search-spark" />{evomapStatus === 'loading' ? '搜索中' : '搜索'}
            </button>
            <button className="ghost-btn sm" onClick={() => void connectEvoMap()}>
              <CuteIcon name="soft-shield-check" />连接
            </button>
          </div>
        </div>

        {evomapStatus === 'error' && (
          <div className="ws-evomap-error">
            <CuteIcon name="soft-warning-triangle" />
            <span>{evomapError}</span>
          </div>
        )}

        <div className="ws-evomap-results">
          {evomapStatus === 'loading' && (
            <div className="ws-evomap-empty">
              <CuteIcon name="soft-loading-loop" />
              <span>正在读取 EvoMap Developers...</span>
            </div>
          )}
          {evomapStatus === 'ready' && evomapRecipes.length === 0 && (
            <div className="ws-evomap-empty">
              <CuteIcon name="soft-search-spark" />
              <span>这次搜索没有返回 recipe。</span>
            </div>
          )}
          {evomapRecipes.map((recipe) => {
            const id = recipeId(recipe)
            const attached = Boolean(id && referencedEvoMapIds.includes(id))
            const reuseGraph = id ? reuseByRecipeId[id] : undefined
            return (
              <article className="ws-evomap-recipe" key={id ?? recipeTitle(recipe)}>
                <div>
                  <strong>{recipeTitle(recipe)}</strong>
                  <span>{recipeDescription(recipe) || recipeStatus(recipe)}</span>
                </div>
                <div className="ws-evomap-recipe-actions">
                  <em className="tag">{recipe.livemode === false ? 'Test' : recipeStatus(recipe)}</em>
                  <button className="ghost-btn sm" onClick={() => void referenceEvoMapRecipe(recipe)} disabled={!id || attached}>
                    <CuteIcon name="soft-import-data" />{attached ? '已引用' : '引用'}
                  </button>
                  <button className="ghost-btn sm" onClick={() => void inspectReuseGraph(recipe)} disabled={!id || reuseLoadingId === id}>
                    <CuteIcon name="soft-refresh-loop" />{reuseLoadingId === id ? '读取中' : '图谱'}
                  </button>
                </div>
                {reuseGraph && (
                  <div className="ws-evomap-reuse">
                    {(reuseGraph.relatedRecipes ?? reuseGraph.reusedInRecipes ?? []).slice(0, 3).map((item) => (
                      <span className="tag mint" key={recipeId(item) ?? recipeTitle(item)}>{recipeTitle(item)}</span>
                    ))}
                    {(reuseGraph.relatedRecipes ?? reuseGraph.reusedInRecipes ?? []).length === 0 && (
                      <span>暂无关联 recipe。</span>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section className="ws-external-panel">
        <div className="ws-external-copy">
          <span className="tag blue">Runtime</span>
          <h3>调用执行环境</h3>
          <p>可交给 Pi / OpenClaw / Hermes 执行，也可直接走 EvoMap Developers 工作流。</p>
        </div>
        <div className="ws-external-controls">
          <select
            value={externalKind}
            onChange={(e) => {
              setExternalKind(e.target.value as WorkspaceRuntimeKind)
              setSelectedExternalSkillId('')
            }}
          >
            {workspaceRuntimeKinds.map((kind) => (
              <option value={kind} key={kind}>{workspaceRuntimeLabel(kind)}</option>
            ))}
          </select>
          <select
            value={effectiveSelectedExternalSkillId}
            onChange={(e) => setSelectedExternalSkillId(e.target.value)}
            aria-label="选择外部 Skill"
          >
            <option value="">默认能力</option>
            {callableExternalSkills.map((skill) => (
              <option value={skill.id} key={skill.id}>{skill.title ?? skill.name}</option>
            ))}
          </select>
          <input
            value={externalPrompt}
            onChange={(e) => setExternalPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runExternalAgent()
            }}
            placeholder="给 Agent runtime 的任务"
          />
          {externalKind === 'openclaw' && (
            <input
              value={externalOpenClawModel}
              onChange={(e) => setExternalOpenClawModel(e.target.value)}
              placeholder="可选模型：custom-nowcoding/gpt-5.4"
            />
          )}
          <button className="primary-btn sm" onClick={() => void runExternalAgent()} disabled={externalState === 'calling'}>
            <CuteIcon name="soft-send-plane" />{externalState === 'calling' ? '调用中' : '调用'}
          </button>
        </div>
        {externalState === 'error' && (
          <div className="ws-evomap-error">
            <CuteIcon name="soft-warning-triangle" />
            <span>Agent runtime 暂时不可用，可先到隐私权限页扫描或导入开发环境。</span>
          </div>
        )}
      </section>

      <div className="room-chat-shell ws-room-shell">
        <header className="chat-header">
          <div className="chat-person">
            <div className="person-avatar sm"><CuteIcon name="soft-sparkle-twinkle" /></div>
            <div>
              <strong>{goal.name} · 大对话</strong>
              <span>缓存 {contextCache.length} 条 · 模板库 {snippets.length} 条</span>
            </div>
          </div>
          <div className="ws-skill-actions">
            <button
              className="ghost-btn sm"
              disabled={contextCache.length === 0 || skillSyncState === 'saving'}
              onClick={() => void confirmSkill()}
            >
              <CuteIcon name="soft-settings-gear" />{skillSyncState === 'saving' ? '沉淀中' : skillSaved ? '已沉淀' : '确认成 Skill'}
            </button>
            {savedSkill && (
              <>
                <button className="ghost-btn sm" disabled={skillSyncState === 'drafting'} onClick={() => void syncDraft()}>
                  <CuteIcon name="soft-document-page" />{savedSkill.status === 'drafted' ? '已建 draft' : '创建 draft'}
                </button>
                <button className="primary-btn sm" disabled={skillSyncState === 'publishing'} onClick={() => void testPublish()}>
                  <CuteIcon name="soft-sparkle-edit" />{savedSkill.status === 'test_published' ? '已测试发布' : 'Test publish'}
                </button>
                {savedSkill.recipeLink && (
                  <button className="ghost-btn sm" disabled={skillSyncState === 'reuse'} onClick={() => void syncPublishedReuse()}>
                    <CuteIcon name="soft-refresh-loop" />
                    {skillSyncState === 'reuse'
                      ? '同步中'
                      : savedSkill.recipeLink.reuseGraph
                        ? `Reuse ${savedSkill.recipeLink.reuseGraph.relatedRecipeCount + savedSkill.recipeLink.reuseGraph.reusedInRecipeCount}`
                        : '同步图谱'}
                  </button>
                )}
                <select className="ws-skill-export-select" value={externalExportKind} onChange={(e) => setExternalExportKind(e.target.value as ExternalAgentKind)}>
                  {externalAgentKinds.map((kind) => (
                    <option value={kind} key={kind}>{externalAgentLabel(kind)}</option>
                  ))}
                </select>
                <button className="ghost-btn sm" disabled={openClawSyncState === 'previewing'} onClick={() => void previewExternalSkill(false)}>
                  <CuteIcon name="soft-document-page" />预览
                </button>
                <button className="ghost-btn sm" disabled={openClawSyncState === 'applying'} onClick={() => void previewExternalSkill(true)}>
                  <CuteIcon name="soft-import-data" />写入
                </button>
              </>
            )}
          </div>
        </header>

        {savedSkill?.recipeLink && (
          <EvoMapSkillStatusPanel
            onRefresh={() => void refreshSavedSkill()}
            refreshing={skillSyncState === 'refreshing'}
            skill={savedSkill}
          />
        )}

        <div className="chat-body with-assets">
          <div className="chat-stream" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div className={`msg ${msg.from}`} key={`${msg.time}-${i}`}>
                {msg.from === 'them' && (
                  <div className="msg-avatar sm"><CuteIcon name="soft-sparkle-twinkle" /></div>
                )}
                <div className="msg-bubble">
                  <p>{msg.text}</p>
                  {msg.attached && (
                    <div className="msg-attached">
                      {msg.attached.map((item) => (
                        <span className="tag" key={item}><CuteIcon name="soft-document-page" />{item}</span>
                      ))}
                    </div>
                  )}
                  <span className="msg-time">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          <aside className="asset-rail ws-snippets">
            <div className="asset-head">
              <CuteIcon name="soft-folder-tab" />
              <strong>目标模板库</strong>
              <span>{goal.name}</span>
            </div>
            <div className="ws-snippet-tabs" aria-label="筛选目标模板库">
              {snippetFilters.map((filter) => (
                <button
                  className={snippetFilter === filter.key ? 'active' : ''}
                  key={filter.key}
                  onClick={() => setSnippetFilter(filter.key)}
                  aria-pressed={snippetFilter === filter.key}
                >
                  <span>{filter.label}</span>
                  <em>{snippetCount(filter.key)}</em>
                </button>
              ))}
            </div>
            <div className="asset-list">
              {filteredSnippets.map((snippet) => {
                const selected = draftSnippets.some((item) => item.id === snippet.id)
                return (
                  <button
                    className={`asset-row ws-snippet ${selected ? 'selected' : ''}`}
                    key={snippet.id}
                    onClick={() => insertSnippet(snippet)}
                  >
                    <CuteIcon name={kindIcon(snippet.kind)} />
                    <div className="asset-meta">
                      <strong>{snippet.title}</strong>
                      <span>{kindLabel(snippet.kind)} · {snippet.preview}</span>
                    </div>
                    <span className="asset-check">{selected ? '✓' : '+'}</span>
                  </button>
                )
              })}
              {filteredSnippets.length === 0 && (
                <p className="ws-snippet-empty">这一类还没有沉淀内容。</p>
              )}
            </div>
            <div className="asset-selected">
              {contextCache.length > 0 ? `待确认缓存 ${contextCache.length} 条` : '对话后可沉淀为 Skill'}
            </div>
          </aside>
        </div>

        <div className="chat-input-bar ws-input-bar">
          {draftSnippets.length > 0 && (
            <div className="input-chips">
              {draftSnippets.map((snippet) => (
                <span
                  className="chip removable"
                  key={snippet.id}
                  onClick={() => setDraftSnippets((items) => items.filter((item) => item.id !== snippet.id))}
                >
                  {snippet.title} ✕
                </span>
              ))}
            </div>
          )}
          <textarea
            placeholder={`和 EvoPi 继续推进「${goal.workspace.title}」……`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
          />
          <button className="send-button" onClick={send} aria-label="发送"><CuteIcon name="soft-send-plane" /></button>
        </div>
      </div>
    </div>
  )
}

function EvoMapSkillStatusPanel({ skill, refreshing, onRefresh }: {
  skill: Skill
  refreshing: boolean
  onRefresh: () => void
}) {
  const link = skill.recipeLink
  if (!link) return null
  const graphCount = (link.reuseGraph?.relatedRecipeCount ?? 0) + (link.reuseGraph?.reusedInRecipeCount ?? 0)
  const webhook = link.webhook
  return (
    <section className="ws-evomap-skill-status" aria-label="EvoMap 回流状态">
      <div className="ws-evomap-status-main">
        <CuteIcon name="soft-shield-check" />
        <div>
          <strong>EvoMap 回流状态</strong>
          <span>{shortIdentifier(link.evomapRecipeId)} · {link.livemode ? 'Live' : 'Test mode'} · {evoMapRecipeLinkStatusLabel(link.status)}</span>
        </div>
      </div>
      <div className="ws-evomap-status-steps">
        <span className="tag mint"><CuteIcon name="soft-document-page" />Recipe {evoMapRecipeLinkStatusLabel(link.status)}</span>
        <span className={link.reuseGraph ? 'tag blue' : 'tag'}><CuteIcon name="soft-refresh-loop" />Reuse {link.reuseGraph ? graphCount : '等待'}</span>
        <span className={webhook ? 'tag mint' : 'tag'}><CuteIcon name="soft-log-lines" />Webhook {webhook ? webhook.lastEventType : '等待'}</span>
      </div>
      <div className="ws-evomap-status-meta">
        {link.lastSyncedAt && <span>同步 {formatEvolutionTime(link.lastSyncedAt)}</span>}
        {link.reuseGraph?.lastQueriedAt && <span>图谱 {formatEvolutionTime(link.reuseGraph.lastQueriedAt)}</span>}
        {webhook?.lastReceivedAt && <span>回执 {formatEvolutionTime(webhook.lastReceivedAt)}</span>}
        {webhook?.lastDeliveryId && <span>{shortIdentifier(webhook.lastDeliveryId)}</span>}
      </div>
      <button className="ghost-btn sm" onClick={onRefresh} disabled={refreshing}>
        <CuteIcon name="soft-refresh-loop" />{refreshing ? '刷新中' : '刷新状态'}
      </button>
    </section>
  )
}

function evoMapRecipeLinkStatusLabel(status: NonNullable<Skill['recipeLink']>['status']): string {
  if (status === 'test_published') return 'Test Publish'
  if (status === 'published') return 'Live Publish'
  return 'Draft'
}

type GoalSnippetFilter = 'all' | GoalSnippet['kind']

function kindLabel(kind: GoalSnippet['kind']) {
  if (kind === 'template') return '模板'
  if (kind === 'memory') return '记忆'
  return '风格'
}

function kindIcon(kind: GoalSnippet['kind']): CuteIconName {
  if (kind === 'template') return 'soft-document-page'
  if (kind === 'memory') return 'soft-database-stack'
  return 'soft-sparkle-edit'
}

function recipeId(recipe: EvoMapRecipe): string | undefined {
  return typeof recipe.id === 'string' ? recipe.id : undefined
}

function recipeTitle(recipe: EvoMapRecipe): string {
  return typeof recipe.title === 'string' && recipe.title.trim() ? recipe.title : recipeId(recipe) ?? 'Untitled recipe'
}

function recipeDescription(recipe: EvoMapRecipe): string {
  const value = recipe.description ?? recipe.summary ?? recipe.content
  return typeof value === 'string' ? value.slice(0, 120) : ''
}

function recipeStatus(recipe: EvoMapRecipe): string {
  if (typeof recipe.status === 'string' && recipe.status.trim()) return recipe.status
  return recipe.livemode === false ? 'test' : 'recipe'
}

const externalAgentKinds: ExternalAgentKind[] = ['pi', 'openclaw', 'hermes']
const workspaceRuntimeKinds: WorkspaceRuntimeKind[] = ['pi', 'openclaw', 'hermes', 'evomap-developers']

function isExternalAgentKind(kind: WorkspaceRuntimeKind): kind is ExternalAgentKind {
  return kind === 'pi' || kind === 'openclaw' || kind === 'hermes'
}

function workspaceRuntimeLabel(kind: WorkspaceRuntimeKind): string {
  if (kind === 'evomap-developers') return 'EvoMap Developers'
  return externalAgentLabel(kind)
}

function externalAgentLabel(kind: ExternalAgentKind): string {
  if (kind === 'pi') return 'Pi'
  if (kind === 'openclaw') return 'OpenClaw'
  return 'Hermes'
}

function externalAgentIcon(kind: ExternalAgentKind): CuteIconName {
  if (kind === 'pi') return 'soft-sparkle-twinkle'
  if (kind === 'openclaw') return 'soft-sparkle-edit'
  return 'soft-folder-tab'
}

function geneId(gene: EvoMapGene): string | undefined {
  return typeof gene.id === 'string' ? gene.id : undefined
}

function geneTitle(gene: EvoMapGene): string {
  const value = gene.title ?? gene.name
  if (typeof value === 'string' && value.trim()) return value
  return geneId(gene) ?? geneTypeLabel(gene)
}

function geneDescription(gene: EvoMapGene): string {
  const value = gene.description ?? gene.summary ?? gene.content
  return typeof value === 'string' ? value.slice(0, 120) : ''
}

function geneTypeLabel(gene: EvoMapGene): string {
  return typeof gene.type === 'string' && gene.type.trim() ? gene.type : 'gene'
}

function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'evomap_not_configured') return '后端还没有配置 EVOMAP_CLIENT_ID，填好 evopi-api/.env 后即可连接。'
    if (error.code === 'evomap_not_connected') return '还没有连接 EvoMap。请先完成 OAuth 授权。'
    if (error.code === 'skill_private') return '这个 Skill 标记为 private，不能进入 EvoMap RecipeInput。'
    if (error.code === 'live_publish_requires_confirmation') return '当前是 live client，真实发布需要二次确认。'
    if (error.code === 'openclaw_model_override_unsupported') return '当前安装的 OpenClaw CLI 还不支持单次 --model 调用；可升级 OpenClaw，或在 OpenClaw 里确认后执行 models set 修改默认模型。'
    return error.message
  }
  if (error instanceof Error) return error.message
  return '未知错误'
}

function externalAgentOutput(result: { stdout: string; stderr: string; json?: unknown }): string {
  const record = result.json && typeof result.json === 'object' && !Array.isArray(result.json)
    ? result.json as Record<string, unknown>
    : undefined
  const payloads = Array.isArray(record?.payloads) ? record.payloads : []
  const firstPayload = payloads
    .map((item) => item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : undefined)
    .find((item) => typeof item?.text === 'string' && item.text.trim())
  const candidates = [
    firstPayload?.text,
    record?.text,
    record?.message,
    record?.reply,
    record?.output,
    record?.result,
    result.stdout,
    result.stderr,
  ]
  const text = candidates.find((item) => typeof item === 'string' && item.trim())
  if (typeof text === 'string') return text.trim().slice(0, 1600)
  if (result.json) return JSON.stringify(result.json, null, 2).slice(0, 1600)
  return ''
}

function formatExternalCallSummary(result: ExternalAgentCallResult, operation: ExternalAgentOperation): string {
  const lines = [
    `状态：${operation.status}`,
    operation.runtimeReason ? `原因：${operation.runtimeReason}` : '',
    operation.provider || operation.model ? `模型：${[operation.provider, operation.model].filter(Boolean).join(' / ')}` : '',
    operation.modelOverride ? `指定模型：${operation.modelOverride}` : '',
    operation.skillName ? `Skill：${operation.skillName}` : '',
    operation.outputPreview ? `输出：${operation.outputPreview}` : '',
    !operation.outputPreview ? externalAgentOutput(result) : '',
    operation.stderrPreview && operation.status !== 'completed' ? `stderr：${operation.stderrPreview}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}

function formatDeveloperWorkflowSummary(
  result: EvoMapRecipeSearchResponse | EvoMapGenesResponse | EvoMapReuseResponse | EvoMapQuickstartTestResponse,
  operation: DeveloperWorkflowOperation,
): string {
  const lines = [
    `状态：${operation.status}`,
    `工作流：${operation.workflowId}`,
    `模式：${operation.mode}`,
    operation.durationMs !== undefined ? `耗时：${operation.durationMs}ms` : '',
    operation.resultCount !== undefined ? `结果数：${operation.resultCount}` : '',
  ]
  if ('kind' in result && result.kind === 'quickstart-test') {
    lines.push(
      `Quickstart：${result.passed ? '通过' : '失败'}`,
      result.testCount !== undefined ? `测试数：${result.testCount}` : '',
      result.cwd ? `路径：${result.cwd}` : '',
      result.stdoutPreview ? `STDOUT：\n${result.stdoutPreview}` : '',
      result.stderrPreview ? `STDERR：\n${result.stderrPreview}` : '',
    )
    return lines.filter(Boolean).join('\n')
  }
  if ('recipes' in result && Array.isArray(result.recipes)) {
    lines.push(...result.recipes.slice(0, 4).map((recipe) => `- ${recipeTitle(recipe)}`))
  }
  if ('genes' in result && Array.isArray(result.genes)) {
    lines.push(...result.genes.slice(0, 4).map((gene) => `- ${geneTitle(gene)}`))
  }
  const reuse = result as EvoMapReuseResponse
  const reuseRecipes = reuse.relatedRecipes ?? reuse.reusedInRecipes ?? []
  if (reuseRecipes.length) {
    lines.push(...reuseRecipes.slice(0, 4).map((recipe) => `- ${recipeTitle(recipe)}`))
  }
  return lines.filter(Boolean).join('\n')
}

function formatMigrationPreview(preview: HermesMigrationPreview): string {
  const lines = [
    `状态：${preview.available ? '可预览' : '当前命令不可用'}`,
    `命令：${preview.command.join(' ')}`,
    preview.fromPath ? `来源：${preview.fromPath}` : '',
    preview.warning ? `提示：${preview.warning}` : '',
    preview.json ? `JSON：\n${JSON.stringify(preview.json, null, 2)}` : '',
    preview.stdout.trim() && !preview.json ? `STDOUT：\n${preview.stdout.trim()}` : '',
    preview.stderr.trim() ? `STDERR：\n${preview.stderr.trim()}` : '',
  ].filter(Boolean)
  return lines.join('\n\n')
}

function eventIcon(type: string): CuteIconName {
  if (type.includes('agent_run')) return 'soft-sparkle-twinkle'
  if (type.includes('external_')) return 'soft-import-data'
  if (type.includes('connected')) return 'soft-shield-check'
  if (type.includes('searched') || type.includes('queried')) return 'soft-search-spark'
  if (type.includes('receipt')) return 'soft-log-lines'
  if (type.includes('skill')) return 'soft-settings-gear'
  if (type.includes('draft')) return 'soft-document-page'
  if (type.includes('published')) return 'soft-success-check'
  if (type.includes('webhook')) return 'soft-refresh-loop'
  return 'soft-log-lines'
}

/* ============================================================
   记忆库
   ============================================================ */
function MemoryPage() {
  const [cat, setCat] = useState('全部')
  const [query, setQuery] = useState('')
  // 会话内保持的处理结果：按 title 记录（刷新才重置，符合 mock 边界）
  const [handled, setHandled] = useState<Record<string, 'confirmed' | 'merged' | 'ignored'>>({})

  const filtered = memories.filter(
    (m) => (cat === '全部' || m.cat === cat) && m.title.includes(query),
  )

  const handle = (title: string, kind: 'confirmed' | 'merged' | 'ignored') =>
    setHandled((prev) => ({ ...prev, [title]: kind }))

  const handledLabel = (kind: 'confirmed' | 'merged' | 'ignored') =>
    kind === 'confirmed' ? '已确认' : kind === 'merged' ? '已合并' : '已忽略'

  return (
    <div className="library-page">
      <div className="library-search">
        <CuteIcon name="soft-search-spark" />
        <input placeholder="搜索会议、人物、项目、文件或主题……" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="memory-tabs">
        {memoryCategories.map((c) => (
          <button key={c} className={cat === c ? 'tab-btn active' : 'tab-btn'} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="memory-list">
        {filtered.map((m) => {
          const result = handled[m.title]
          const isSensitive = m.state === '敏感'
          return (
            <article className={`memory-item ${result ? 'handled' : ''}`} key={m.title}>
              <CuteIcon name={isSensitive ? 'soft-lock-keyhole' : 'soft-database-stack'} />
              <div>
                <strong>{m.title}</strong>
                <span>来源：{m.source} · {m.time} · {m.cat}记忆</span>
              </div>
              <div className="memory-actions">
                <em className={result ? 'tag mint' : isSensitive ? 'tag warn' : 'tag'}>
                  {result ? handledLabel(result) : m.state}
                </em>
                {!result && (
                  isSensitive ? (
                    <MemoryAction label="设为忽略" onDone={() => handle(m.title, 'ignored')} doneLabel="已忽略" />
                  ) : (
                    <>
                      <MemoryAction label="确认" onDone={() => handle(m.title, 'confirmed')} doneLabel="已确认" />
                      <MemoryAction label="合并" onDone={() => handle(m.title, 'merged')} doneLabel="已合并" />
                    </>
                  )
                )}
              </div>
            </article>
          )
        })}
        {filtered.length === 0 && <p className="empty">没有匹配的记忆。</p>}
      </div>
    </div>
  )
}

// 记忆库行内操作按钮：loading → done（父级接管 done 后状态）
function MemoryAction({
  label, onDone, doneLabel,
}: {
  label: string
  onDone: () => void
  doneLabel: string
}) {
  const act = useActionState()
  const onClick = () => act.run(onDone, { duration: 700 })
  return (
    <button
      className={act.status === 'loading' ? 'btn-loading' : ''}
      disabled={act.status === 'loading'}
      onClick={onClick}
    >
      {act.status === 'loading' ? '处理中…' : act.status === 'done' ? `${doneLabel} ✓` : label}
    </button>
  )
}

/* ============================================================
   PiRoom：大厅 → 对话
   ============================================================ */
function RoomPage({
  activePerson, setActivePerson,
}: {
  activePerson: RoomPerson | null
  setActivePerson: (p: RoomPerson | null) => void
}) {
  if (activePerson) {
    return <RoomChat person={activePerson} onBack={() => setActivePerson(null)} />
  }
  return <RoomLobby setActivePerson={setActivePerson} />
}

function RoomLobby({ setActivePerson }: { setActivePerson: (p: RoomPerson) => void }) {
  const [importing, setImporting] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customBasis, setCustomBasis] = useState('')
  // 进入对话前的短暂 loading（区分被点中的卡片）
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [piPersonas, setPiPersonas] = useState<PiRoomPersona[]>([])
  const [personaState, setPersonaState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setPersonaState('loading')
      listPiRoomPersonas()
        .then(({ personas }) => {
          if (cancelled) return
          setPiPersonas(personas)
          setPersonaState('ready')
        })
        .catch(() => {
          if (!cancelled) setPersonaState('error')
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const roomPeople = useMemo(() => {
    if (!piPersonas.length) return presetPersons
    const piRooms: RoomPerson[] = piPersonas.map(piPersonaToRoomPerson)
    const piRoomIds = new Set(piRooms.map((person) => person.id))
    const otherPresets = presetPersons.filter((person) => person.agentKind !== 'pi' && !piRoomIds.has(person.id))
    return [...piRooms, ...otherPresets]
  }, [piPersonas])

  const enter = (p: RoomPerson) => {
    if (enteringId) return
    setEnteringId(p.id)
    setTimeout(() => {
      setActivePerson(p)
      setEnteringId(null)
    }, 500)
  }

  const create = () => {
    if (!customName.trim() || creating) return
    setCreating(true)
    setTimeout(() => {
      setActivePerson({
        id: 'custom-' + Date.now(),
        name: customName.trim(),
        type: 'custom',
        desc: '自定义导入',
        basis: customBasis.trim() || '用户上传资料',
        avatar: 'soft-role-users',
        online: true,
      })
      setCreating(false)
    }, 600)
  }

  return (
    <div className="library-page">
      <div className="room-hero">
        <div>
          <h2 style={{ fontSize: 26 }}>把你想请教的人请进房间</h2>
          <p style={{ color: 'var(--muted)', marginTop: 6, maxWidth: 520 }}>
            基于公开资料或你上传的资料，生成可对话的「模拟视角」。不是真人本人，每次对话都标注来源。
          </p>
          <div className="room-runtime-status">
            <em className="tag mint">Pi Agent</em>
            <em className="tag">{personaState === 'ready' ? '已连接 Skill 清单' : personaState === 'loading' ? '正在扫描' : personaState === 'error' ? '使用本地卡片' : '待扫描'}</em>
          </div>
        </div>
        <button className="primary-btn" onClick={() => setImporting((v) => !v)}>
          <CuteIcon name="soft-user-add" /> 导入新人物
        </button>
      </div>

      {importing && (
        <div className="import-panel">
          <strong><CuteIcon name="soft-import-data" /> 自定义导入</strong>
          <div className="import-grid">
            <input className="text-input" placeholder="人物名称（如：某领域专家）" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <input className="text-input" placeholder="生成依据（粘贴资料链接或上传文件）" value={customBasis} onChange={(e) => setCustomBasis(e.target.value)} />
          </div>
          <div className="import-actions">
            <button className="ghost-btn" onClick={() => setImporting(false)}>取消</button>
            <button
              className={`primary-btn ${creating ? 'btn-loading' : ''}`}
              disabled={!customName.trim() || creating}
              onClick={create}
            >
              {creating ? <><span className="btn-spinner" />生成中…</> : <><CuteIcon name="soft-add-plus" /> 创建并对话</>}
            </button>
          </div>
        </div>
      )}

      <div className="person-grid">
        {roomPeople.map((p) => (
          <article className="person-card" key={p.id}>
            <div className="person-avatar">
              <CuteIcon name={p.avatar as CuteIconName} />
              {p.online && <span className="online-dot" />}
            </div>
            <div className="person-info">
              <h3>{p.name}</h3>
              <span className="person-desc">{p.desc}</span>
              <span className="person-basis">依据：{p.basis}</span>
              {p.skillName && <span className="person-basis">Skill：{p.skillName}</span>}
            </div>
            <button
              className={`primary-btn sm ${enteringId === p.id ? 'btn-loading' : ''}`}
              disabled={enteringId === p.id}
              onClick={() => enter(p)}
            >
              {enteringId === p.id ? <><span className="btn-spinner" />进入…</> : <><CuteIcon name="soft-chat-bubble" /> 开聊</>}
            </button>
          </article>
        ))}
      </div>

      <div className="room-notice">
        <strong>关于 PiRoom 的边界</strong>
        这里的角色是基于公开资料或你授权内容生成的「模拟视角」，不冒充真人，也不替代真实私人关系。
      </div>
    </div>
  )
}

function piPersonaToRoomPerson(persona: PiRoomPersona): RoomPerson {
  return {
    id: persona.id,
    name: persona.name,
    type: 'preset',
    desc: persona.title,
    basis: `${persona.sourceLabel} · ${persona.available ? 'Pi Skill 已接入' : 'Skill 已内置，等待 Pi runtime'}`,
    avatar: persona.avatar,
    online: persona.available,
    agentKind: 'pi',
    skillName: persona.skillName,
    sourceUrl: persona.sourceUrl,
    sourceLabel: persona.sourceLabel,
    skillPath: persona.skillPath,
  }
}

function RoomChat({ person, onBack }: { person: RoomPerson; onBack: () => void }) {
  const initial: ChatMsg[] = sampleChat[person.id] ?? [
    { from: 'them', text: `你好，我是基于「${person.basis}」生成的${person.name}模拟视角。你想聊什么？`, time: '现在' },
  ]
  const [messages, setMessages] = useState<ChatMsg[]>(initial)
  const [input, setInput] = useState('')
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [showAssets, setShowAssets] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const toggleAsset = (id: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const send = async () => {
    if ((!input.trim() && selectedAssets.size === 0) || sending) return
    const userText = input.trim()
    const attached = assetLibrary.filter((a) => selectedAssets.has(a.id)).map((a) => a.name)
    setMessages((m) => [
      ...m,
      { from: 'me', text: userText || '（附上几份资料）', time: '现在', attached: attached.length ? attached : undefined },
    ])
    setInput('')
    setSelectedAssets(new Set())
    setSending(true)

    if (person.agentKind === 'pi' && person.skillName) {
      try {
        const assetContext = attached.length ? `\n\n本轮附加资料：${attached.join('、')}` : ''
        const { result } = await callExternalAgent({
          kind: person.agentKind as ExternalAgentKind,
          agent: person.skillName,
          sessionKey: `piroom-${person.id}`,
          message: `${userText || '请基于我勾选的资料给出判断。'}${assetContext}`,
          timeoutSec: 180,
        })
        const reply = externalAgentOutput(result) || `我收到了。来源：${person.sourceLabel ?? person.basis}`
        setMessages((m) => [...m, { from: 'them', text: reply, time: '现在' }])
      } catch (error) {
        setMessages((m) => [
          ...m,
          {
            from: 'them',
            text: `这次没有连上 ${person.name} 的 Pi Skill：${formatApiError(error)}\n\n来源：${person.sourceLabel ?? person.basis}`,
            time: '现在',
          },
        ])
      } finally {
        setSending(false)
      }
      return
    }

    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { from: 'them', text: `收到你的资料，我来基于这些看一下。先说我的判断……\n\n来源：${person.basis}`, time: '现在' },
      ])
      setSending(false)
    }, 700)
  }

  return (
    <div className="room-chat-shell">
      <header className="chat-header">
        <button className="ghost-btn sm" onClick={onBack}><CuteIcon name="soft-arrow-left" />返回</button>
        <div className="chat-person">
          <div className="person-avatar sm"><CuteIcon name={person.avatar as CuteIconName} /></div>
          <div>
            <strong>{person.name}</strong>
            <span>{person.desc} · 依据：{person.basis}</span>
          </div>
        </div>
        <button className="ghost-btn sm" onClick={() => setShowAssets((v) => !v)}>
          <CuteIcon name="soft-folder-tab" />{showAssets ? '收起资料' : '展开资料'}
        </button>
      </header>

      <div className={`chat-body ${showAssets ? 'with-assets' : ''}`}>
        <div className="chat-stream" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div className={`msg ${msg.from}`} key={i}>
              {msg.from === 'them' && (
                <div className="msg-avatar sm"><CuteIcon name={person.avatar as CuteIconName} /></div>
              )}
              <div className="msg-bubble">
                <p>{msg.text}</p>
                {msg.attached && (
                  <div className="msg-attached">
                    {msg.attached.map((a) => (
                      <span className="tag" key={a}><CuteIcon name="soft-document-page" />{a}</span>
                    ))}
                  </div>
                )}
                <span className="msg-time">{msg.time}</span>
              </div>
            </div>
          ))}
        </div>

        {showAssets && (
          <aside className="asset-rail">
            <div className="asset-head">
              <CuteIcon name="soft-folder-tab" />
              <strong>我的资料库</strong>
              <span>勾选后加入对话</span>
            </div>
            <div className="asset-list">
              {assetLibrary.map((a) => (
                <button
                  className={`asset-row ${selectedAssets.has(a.id) ? 'selected' : ''}`}
                  key={a.id}
                  onClick={() => toggleAsset(a.id)}
                >
                  <CuteIcon name={assetIcon(a.kind)} />
                  <div className="asset-meta">
                    <strong>{a.name}</strong>
                    <span>{a.source} · {a.meta}</span>
                  </div>
                  <span className="asset-check">{selectedAssets.has(a.id) ? '✓' : ''}</span>
                </button>
              ))}
            </div>
            {selectedAssets.size > 0 && (
              <div className="asset-selected">已选 {selectedAssets.size} 份加入下条消息</div>
            )}
          </aside>
        )}
      </div>

      <div className="chat-input-bar">
        <button className="ghost-btn sm" onClick={() => setShowAssets((v) => !v)} aria-label="附件">
          <CuteIcon name="soft-file-upload" />
        </button>
        {selectedAssets.size > 0 && (
          <div className="input-chips">
            {assetLibrary.filter((a) => selectedAssets.has(a.id)).map((a) => (
              <span className="chip removable" key={a.id} onClick={() => toggleAsset(a.id)}>
                {a.name} ✕
              </span>
            ))}
          </div>
        )}
        <input
          placeholder={`和 ${person.name} 聊聊……`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
        />
        <button className={`send-button ${sending ? 'btn-loading' : ''}`} onClick={() => void send()} disabled={sending} aria-label="发送">
          {sending ? <span className="btn-spinner" /> : <CuteIcon name="soft-send-plane" />}
        </button>
      </div>
    </div>
  )
}

function assetIcon(kind: Asset['kind']): CuteIconName {
  switch (kind) {
    case 'doc': return 'soft-document-page'
    case 'note': return 'soft-note-sticky'
    case 'memory': return 'soft-database-stack'
    case 'image': return 'soft-image-landscape'
    case 'audio': return 'soft-waveform-audio'
  }
}

/* ============================================================
   技能中心 / 进化日志 / 设置
   ============================================================ */
function SkillsPage() {
  // 会话内已安装的商店技能：点「安装」后并入已启用（刷新才重置）
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [evomapConnection, setEvomapConnection] = useState<{
    configured: boolean
    connected: boolean
    connection?: { mode: 'test' | 'live' | 'unknown'; scopes: string[]; expiresAt?: string }
  } | null>(null)
  const [evomapQuery, setEvomapQuery] = useState('部署脚本')
  const [geneType, setGeneType] = useState('')
  const [networkRecipes, setNetworkRecipes] = useState<EvoMapRecipe[]>([])
  const [networkGenes, setNetworkGenes] = useState<EvoMapGene[]>([])
  const [networkState, setNetworkState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [lastNetworkLoad, setLastNetworkLoad] = useState<'recipes' | 'genes' | null>(null)
  const [networkError, setNetworkError] = useState('')
  const [externalSkills, setExternalSkills] = useState<ExternalAgentSkill[]>([])
  const [externalSkillState, setExternalSkillState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [externalSkillMessage, setExternalSkillMessage] = useState('')
  const [installingExternalId, setInstallingExternalId] = useState<string | null>(null)
  const networkHint = useInlineHint(3000)

  const install = (name: string) => setInstalled((prev) => new Set(prev).add(name))

  useEffect(() => {
    let cancelled = false
    getEvoMapConnection()
      .then((connection) => {
        if (!cancelled) setEvomapConnection(connection)
      })
      .catch(() => {
        if (!cancelled) setEvomapConnection({ configured: false, connected: false })
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    listExternalSkills()
      .then((result) => {
        if (cancelled) return
        setExternalSkills(result.skills)
        setExternalSkillState('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setExternalSkillMessage(formatApiError(error))
        setExternalSkillState('error')
      })
    return () => { cancelled = true }
  }, [])

  const connectEvoMap = async () => {
    setNetworkState('loading')
    setNetworkError('')
    try {
      const { url } = await getEvoMapConnectUrl()
      window.location.href = url
    } catch (error) {
      setNetworkState('error')
      setNetworkError(formatApiError(error))
    }
  }

  const searchRecipes = async () => {
    setNetworkState('loading')
    setNetworkError('')
    try {
      const result = await searchEvoMapRecipes(evomapQuery, 6)
      setNetworkRecipes(result.recipes ?? [])
      setLastNetworkLoad('recipes')
      setNetworkState('ready')
    } catch (error) {
      setNetworkState('error')
      setNetworkError(formatApiError(error))
    }
  }

  const loadGenes = async () => {
    setNetworkState('loading')
    setNetworkError('')
    try {
      const result = await listEvoMapGenes(geneType, 6)
      setNetworkGenes(result.genes ?? [])
      setLastNetworkLoad('genes')
      setNetworkState('ready')
    } catch (error) {
      setNetworkState('error')
      setNetworkError(formatApiError(error))
    }
  }

  const installExternalRecipe = async (recipe: EvoMapRecipe) => {
    const id = recipeId(recipe)
    if (!id) return
    setInstallingExternalId(id)
    try {
      const title = recipeTitle(recipe)
      await createSkill({
        name: `EvoMap：${title}`,
        description: recipeDescription(recipe) || '从 EvoMap recipe 安装的可复用经验。',
        trigger: `出现类似「${title}」的目标舱任务时`,
        contextCache: [`EvoMap Recipe：${title}｜${recipeDescription(recipe) || id}`],
        referencedEvoMapIds: [id],
        privacyPolicy: 'summary_only',
      })
      networkHint.show(`已安装 EvoMap recipe：${title}`)
    } catch (error) {
      networkHint.show(`安装失败：${formatApiError(error)}`)
    } finally {
      setInstallingExternalId(null)
    }
  }

  const installExternalGene = async (gene: EvoMapGene) => {
    const id = geneId(gene)
    if (!id) return
    setInstallingExternalId(id)
    try {
      const title = geneTitle(gene)
      await createSkill({
        name: `EvoMap Gene：${title}`,
        description: geneDescription(gene) || '从 EvoMap gene 安装的能力资产。',
        trigger: `${geneTypeLabel(gene)} 能力适用时`,
        contextCache: [`EvoMap Gene：${title}｜${geneDescription(gene) || id}`],
        referencedEvoMapIds: [id],
        privacyPolicy: 'summary_only',
      })
      networkHint.show(`已安装 EvoMap gene：${title}`)
    } catch (error) {
      networkHint.show(`安装失败：${formatApiError(error)}`)
    } finally {
      setInstallingExternalId(null)
    }
  }

  const refreshExternalSkills = async () => {
    setExternalSkillState('loading')
    setExternalSkillMessage('')
    try {
      const result = await listExternalSkills()
      setExternalSkills(result.skills)
      setExternalSkillState('ready')
    } catch (error) {
      setExternalSkillMessage(formatApiError(error))
      setExternalSkillState('error')
    }
  }

  const importExternalSkill = async (skill: ExternalAgentSkill) => {
    setInstallingExternalId(skill.id)
    try {
      const result = await syncExternalSkillToEvoPi(skill.id)
      networkHint.show(`已导入 ${skill.kind} Skill：${result.skill.name}`)
      await refreshExternalSkills()
    } catch (error) {
      networkHint.show(`导入失败：${formatApiError(error)}`)
    } finally {
      setInstallingExternalId(null)
    }
  }

  return (
    <div className="library-page">
      <SkillSection icon="soft-search-spark" title="EvoMap 经验网络">
        <section className="skill-evomap-panel">
          <div className="skill-evomap-status">
            <div>
              <em className="tag">{evomapConnection?.connected ? '已连接' : evomapConnection?.configured ? '待授权' : '未配置'}</em>
              <em className="tag pink">{evomapConnection?.connection?.mode ?? 'live pending'}</em>
              {evomapConnection?.connection?.scopes?.slice(0, 4).map((scope) => (
                <em className="tag mint" key={scope}>{scope}</em>
              ))}
            </div>
            <button className="ghost-btn sm" onClick={() => void connectEvoMap()}>
              <CuteIcon name="soft-shield-check" />连接 EvoMap
            </button>
          </div>

          <div className="skill-evomap-tools">
            <input
              value={evomapQuery}
              onChange={(e) => setEvomapQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void searchRecipes() }}
              placeholder="搜索 recipes"
            />
            <button className="primary-btn sm" onClick={() => void searchRecipes()} disabled={networkState === 'loading'}>
              <CuteIcon name="soft-search-spark" />Recipes
            </button>
            <input
              value={geneType}
              onChange={(e) => setGeneType(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void loadGenes() }}
              placeholder="gene type"
            />
            <button className="ghost-btn sm" onClick={() => void loadGenes()} disabled={networkState === 'loading'}>
              <CuteIcon name="soft-sparkle-edit" />Genes
            </button>
          </div>

          {networkState === 'error' && (
            <div className="ws-evomap-error">
              <CuteIcon name="soft-warning-triangle" />
              <span>{networkError}</span>
            </div>
          )}
          {networkHint.hint && (
            <div className="inline-hint"><CuteIcon name="soft-success-check" />{networkHint.hint}</div>
          )}

          <div className="skill-evomap-columns">
            <div>
              <div className="skill-section-title"><CuteIcon name="soft-document-page" />Recipes</div>
              <div className="skill-page">
                {networkRecipes.map((recipe) => {
                  const id = recipeId(recipe)
                  return (
                    <article className="skill-card evomap-card" key={id ?? recipeTitle(recipe)}>
                      <CuteIcon name="soft-document-page" />
                      <div>
                        <h2>{recipeTitle(recipe)}</h2>
                        <span>{recipeDescription(recipe) || recipeStatus(recipe)}</span>
                        <span>{id ?? 'no id'}</span>
                      </div>
                      <div>
                        <em className="tag">{recipe.livemode === false ? 'Test' : recipeStatus(recipe)}</em>
                        <button disabled={!id || installingExternalId === id} onClick={() => void installExternalRecipe(recipe)}>
                          {installingExternalId === id ? '安装中…' : '安装'}
                        </button>
                      </div>
                    </article>
                  )
                })}
                {networkState === 'ready' && lastNetworkLoad === 'recipes' && networkRecipes.length === 0 && (
                  <p className="ws-snippet-empty">没有返回 recipe。</p>
                )}
              </div>
            </div>
            <div>
              <div className="skill-section-title"><CuteIcon name="soft-sparkle-edit" />Genes</div>
              <div className="skill-page">
                {networkGenes.map((gene) => {
                  const id = geneId(gene)
                  return (
                    <article className="skill-card evomap-card" key={id ?? geneTitle(gene)}>
                      <CuteIcon name="soft-sparkle-edit" />
                      <div>
                        <h2>{geneTitle(gene)}</h2>
                        <span>{geneDescription(gene) || geneTypeLabel(gene)}</span>
                        <span>{id ?? 'no id'}</span>
                      </div>
                      <div>
                        <em className="tag">{geneTypeLabel(gene)}</em>
                        <button disabled={!id || installingExternalId === id} onClick={() => void installExternalGene(gene)}>
                          {installingExternalId === id ? '安装中…' : '安装'}
                        </button>
                      </div>
                    </article>
                  )
                })}
                {networkState === 'ready' && lastNetworkLoad === 'genes' && networkGenes.length === 0 && (
                  <p className="ws-snippet-empty">没有返回 gene。</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </SkillSection>

      <SkillSection icon="soft-import-data" title="Pi / OpenClaw / Hermes Skills">
        <section className="skill-evomap-panel">
          <div className="skill-evomap-status">
            <div>
              <em className="tag blue">外部开发环境</em>
              <em className="tag mint">{externalSkills.length} skills</em>
              {externalSkillState === 'error' && <em className="tag warn">{externalSkillMessage}</em>}
            </div>
            <button className="ghost-btn sm" onClick={() => void refreshExternalSkills()} disabled={externalSkillState === 'loading'}>
              <CuteIcon name="soft-refresh-loop" />刷新
            </button>
          </div>
          <div className="skill-page">
            {externalSkills.map((skill) => (
              <article className="skill-card evomap-card" key={skill.id}>
                <CuteIcon name={externalAgentIcon(skill.kind)} />
                <div>
                  <h2>{skill.title ?? skill.name}</h2>
                  <span>{externalAgentLabel(skill.kind)} · {skill.description ?? skill.path}</span>
                  <span>{skill.path}</span>
                </div>
                <div>
                  <em className="tag">{skill.syncedSkillId ? '已同步' : skill.source}</em>
                  <button
                    disabled={Boolean(skill.syncedSkillId) || installingExternalId === skill.id}
                    onClick={() => void importExternalSkill(skill)}
                  >
                    {skill.syncedSkillId ? '已导入' : installingExternalId === skill.id ? '导入中…' : '导入'}
                  </button>
                </div>
              </article>
            ))}
            {externalSkillState === 'ready' && externalSkills.length === 0 && (
              <p className="ws-snippet-empty">还没有外部 Skill。先到隐私权限页扫描并一键导入 Pi / OpenClaw / Hermes / EvoMap Developers。</p>
            )}
          </div>
        </section>
      </SkillSection>

      <SkillSection icon="soft-success-check" title="已安装技能">
        <div className="skill-page">
          {installedSkills.map((s) => (
            <SkillCard key={s.name} skill={s} mode="manage" />
          ))}
          {storeSkills
            .filter((s) => installed.has(s.name))
            .map((s) => (
              <SkillCard key={s.name} skill={{ ...s, status: '已启用' }} mode="manage" />
            ))}
        </div>
      </SkillSection>
      <SkillSection icon="soft-bookmark-study" title="技能商店推荐">
        <div className="skill-page">
          {storeSkills.map((s) => (
            <SkillCard
              key={s.name}
              skill={s}
              mode="install"
              done={installed.has(s.name)}
              onInstall={() => install(s.name)}
            />
          ))}
        </div>
      </SkillSection>
    </div>
  )
}

// 技能卡片：管理（无后端，就近提示）/ 安装（loading → 已安装，会话内保持）
type SkillLike = { name: string; icon: string; trigger: string; scope: string; status: string }

function SkillCard({
  skill, mode, done, onInstall,
}: {
  skill: SkillLike
  mode: 'manage' | 'install'
  done?: boolean
  onInstall?: () => void
}) {
  const manageHint = useInlineHint(2400)
  const installAct = useActionState()

  return (
    <article className="skill-card">
      <CuteIcon name={skill.icon as CuteIconName} />
      <div>
        <h2>{skill.name}</h2>
        <span>触发：{skill.trigger}</span>
        <span>范围：{skill.scope}</span>
      </div>
      <div>
        <em className="tag">{mode === 'install' && done ? '已启用' : skill.status}</em>
        {mode === 'manage' ? (
          <button
            className={manageHint.hint ? 'btn-loading' : ''}
            onClick={() => manageHint.show('技能配置面板准备中')}
          >
            管理
          </button>
        ) : (
          <button
            className={`${installAct.status === 'done' || done ? 'btn-done' : ''} ${installAct.status === 'loading' ? 'btn-loading' : ''}`}
            disabled={installAct.status === 'loading' || done}
            onClick={() => installAct.run(() => onInstall?.(), { duration: 800 })}
          >
            {done || installAct.status === 'done'
              ? '已安装 ✓'
              : installAct.status === 'loading'
                ? '安装中…'
                : '安装'}
          </button>
        )}
      </div>
      {manageHint.hint && (
        <div className="inline-hint"><CuteIcon name="soft-settings-gear" />{manageHint.hint}</div>
      )}
    </article>
  )
}

function SkillSection({ icon, title, children }: { icon: CuteIconName; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="skill-section-title"><CuteIcon name={icon} />{title}</div>
      {children}
    </div>
  )
}

function EvolutionPage() {
  const [tab, setTab] = useState<'agent' | 'user'>('agent')
  const [events, setEvents] = useState<EvolutionEvent[]>([])
  const [eventsState, setEventsState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [eventTransport, setEventTransport] = useState<'sse' | 'polling' | 'manual'>('manual')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(() => new Set())
  const [freshEventIds, setFreshEventIds] = useState<string[]>([])
  const [laneFilter, setLaneFilter] = useState<EvolutionLane>('all')

  useEffect(() => {
    let cancelled = false
    let pollTimer: number | undefined
    let manualTimer: number | undefined
    let source: EventSource | undefined
    const freshTimers: number[] = []
    const load = () => {
      listEvolutionEvents(80)
        .then(({ events }) => {
          if (cancelled) return
          setEvents(events)
          setEventsState('ready')
          setLastUpdatedAt(new Date().toISOString())
        })
        .catch(() => {
          if (cancelled) return
          setEventsState('error')
        })
    }
    const startPolling = () => {
      if (pollTimer !== undefined) return
      setEventTransport(autoRefresh ? 'polling' : 'manual')
      pollTimer = window.setInterval(load, 5000)
    }

    load()
    if (!autoRefresh) {
      manualTimer = window.setTimeout(() => {
        if (!cancelled) setEventTransport('manual')
      }, 0)
      return () => {
        cancelled = true
        if (manualTimer !== undefined) window.clearTimeout(manualTimer)
      }
    }

    if ('EventSource' in window) {
      source = new EventSource(evolutionEventsStreamUrl(80))
      source.onopen = () => {
        if (!cancelled) setEventTransport('sse')
      }
      source.addEventListener('ready', (message) => {
        if (cancelled) return
        const readyEvents = parseEvolutionStreamReady((message as MessageEvent).data)
        if (!readyEvents) return
        setEvents(readyEvents)
        setEventsState('ready')
        setLastUpdatedAt(new Date().toISOString())
      })
      source.addEventListener('evolution.event', (message) => {
        if (cancelled) return
        const event = parseEvolutionStreamEvent((message as MessageEvent).data)
        if (!event) return
        setEvents((current) => mergeEvolutionEvents(event, current, 80))
        setFreshEventIds((current) => [event.id, ...current.filter((id) => id !== event.id)].slice(0, 8))
        freshTimers.push(window.setTimeout(() => {
          if (!cancelled) setFreshEventIds((current) => current.filter((id) => id !== event.id))
        }, 7200))
        setEventsState('ready')
        setLastUpdatedAt(new Date().toISOString())
      })
      source.onerror = () => {
        source?.close()
        source = undefined
        if (!cancelled) startPolling()
      }
    } else {
      startPolling()
    }

    return () => {
      cancelled = true
      source?.close()
      if (manualTimer !== undefined) window.clearTimeout(manualTimer)
      if (pollTimer !== undefined) window.clearInterval(pollTimer)
      freshTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [autoRefresh])

  const refreshEvents = async () => {
    setEventsState(events.length ? 'ready' : 'loading')
    try {
      const result = await listEvolutionEvents(80)
      setEvents(result.events)
      setEventsState('ready')
      setLastUpdatedAt(new Date().toISOString())
    } catch {
      setEventsState('error')
    }
  }

  const filteredEvents = useMemo(
    () => laneFilter === 'all'
      ? events
      : events.filter((event) => evolutionEventLane(event) === laneFilter),
    [events, laneFilter],
  )
  const stats = useMemo(() => evolutionStats(events), [events])
  const newestEvent = events[0]
  const stageCompletion = useMemo(() => evolutionStageCompletion(events), [events])
  const densityBars = useMemo(() => evolutionDensityBars(events), [events])
  const recentLiveEvents = useMemo(() => events.slice(0, 5), [events])
  const userSignalEvents = useMemo(() => events.filter(isUserFacingEvolutionEvent).slice(0, 8), [events])
  const chainLanes = useMemo(() => evolutionLanes.filter((lane) => lane.key !== 'all'), [])
  const allFilteredExpanded = filteredEvents.length > 0 && filteredEvents.every((event) => expandedEventIds.has(event.id))

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventIds((current) => {
      const next = new Set(current)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  const toggleFilteredExpansion = () => {
    setExpandedEventIds((current) => {
      const next = new Set(current)
      if (allFilteredExpanded) filteredEvents.forEach((event) => next.delete(event.id))
      else filteredEvents.forEach((event) => next.add(event.id))
      return next
    })
  }

  return (
    <div className="evo-page">
      <section className="evo-hero">
        <div className="evo-hero-top">
          <div className="evo-hero-copy">
            <span className="tag blue">EvolutionEvent</span>
            <h2>进化日志</h2>
            <p>Signal → Local Skill → Recipe Draft → Test Publish → Reuse Graph → EvolutionEvent</p>
          </div>
          <div className="evo-live-panel">
            <span className={`evo-live-dot ${eventsState === 'error' ? 'error' : autoRefresh ? 'on' : ''}`} />
            <div>
              <strong>{eventsState === 'error' ? '事件流离线' : evolutionTransportTitle(autoRefresh, eventTransport)}</strong>
              <span>{lastUpdatedAt ? `最后同步 ${formatEvolutionTime(lastUpdatedAt)}` : '等待第一次同步'}</span>
            </div>
            <button className="ghost-btn sm" onClick={() => setAutoRefresh((value) => !value)}>
              <CuteIcon name="soft-refresh-loop" />{autoRefresh ? '暂停' : '实时'}
            </button>
            <button className="primary-btn sm" onClick={() => void refreshEvents()}>
              <CuteIcon name="soft-log-lines" />刷新
            </button>
          </div>
        </div>
        <div className="evo-hero-progress">
          <div className="evo-progress-head">
            <span>自进化闭环</span>
            <strong>{stageCompletion.percent}%</strong>
          </div>
          <div className="evo-progress-bar" aria-label="自进化闭环完成度">
            <span style={{ width: `${stageCompletion.percent}%` }} />
          </div>
          <div className="evo-progress-nodes">
            {chainLanes.map((lane) => (
              <span
                className={events.some((event) => evolutionEventLane(event) === lane.key) ? 'done' : ''}
                key={lane.key}
              >
                {lane.label}
              </span>
            ))}
          </div>
        </div>
        <div className="evo-hero-summary">
          <article>
            <span>链路推进</span>
            <strong>{stageCompletion.done}/{stageCompletion.total}</strong>
            <em>{stageCompletion.label}</em>
          </article>
          <article>
            <span>最新事件</span>
            <strong>{newestEvent ? evolutionLaneLabel(evolutionEventLane(newestEvent)) : '等待'}</strong>
            <em>{newestEvent ? newestEvent.type : '还没有 EvolutionEvent'}</em>
          </article>
          <article>
            <span>事件新鲜度</span>
            <strong>{newestEvent ? evolutionFreshness(newestEvent.createdAt).label : '待同步'}</strong>
            <em>{eventsState === 'error' ? '后端暂不可用' : evolutionTransportNote(autoRefresh, eventTransport)}</em>
          </article>
        </div>
        <div className="evo-live-strip" aria-label="最近进化事件">
          {recentLiveEvents.length ? recentLiveEvents.map((event) => (
            <div className={`evo-live-strip-item ${freshEventIds.includes(event.id) ? 'is-live' : ''}`} key={event.id}>
              <CuteIcon name={eventIcon(event.type)} />
              <div>
                <strong>{event.summary}</strong>
                <span>{event.type} · {formatEvolutionAge(event.createdAt)}</span>
              </div>
            </div>
          )) : (
            <div className="evo-live-strip-item empty">
              <CuteIcon name="soft-log-lines" />
              <div>
                <strong>等待第一条可审计进化</strong>
                <span>搜索 EvoMap、确认 Skill、发布 draft 或 webhook 到达后会自动出现。</span>
              </div>
            </div>
          )}
        </div>
        <div className="evo-density-panel" aria-label="进化事件密度">
          <div>
            <strong>事件密度</strong>
            <span>{stats.recent} 条最近 30 分钟 · {events.length} 条总日志</span>
          </div>
          <div className="evo-density-bars">
            {densityBars.map((bar) => (
              <span
                aria-label={`${bar.label}: ${bar.count} 条`}
                key={bar.key}
                style={{ height: `${Math.max(10, Math.round(bar.ratio * 100))}%` }}
                title={`${bar.label}: ${bar.count} 条`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="co-evo-loop evo-loop-polished">
        <div className="co-evo-side user">
          <CuteIcon name={coEvolutionLoop[0].icon} />
          <strong>{coEvolutionLoop[0].title}</strong>
          <p>{coEvolutionLoop[0].desc}</p>
        </div>
        <div className="co-evo-arrow">
          <span className="arrow-line" />
          <span className="arrow-cap">互相促进</span>
          <span className="arrow-line" />
        </div>
        <div className="co-evo-side agent">
          <CuteIcon name={coEvolutionLoop[1].icon} />
          <strong>{coEvolutionLoop[1].title}</strong>
          <p>{coEvolutionLoop[1].desc}</p>
        </div>
      </section>

      <div className="evo-tabs">
        <button className={tab === 'agent' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('agent')}>
          Agent 进化历程
        </button>
        <button className={tab === 'user' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('user')}>
          用户进化记录
        </button>
      </div>

      {tab === 'agent' ? (
        <div className="evo-agent">
          <section className="evo-metrics-grid">
            <EvolutionMetric icon="soft-log-lines" label="事件总数" value={stats.total} note={`${stats.recent} 条最近 30 分钟`} tone="mint" />
            <EvolutionMetric icon="soft-settings-gear" label="本地 Skill" value={stats.localSkills} note="用户确认后的可复用经验" tone="pink" />
            <EvolutionMetric icon="soft-document-page" label="Recipe 链路" value={stats.recipeEvents} note="draft / publish / webhook" tone="yellow" />
            <EvolutionMetric icon="soft-refresh-loop" label="EvoMap 图谱" value={stats.reuseEvents} note="recipe / gene / reuse 引用" tone="blue" />
          </section>

          <section className="evo-chain-board">
            <div className="skill-section-title">
              <CuteIcon name="soft-refresh-loop" />
              自进化链路
            </div>
            <div className="evo-chain-track">
              {chainLanes.map((lane, index) => {
                const laneEvents = events.filter((event) => evolutionEventLane(event) === lane.key)
                const latest = laneEvents[0]
                const freshness = latest ? evolutionFreshness(latest.createdAt) : undefined
                return (
                  <button
                    className={`evo-chain-node ${laneFilter === lane.key ? 'active' : ''} ${laneEvents.length ? 'ready' : ''}`}
                    key={lane.key}
                    onClick={() => setLaneFilter(lane.key)}
                  >
                    <span className="evo-chain-index">{index + 1}</span>
                    <CuteIcon name={lane.icon} />
                    <strong>{lane.label}</strong>
                    <em>{laneEvents.length} events</em>
                    <span className={`evo-chain-state ${freshness?.tone ?? 'idle'}`}>{freshness?.label ?? '未触发'}</span>
                    <small>{latest ? latest.summary.slice(0, 54) : lane.empty}</small>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="evo-visual-grid">
            <div className="evo-map-panel">
              <div className="skill-section-title">
                <CuteIcon name="soft-sparkle-twinkle" />
                进化分支图
              </div>
              <EvolutionMindMap events={events} />
            </div>
            <aside className="evo-current-panel">
              <div className="skill-section-title">
                <CuteIcon name={newestEvent ? eventIcon(newestEvent.type) : 'soft-log-lines'} />
                最近一次进化
              </div>
              {newestEvent ? (
                <div className="evo-current-card">
                  <span className={`evo-lane-pill lane-${evolutionEventLane(newestEvent)}`}>{evolutionLaneLabel(evolutionEventLane(newestEvent))}</span>
                  <strong>{newestEvent.type}</strong>
                  <p>{newestEvent.summary}</p>
                  <div className="evo-current-meta">
                    <span>{formatEvolutionTime(newestEvent.createdAt)}</span>
                    {newestEvent.subjectId && <span>{shortIdentifier(newestEvent.subjectId)}</span>}
                  </div>
                  <div className="evo-evidence-chips">
                    {evidenceChips(newestEvent).slice(0, 5).map((chip) => <em key={chip}>{chip}</em>)}
                  </div>
                </div>
              ) : (
                <div className="evo-empty-panel">
                  <CuteIcon name="soft-log-lines" />
                  <span>等待第一条 EvolutionEvent</span>
                </div>
              )}
            </aside>
          </section>

          <section className="evo-event-console">
            <div className="evo-console-head">
              <div>
                <span className="tag mint">Audit Trail</span>
                <strong>{laneFilter === 'all' ? '全部进化事件' : evolutionLaneLabel(laneFilter)}</strong>
                <small>{filteredEvents.length} / {events.length} 条事件</small>
              </div>
              <div className="evo-console-tools">
                <div className="evo-filter-tabs">
                  {evolutionLanes.map((lane) => (
                    <button
                      className={laneFilter === lane.key ? 'active' : ''}
                      key={lane.key}
                      onClick={() => setLaneFilter(lane.key)}
                    >
                      {lane.label}
                    </button>
                  ))}
                </div>
                <button className="ghost-btn sm" disabled={!filteredEvents.length} onClick={toggleFilteredExpansion}>
                  <CuteIcon name="soft-log-lines" />{allFilteredExpanded ? '收起全部' : '展开全部'}
                </button>
              </div>
            </div>

            {eventsState === 'loading' && <EvolutionPlaceholder type="loading" />}
            {eventsState === 'error' && <EvolutionPlaceholder type="error" />}
            {eventsState === 'ready' && events.length === 0 && <EvolutionPlaceholder type="empty" />}
            {eventsState === 'ready' && filteredEvents.length > 0 && (
              <div className="evo-event-list">
                {filteredEvents.map((event, i) => (
                  <EvolutionEventCard
                    event={event}
                    index={i}
                    key={event.id}
                    expanded={expandedEventIds.has(event.id)}
                    fresh={freshEventIds.includes(event.id)}
                    onToggle={() => toggleEventExpansion(event.id)}
                  />
                ))}
              </div>
            )}
            {eventsState === 'ready' && events.length > 0 && filteredEvents.length === 0 && (
              <EvolutionPlaceholder type="filtered-empty" />
            )}
          </section>

          <div className="evo-gep">
            <div className="skill-section-title">
              <CuteIcon name="soft-log-lines" />
              一条行为是怎么变成的
            </div>
            <div className="evo-gep-grid">
              {evolutionLogs.map((log, i) => (
                <article className="evo-gep-step" key={log.label}>
                  <span>{i + 1}</span>
                  <CuteIcon name={log.icon} />
                  <strong>{log.label}</strong>
                  <em>{log.en}</em>
                  <p>{log.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="evo-user">
          <div className="room-notice">
            <strong>你每一次点 Enter，EvoPi 都在记录</strong>
            下面是你最近几次提交时，EvoPi 帮你记录的内容，以及它认为你可以在哪些方面改进的小建议。
          </div>
          <section className="user-evo-realtime">
            <div className="skill-section-title">
              <CuteIcon name="soft-sparkle-twinkle" />
              真实反馈信号流
            </div>
            <div className="user-signal-grid">
              {userSignalEvents.length ? userSignalEvents.map((event) => (
                <article className={`user-signal-card lane-${evolutionEventLane(event)}`} key={event.id}>
                  <div className="user-signal-head">
                    <CuteIcon name={eventIcon(event.type)} />
                    <div>
                      <strong>{evolutionSignalKind(event)}</strong>
                      <span>{formatEvolutionAge(event.createdAt)} · {event.type}</span>
                    </div>
                  </div>
                  <p>{event.summary}</p>
                  <div className="evo-evidence-chips">
                    {evidenceChips(event).slice(0, 3).map((chip) => <em key={chip}>{chip}</em>)}
                  </div>
                </article>
              )) : (
                <article className="user-signal-card empty">
                  <CuteIcon name="soft-log-lines" />
                  <strong>等待来自你的下一次反馈</strong>
                  <p>采纳、纠正、忽略、微信入站、Skill 确认都会进入这里，再被蒸馏成 Gene 与 Capsule。</p>
                </article>
              )}
            </div>
          </section>
          <div className="user-evo-list">
            {userEvolutionLog.map((e) => (
              <article className="user-evo-card" key={e.time}>
                <div className="user-evo-head">
                  <CuteIcon name="soft-role-users" />
                  <div>
                    <strong>{e.task}</strong>
                    <span>{e.time}</span>
                  </div>
                </div>
                <div className="user-evo-row">
                  <em className="tag mint">Agent 记录</em>
                  <span>{e.recorded}</span>
                </div>
                <div className="user-evo-row">
                  <em className="tag pink">改进建议</em>
                  <span>{e.suggestion}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type EvolutionLane = 'all' | 'signal' | 'local' | 'draft' | 'publish' | 'reuse' | 'event'

const evolutionLanes: Array<{
  key: EvolutionLane
  label: string
  icon: CuteIconName
  empty: string
}> = [
  { key: 'all', label: '全部', icon: 'soft-log-lines', empty: '等待事件' },
  { key: 'signal', label: 'Signal', icon: 'soft-search-spark', empty: '等待外部信号' },
  { key: 'local', label: 'Local Skill', icon: 'soft-settings-gear', empty: '等待本地沉淀' },
  { key: 'draft', label: 'Recipe Draft', icon: 'soft-document-page', empty: '等待 draft' },
  { key: 'publish', label: 'Test Publish', icon: 'soft-success-check', empty: '等待发布' },
  { key: 'reuse', label: 'Reuse Graph', icon: 'soft-refresh-loop', empty: '等待图谱' },
  { key: 'event', label: 'EvolutionEvent', icon: 'soft-sparkle-twinkle', empty: '等待事件回执' },
]

function evolutionEventLane(event: EvolutionEvent): EvolutionLane {
  const type = event.type
  if (type === 'receipt_run.created' || type === 'skill.confirmed' || type === 'external_skill.synced') return 'local'
  if (type === 'recipe.draft_created') return 'draft'
  if (type === 'recipe.test_published' || type === 'recipe.published' || type === 'webhook.received') return 'publish'
  if (type === 'evomap.reuse_queried' || type === 'evomap.reference_attached') return 'reuse'
  if (type.startsWith('evomap.') || type.startsWith('connector.') || type.startsWith('external_agent.') || type === 'agent_run.completed') return 'signal'
  return 'event'
}

function evolutionLaneLabel(lane: EvolutionLane): string {
  return evolutionLanes.find((item) => item.key === lane)?.label ?? 'EvolutionEvent'
}

function evolutionStats(events: EvolutionEvent[]) {
  const recentCutoff = Date.now() - 30 * 60 * 1000
  return {
    total: events.length,
    recent: events.filter((event) => new Date(event.createdAt).getTime() >= recentCutoff).length,
    localSkills: events.filter((event) => evolutionEventLane(event) === 'local').length,
    recipeEvents: events.filter((event) => {
      const lane = evolutionEventLane(event)
      return lane === 'draft' || lane === 'publish'
    }).length,
    reuseEvents: events.filter((event) => evolutionEventLane(event) === 'reuse').length,
  }
}

function parseEvolutionStreamReady(value: string): EvolutionEvent[] | undefined {
  try {
    const payload = JSON.parse(value) as { events?: unknown }
    return Array.isArray(payload.events) ? payload.events.filter(isEvolutionEvent) : undefined
  } catch {
    return undefined
  }
}

function parseEvolutionStreamEvent(value: string): EvolutionEvent | undefined {
  try {
    const payload = JSON.parse(value) as unknown
    return isEvolutionEvent(payload) ? payload : undefined
  } catch {
    return undefined
  }
}

function isEvolutionEvent(value: unknown): value is EvolutionEvent {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string'
    && typeof record.type === 'string'
    && typeof record.summary === 'string'
    && typeof record.createdAt === 'string'
}

function mergeEvolutionEvents(event: EvolutionEvent, current: EvolutionEvent[], limit: number): EvolutionEvent[] {
  return [event, ...current.filter((item) => item.id !== event.id)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

function evolutionTransportTitle(autoRefresh: boolean, transport: 'sse' | 'polling' | 'manual'): string {
  if (!autoRefresh || transport === 'manual') return '手动刷新'
  return transport === 'sse' ? '实时订阅中' : '轮询更新中'
}

function evolutionTransportNote(autoRefresh: boolean, transport: 'sse' | 'polling' | 'manual'): string {
  if (!autoRefresh || transport === 'manual') return '手动刷新模式'
  return transport === 'sse' ? 'SSE 事件流' : '5s 轮询兜底'
}

function evolutionStageCompletion(events: EvolutionEvent[]) {
  const stages = evolutionLanes.filter((lane) => lane.key !== 'all')
  const done = stages.filter((lane) => events.some((event) => evolutionEventLane(event) === lane.key)).length
  const next = stages.find((lane) => !events.some((event) => evolutionEventLane(event) === lane.key))
  return {
    done,
    total: stages.length,
    percent: stages.length ? Math.round((done / stages.length) * 100) : 0,
    label: next ? `下一站 ${next.label}` : '闭环已形成',
  }
}

function evolutionDensityBars(events: EvolutionEvent[]) {
  const slotMinutes = 5
  const slotMs = slotMinutes * 60 * 1000
  const slotCount = 12
  const now = Date.now()
  const counts = Array.from({ length: slotCount }, () => 0)
  events.forEach((event) => {
    const age = now - new Date(event.createdAt).getTime()
    if (age < 0 || age >= slotCount * slotMs) return
    const slot = slotCount - 1 - Math.floor(age / slotMs)
    counts[slot] += 1
  })
  const max = Math.max(1, ...counts)
  return counts.map((count, index) => ({
    key: `${index}-${count}`,
    count,
    label: index === slotCount - 1 ? '现在' : `${(slotCount - index - 1) * slotMinutes} 分钟前`,
    ratio: count / max,
  }))
}

function evolutionFreshness(value: string): { label: string; tone: 'hot' | 'warm' | 'cold' } {
  const ageMs = Math.max(0, Date.now() - new Date(value).getTime())
  const minute = 60 * 1000
  const hour = 60 * minute
  if (ageMs < minute) return { label: '刚刚发生', tone: 'hot' }
  if (ageMs < 10 * minute) return { label: `${Math.floor(ageMs / minute)} 分钟内`, tone: 'hot' }
  if (ageMs < hour) return { label: `${Math.floor(ageMs / minute)} 分钟前`, tone: 'warm' }
  if (ageMs < 24 * hour) return { label: `${Math.floor(ageMs / hour)} 小时前`, tone: 'warm' }
  return { label: formatEvolutionTime(value), tone: 'cold' }
}

function formatEvolutionAge(value: string): string {
  return evolutionFreshness(value).label
}

function isUserFacingEvolutionEvent(event: EvolutionEvent): boolean {
  const lane = evolutionEventLane(event)
  return lane === 'signal' || lane === 'local' || event.type.includes('skill') || event.type.includes('receipt')
}

function evolutionSignalKind(event: EvolutionEvent): string {
  if (event.type.includes('wechat')) return '微信反馈'
  if (event.type.includes('skill')) return 'Skill 采纳'
  if (event.type.includes('receipt')) return '小票沉淀'
  if (event.type.includes('external_agent') || event.type.includes('agent_run')) return 'Agent 行为'
  if (event.type.startsWith('evomap.')) return 'EvoMap 信号'
  return '用户反馈'
}

function EvolutionMetric({ icon, label, value, note, tone }: {
  icon: CuteIconName
  label: string
  value: number
  note: string
  tone: 'mint' | 'pink' | 'yellow' | 'blue'
}) {
  return (
    <article className={`evo-metric tone-${tone}`}>
      <CuteIcon name={icon} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <em>{note}</em>
      </div>
    </article>
  )
}

function EvolutionPlaceholder({ type }: { type: 'loading' | 'error' | 'empty' | 'filtered-empty' }) {
  const copy = {
    loading: ['soft-loading-loop', '正在同步事件流', '后端 EvolutionEvent 读取中。'],
    error: ['soft-warning-triangle', '事件流暂不可用', '确认 evopi-api 正在运行后刷新。'],
    empty: ['soft-log-lines', '等待第一条进化', '搜索 EvoMap、调用 Pi、确认 Skill 后会写入这里。'],
    'filtered-empty': ['soft-search-spark', '当前分支暂无事件', '切回全部可以查看其他进化记录。'],
  } as const
  const [icon, title, desc] = copy[type]
  return (
    <article className="evo-placeholder">
      <CuteIcon name={icon} />
      <strong>{title}</strong>
      <span>{desc}</span>
    </article>
  )
}

function EvolutionEventCard({ event, index, expanded, fresh, onToggle }: {
  event: EvolutionEvent
  index: number
  expanded: boolean
  fresh: boolean
  onToggle: () => void
}) {
  const lane = evolutionEventLane(event)
  const chips = evidenceChips(event)
  return (
    <article className={`evo-event-card lane-${lane} ${fresh ? 'is-live' : ''}`} style={{ '--i': index } as React.CSSProperties}>
      <button className="evo-event-main" onClick={onToggle} aria-expanded={expanded}>
        <span className="evo-event-rail">
          <CuteIcon name={eventIcon(event.type)} />
        </span>
        <div className="evo-event-body">
          <div className="evo-event-title">
            <span className={`evo-lane-pill lane-${lane}`}>{evolutionLaneLabel(lane)}</span>
            <strong>{event.type}</strong>
            <em>{formatEvolutionTime(event.createdAt)}</em>
          </div>
          <p>{event.summary}</p>
          <div className="evo-event-meta-row">
            <span>#{String(index + 1).padStart(2, '0')}</span>
            <span>{formatEvolutionAge(event.createdAt)}</span>
            <span>{chips.length} evidence</span>
          </div>
          <div className="evo-evidence-chips">
            {chips.slice(0, 4).map((chip) => <em key={chip}>{chip}</em>)}
            {chips.length > 4 && <em>+{chips.length - 4}</em>}
          </div>
        </div>
        <span className="evo-expand-mark">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="evo-event-detail">
          <dl>
            <div><dt>eventId</dt><dd>{shortIdentifier(event.id)}</dd></div>
            {event.subjectId && <div><dt>subject</dt><dd>{shortIdentifier(event.subjectId)}</dd></div>}
            <div><dt>createdAt</dt><dd>{new Date(event.createdAt).toISOString()}</dd></div>
          </dl>
          <pre>{JSON.stringify(event.evidence ?? {}, null, 2)}</pre>
        </div>
      )}
    </article>
  )
}

function evidenceChips(event: EvolutionEvent): string[] {
  const evidence = event.evidence ?? {}
  const priorityKeys = [
    'operationId',
    'runId',
    'skillId',
    'recipeId',
    'recipeInputTitle',
    'stepCount',
    'source',
    'stage',
    'privacyPolicy',
    'publishPolicy',
    'deliveryId',
    'eventType',
    'kind',
    'skillName',
    'workflowId',
    'mode',
    'status',
    'capabilityCount',
    'workflowCount',
    'resultCount',
    'runtimeReason',
    'provider',
    'model',
    'modelOverride',
    'fallback',
    'errorCode',
    'chatId',
  ]
  const chips = priorityKeys.flatMap((key) => {
    const value = evidence[key]
    if (value === undefined || value === null || value === '') return []
    return [`${key}: ${formatEvidenceValue(value)}`]
  })
  if (typeof evidence.outputPreview === 'string' && evidence.outputPreview.trim()) {
    chips.push(`out: ${shortIdentifier(evidence.outputPreview.trim())}`)
  }
  if (typeof evidence.stderrPreview === 'string' && evidence.stderrPreview.trim()) {
    chips.push(`err: ${shortIdentifier(evidence.stderrPreview.trim())}`)
  }
  const referenced = evidence.referencedEvoMapIds
  if (Array.isArray(referenced) && referenced.length) chips.push(`refs: ${referenced.length}`)
  if (event.subjectId) chips.push(`subject: ${shortIdentifier(event.subjectId)}`)
  return chips
}

function formatEvidenceValue(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} items`
  if (typeof value === 'object' && value) return 'object'
  return shortIdentifier(String(value))
}

function shortIdentifier(value: string): string {
  if (value.length <= 28) return value
  return `${value.slice(0, 12)}…${value.slice(-8)}`
}

function formatEvolutionTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function ExternalAgentsPanel() {
  const [connections, setConnections] = useState<ExternalAgentConnection[]>([])
  const [discoveries, setDiscoveries] = useState<ExternalAgentDiscovery[]>([])
  const [developerEnv, setDeveloperEnv] = useState<DeveloperEnvironmentConnection | null>(null)
  const [skills, setSkills] = useState<ExternalAgentSkill[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [callKind, setCallKind] = useState<ExternalAgentKind>('pi')
  const [selectedCallSkillId, setSelectedCallSkillId] = useState('')
  const [developerWorkflowId, setDeveloperWorkflowId] = useState<'recipe-search' | 'gene-list' | 'reuse-query' | 'quickstart-test'>('quickstart-test')
  const [developerWorkflowInput, setDeveloperWorkflowInput] = useState('部署脚本')
  const [callOutput, setCallOutput] = useState('')
  const [busySkillId, setBusySkillId] = useState<string | null>(null)
  const [migrationPath, setMigrationPath] = useState('')
  const [migrationPreview, setMigrationPreview] = useState<HermesMigrationPreview | null>(null)
  const [migrationState, setMigrationState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [runtimePaths, setRuntimePaths] = useState<ExternalRuntimePathForm>({
    openclaw: { bin: '', home: '', configPath: '', workspacePath: '', model: '' },
    hermes: { bin: '', home: '', configPath: '', skillsPath: '' },
    evomap: { rootPath: '' },
  })

  const refreshExternalAgents = async () => {
    setStatus('loading')
    try {
      const [connectionResult, skillResult, developerResult] = await Promise.all([
        listExternalConnections(),
        listExternalSkills(),
        getEvoMapDeveloperEnvironment(),
      ])
      setConnections(connectionResult.connections)
      setSkills(skillResult.skills)
      setDeveloperEnv(developerResult.environment)
      setRuntimePaths((current) => hydrateRuntimePaths(current, connectionResult.connections, developerResult.environment))
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setCallOutput(formatApiError(error))
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshExternalAgents() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const scan = async () => {
    setStatus('loading')
    setCallOutput('')
    try {
      const [result, developerResult] = await Promise.all([
        discoverExternalAgents({ overrides: runtimePathOverrides(runtimePaths) }),
        discoverEvoMapDeveloperEnvironment({ rootPath: runtimePaths.evomap.rootPath.trim() || undefined }),
      ])
      setDiscoveries(result.discoveries)
      setDeveloperEnv(developerDiscoveryPreview(developerResult.discovery))
      setRuntimePaths((current) => hydrateRuntimePaths(current, result.discoveries.map(discoveryToConnectionPreview), developerDiscoveryPreview(developerResult.discovery)))
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setCallOutput(formatApiError(error))
    }
  }

  const importAll = async () => {
    setStatus('loading')
    setCallOutput('')
    try {
      const [result, developerResult] = await Promise.all([
        importExternalAgents([...externalAgentKinds], runtimePathOverrides(runtimePaths)),
        bootstrapEvoMapDeveloperEnvironment({ rootPath: runtimePaths.evomap.rootPath.trim() || undefined, force: true }),
      ])
      setConnections(result.connections)
      setDeveloperEnv(developerResult.environment)
      setRuntimePaths((current) => hydrateRuntimePaths(current, result.connections, developerResult.environment))
      const skillResult = await listExternalSkills()
      setSkills(skillResult.skills)
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setCallOutput(formatApiError(error))
    }
  }

  const syncSkill = async (skill: ExternalAgentSkill) => {
    setBusySkillId(skill.id)
    try {
      const result = await syncExternalSkillToEvoPi(skill.id)
      setCallOutput(`已导入 EvoPi Skill：${result.skill.name}`)
      await refreshExternalAgents()
    } catch (error) {
      setCallOutput(formatApiError(error))
    } finally {
      setBusySkillId(null)
    }
  }

  const syncAllSkills = async () => {
    setBusySkillId('__all__')
    setCallOutput('')
    try {
      const result = await syncExternalSkillsToEvoPi({ kinds: [...externalAgentKinds], limit: 500 })
      setCallOutput(`批量同步完成：新增 ${result.created} 个，跳过 ${result.skipped} 个已同步 Skill。`)
      await refreshExternalAgents()
    } catch (error) {
      setCallOutput(formatApiError(error))
    } finally {
      setBusySkillId(null)
    }
  }

  const callAgent = async () => {
    const text = message.trim()
    if (!text) return
    const selectedSkill = callableSkills.find((skill) => skill.id === effectiveSelectedCallSkillId)
    setStatus('loading')
    setCallOutput('')
    try {
      const result = await runExternalAgentWithReceipt({
        kind: callKind,
        goalName: '开发环境',
        workspaceTitle: `${externalAgentLabel(callKind)} 直接调用`,
        message: text,
        agent: callKind === 'pi' ? selectedSkill?.name : undefined,
        skillName: callKind === 'pi' ? undefined : selectedSkill?.name,
        model: callKind === 'openclaw' ? runtimePaths.openclaw.model.trim() || undefined : undefined,
        sessionKey: `external-panel:${callKind}`,
        timeoutSec: 120,
      })
      setCallOutput(`${formatExternalCallSummary(result.result, result.operation)}\n小票：${result.run.id}`)
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setCallOutput(formatApiError(error))
    }
  }

  const previewMigration = async () => {
    setMigrationState('loading')
    setCallOutput('')
    try {
      const result = await previewHermesMigration({
        fromPath: migrationPath.trim() || undefined,
        timeoutSec: 30,
      })
      setMigrationPreview(result.preview)
      setMigrationState('ready')
    } catch (error) {
      setMigrationState('error')
      setCallOutput(formatApiError(error))
    }
  }

  const runDeveloperWorkflow = async () => {
    const value = developerWorkflowInput.trim()
    setStatus('loading')
    setCallOutput('')
    try {
      const result = await runEvoMapDeveloperWorkflow({
        workflowId: developerWorkflowId,
        query: developerWorkflowId === 'recipe-search' ? value || undefined : undefined,
        type: developerWorkflowId === 'gene-list' ? value || undefined : undefined,
        recipeId: developerWorkflowId === 'reuse-query' ? value || undefined : undefined,
        limit: 6,
      })
      setCallOutput(formatDeveloperWorkflowSummary(result.result, result.operation))
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setCallOutput(formatApiError(error))
    }
  }

  const cards = (connections.length ? connections : discoveries.map(discoveryToConnectionPreview))
  const skillPreview = skills.slice(0, 6)
  const callableSkills = skills.filter((skill) => skill.kind === callKind)
  const openClawCard = cards.find((item) => item.kind === 'openclaw')
  const openClawModelOptions = openClawAvailableModels(openClawCard)
  const openClawSupportsModelOverride = openClawAgentSupportsModelOverride(openClawCard)
  const developerReadWorkflows = developerEnv?.workflows.filter(isCallableDeveloperWorkflow) ?? []
  const selectedDeveloperWorkflow = developerReadWorkflows.find((workflow) => workflow.id === developerWorkflowId)
  const effectiveSelectedCallSkillId = callableSkills.some((skill) => skill.id === selectedCallSkillId)
    ? selectedCallSkillId
    : ''
  const updateRuntimePath = <K extends keyof ExternalRuntimePathForm>(kind: K, key: keyof ExternalRuntimePathForm[K], value: string) => {
    setRuntimePaths((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        [key]: value,
      },
    }))
  }

  return (
    <section className="setting-block external-panel">
      <div className="setting-head">
        <CuteIcon name="soft-settings-gear" />
        <div>
          <strong>开发环境</strong>
          <span>Pi 是主 runtime，OpenClaw / Hermes 作为兼容与迁移来源接入</span>
        </div>
      </div>

      <div className="external-actions">
        <button className="primary-btn" onClick={() => void scan()} disabled={status === 'loading'}>
          <CuteIcon name="soft-search-spark" />{status === 'loading' ? '处理中' : '扫描'}
        </button>
        <button className="ghost-btn lg" onClick={() => void importAll()} disabled={status === 'loading'}>
          <CuteIcon name="soft-import-data" />一键导入
        </button>
      </div>

      <div className="external-paths">
        <RuntimePathCard
          title="OpenClaw 路径"
          fields={[
            ['bin', 'openclaw 或 /opt/homebrew/bin/openclaw'],
            ['home', '~/.openclaw'],
            ['configPath', '~/.openclaw/openclaw.json'],
            ['workspacePath', '~/.openclaw/workspace'],
            ['model', '可选：custom-nowcoding/gpt-5.4'],
          ]}
          values={runtimePaths.openclaw}
          onChange={(key, value) => updateRuntimePath('openclaw', key as keyof ExternalRuntimePathForm['openclaw'], value)}
        />
        <RuntimePathCard
          title="Hermes 路径"
          fields={[
            ['bin', 'hermes 或源码环境里的 hermes'],
            ['home', '~/.hermes'],
            ['configPath', '~/.hermes/config.yaml'],
            ['skillsPath', '~/.hermes/skills'],
          ]}
          values={runtimePaths.hermes}
          onChange={(key, value) => updateRuntimePath('hermes', key as keyof ExternalRuntimePathForm['hermes'], value)}
        />
        <RuntimePathCard
          title="EvoMap Developers"
          fields={[
            ['rootPath', '/Users/baihe/Documents/evocyy/EvoMap-developers'],
          ]}
          values={runtimePaths.evomap}
          onChange={(key, value) => updateRuntimePath('evomap', key as keyof ExternalRuntimePathForm['evomap'], value)}
        />
      </div>

      <div className="external-call external-model-sync">
        <div>
          <strong>OpenClaw 模型覆盖</strong>
          <span>
            {openClawSupportsModelOverride
              ? '可为单次调用选择模型；留空则沿用 OpenClaw 当前默认配置。'
              : '当前 OpenClaw CLI 未暴露单次 --model，调用会沿用 OpenClaw 默认模型。'}
          </span>
        </div>
        <select
          value={runtimePaths.openclaw.model}
          onChange={(event) => updateRuntimePath('openclaw', 'model', event.target.value)}
          disabled={!openClawSupportsModelOverride || openClawModelOptions.length === 0}
          aria-label="OpenClaw 模型覆盖"
        >
          <option value="">沿用默认模型</option>
          {openClawModelOptions.map((model) => (
            <option value={model.key} key={model.key}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div className="external-grid">
        {externalAgentKinds.map((kind) => {
          const connection = cards.find((item) => item.kind === kind)
          const detected = connection?.status === 'imported' || connection?.status === 'detected'
          return (
            <article className={`external-card ${detected ? 'ready' : 'missing'}`} key={kind}>
              <div>
                <strong>{externalAgentLabel(kind)}</strong>
                <span>{connection?.homePath ?? `等待配置 ${kind.toUpperCase()}_HOME`}</span>
              </div>
              <em className={detected ? 'tag mint' : 'tag warn'}>
                {detected ? `${connection?.skills.length ?? 0} skills` : '未导入'}
              </em>
              {connection?.configPath && <small>{connection.configPath}</small>}
              {externalCapabilityChips(connection).length > 0 && (
                <div className="external-capabilities">
                  {externalCapabilityChips(connection).slice(0, 8).map((chip) => (
                    <span key={chip}>{chip}</span>
                  ))}
                </div>
              )}
            </article>
          )
        })}
        <article className={`external-card ${developerEnv && developerEnv.status !== 'missing' ? 'ready' : 'missing'}`}>
          <div>
            <strong>EvoMap Developers</strong>
            <span>{developerEnv?.rootPath ?? '等待发现开发框架仓库'}</span>
          </div>
          <em className={developerEnv?.connected ? 'tag mint' : developerEnv?.configured ? 'tag warn' : 'tag'}>
            {developerEnv?.connected ? '已授权' : developerEnv?.configured ? '待授权' : '未配置'}
          </em>
          {developerEnv?.baseUrl && <small>{developerEnv.baseUrl} · {developerEnv.mode}</small>}
          {developerCapabilityChips(developerEnv).length > 0 && (
            <div className="external-capabilities">
              {developerCapabilityChips(developerEnv).slice(0, 8).map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
          )}
        </article>
      </div>

      <div className="external-call external-agent-call">
        <select
          value={callKind}
          onChange={(e) => {
            setCallKind(e.target.value as ExternalAgentKind)
            setSelectedCallSkillId('')
          }}
        >
          {externalAgentKinds.map((kind) => (
            <option value={kind} key={kind}>{externalAgentLabel(kind)}</option>
          ))}
        </select>
        <select
          value={effectiveSelectedCallSkillId}
          onChange={(e) => setSelectedCallSkillId(e.target.value)}
          aria-label="选择调用 Skill"
        >
          <option value="">默认能力</option>
          {callableSkills.map((skill) => (
            <option value={skill.id} key={skill.id}>{skill.title ?? skill.name}</option>
          ))}
        </select>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void callAgent()
          }}
          placeholder="直接调用 Agent runtime"
        />
        <button className="primary-btn sm" onClick={() => void callAgent()} disabled={status === 'loading' || !message.trim()}>
          <CuteIcon name="soft-send-plane" />调用
        </button>
      </div>

      {callOutput && <pre className="external-output">{callOutput.slice(0, 1200)}</pre>}

      <div className="external-migration external-developer">
        <div>
          <strong>EvoMap 开发工作流</strong>
          <span>{selectedDeveloperWorkflow?.description ?? '读取 developers adapter 暴露的 read workflow。'}</span>
        </div>
        <div className="external-call">
          <select
            value={developerWorkflowId}
            onChange={(e) => setDeveloperWorkflowId(e.target.value as typeof developerWorkflowId)}
          >
            {developerReadWorkflows.map((workflow) => (
              <option value={workflow.id} key={workflow.id}>{workflow.label}</option>
            ))}
            {developerReadWorkflows.length === 0 && <option value="recipe-search">等待授权</option>}
          </select>
          <input
            value={developerWorkflowInput}
            onChange={(e) => setDeveloperWorkflowInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runDeveloperWorkflow()
            }}
            placeholder={developerWorkflowId === 'quickstart-test' ? '本地 npm test，无需输入' : developerWorkflowId === 'reuse-query' ? 'recipeId' : developerWorkflowId === 'gene-list' ? 'gene type，可留空' : '搜索 recipes'}
          />
          <button className="ghost-btn sm" onClick={() => void runDeveloperWorkflow()} disabled={status === 'loading' || !selectedDeveloperWorkflow?.available}>
            <CuteIcon name="soft-search-spark" />运行
          </button>
        </div>
      </div>

      <div className="external-migration">
        <div>
          <strong>Hermes 迁移预览</strong>
          <span>调用 OpenClaw 官方 dry-run，只预览 Hermes 配置、memory、skills 和 MCP 迁移计划。</span>
        </div>
        <div className="external-call">
          <input
            value={migrationPath}
            onChange={(e) => setMigrationPath(e.target.value)}
            placeholder="Hermes 路径，可留空使用 ~/.hermes"
          />
          <button className="ghost-btn sm" onClick={() => void previewMigration()} disabled={migrationState === 'loading'}>
            <CuteIcon name="soft-search-spark" />{migrationState === 'loading' ? '预览中' : '预览'}
          </button>
        </div>
        {migrationPreview && (
          <pre className="external-output">{formatMigrationPreview(migrationPreview).slice(0, 1600)}</pre>
        )}
      </div>

      <div className="external-skills">
        <div className="external-call external-skill-toolbar">
          <div>
            <strong>外部 Skills 同步</strong>
            <span>{skills.length} 个已发现 · {skills.filter((skill) => !skill.syncedSkillId).length} 个待导入</span>
          </div>
          <button className="ghost-btn sm" onClick={() => void syncAllSkills()} disabled={busySkillId === '__all__' || skills.length === 0}>
            <CuteIcon name="soft-import-data" />{busySkillId === '__all__' ? '同步中' : '同步全部'}
          </button>
        </div>
        {skillPreview.map((skill) => (
          <article className="external-skill-row" key={skill.id}>
            <CuteIcon name={externalAgentIcon(skill.kind)} />
            <div>
              <strong>{skill.title ?? skill.name}</strong>
              <span>{externalAgentLabel(skill.kind)} · {skill.description ?? skill.path}</span>
            </div>
            <div className="external-skill-actions">
              <button
                className="ghost-btn sm"
                onClick={() => {
                  setCallKind(skill.kind)
                  setSelectedCallSkillId(skill.id)
                  if (!message.trim()) setMessage(`用「${skill.title ?? skill.name}」帮我处理当前开发目标。`)
                }}
              >
                调用
              </button>
              <button className="ghost-btn sm" onClick={() => void syncSkill(skill)} disabled={busySkillId === '__all__' || busySkillId === skill.id || Boolean(skill.syncedSkillId)}>
                {skill.syncedSkillId ? '已导入' : busySkillId === skill.id ? '导入中' : '导入'}
              </button>
            </div>
          </article>
        ))}
        {status === 'ready' && skills.length === 0 && (
          <p className="external-empty">导入后会在这里看到 Pi / OpenClaw / Hermes 的 SKILL.md。</p>
        )}
      </div>
    </section>
  )
}

function discoveryToConnectionPreview(discovery: ExternalAgentDiscovery): ExternalAgentConnection {
  return {
    id: `preview-${discovery.kind}`,
    kind: discovery.kind,
    status: discovery.detected ? 'detected' : 'missing',
    binPath: discovery.binPath,
    homePath: discovery.homePath,
    configPath: discovery.configPath,
    workspacePath: discovery.workspacePath,
    skillsRootPaths: discovery.skillsRootPaths,
    detectedVersion: discovery.detectedVersion,
    dashboardUrl: discovery.dashboardUrl,
    configSummary: discovery.configSummary,
    skills: discovery.skills,
  }
}

function developerDiscoveryPreview(discovery: Omit<DeveloperEnvironmentConnection, 'id' | 'importedAt' | 'updatedAt'>): DeveloperEnvironmentConnection {
  const now = new Date().toISOString()
  return {
    id: 'preview-evomap-developers',
    importedAt: now,
    updatedAt: now,
    ...discovery,
  }
}

function hydrateRuntimePaths(
  current: ExternalRuntimePathForm,
  connections: ExternalAgentConnection[],
  developerEnv?: DeveloperEnvironmentConnection | null,
): ExternalRuntimePathForm {
  const openclaw = connections.find((item) => item.kind === 'openclaw')
  const hermes = connections.find((item) => item.kind === 'hermes')
  return {
    openclaw: {
      bin: current.openclaw.bin || openclaw?.binPath || '',
      home: current.openclaw.home || openclaw?.homePath || '',
      configPath: current.openclaw.configPath || openclaw?.configPath || '',
      workspacePath: current.openclaw.workspacePath || openclaw?.workspacePath || '',
      model: current.openclaw.model,
    },
    hermes: {
      bin: current.hermes.bin || hermes?.binPath || '',
      home: current.hermes.home || hermes?.homePath || '',
      configPath: current.hermes.configPath || hermes?.configPath || '',
      skillsPath: current.hermes.skillsPath || firstRuntimePath(hermes?.skillsRootPaths) || '',
    },
    evomap: {
      rootPath: current.evomap.rootPath || developerEnv?.rootPath || '',
    },
  }
}

function firstRuntimePath(paths?: string[]): string {
  return paths?.find((item) => item.trim()) ?? ''
}

function runtimePathOverrides(paths: ExternalRuntimePathForm): ExternalAgentConfigOverrides {
  return {
    openclaw: {
      bin: paths.openclaw.bin,
      home: paths.openclaw.home,
      configPath: paths.openclaw.configPath,
      workspacePath: paths.openclaw.workspacePath,
      model: paths.openclaw.model,
    },
    hermes: {
      bin: paths.hermes.bin,
      home: paths.hermes.home,
      configPath: paths.hermes.configPath,
      skillsPath: paths.hermes.skillsPath,
    },
  }
}

function isCallableDeveloperWorkflow(workflow: DeveloperWorkflow): workflow is DeveloperWorkflow & { id: 'recipe-search' | 'gene-list' | 'reuse-query' | 'quickstart-test' } {
  return workflow.id === 'recipe-search' || workflow.id === 'gene-list' || workflow.id === 'reuse-query' || workflow.id === 'quickstart-test'
}

function RuntimePathCard({
  title,
  fields,
  values,
  onChange,
}: {
  title: string
  fields: Array<[string, string]>
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  return (
    <article className="external-path-card">
      <strong>{title}</strong>
      <div className="external-path-grid">
        {fields.map(([key, placeholder]) => (
          <label key={key}>
            <span>{key}</span>
            <input
              value={values[key] ?? ''}
              onChange={(event) => onChange(key, event.target.value)}
              placeholder={placeholder}
            />
          </label>
        ))}
      </div>
    </article>
  )
}

function externalCapabilityChips(connection?: ExternalAgentConnection): string[] {
  const capabilities = connection?.configSummary?.capabilities
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) return []
  const record = capabilities as Record<string, unknown>
  const chips: string[] = []
  if (typeof record.agentSupportsModelOverride === 'boolean') {
    chips.push(record.agentSupportsModelOverride ? 'Model override' : 'No --model')
  }
  const defaultModel = typeof record.defaultModel === 'string' ? record.defaultModel : ''
  if (defaultModel) chips.push(`Default ${defaultModel}`)
  const availableModels = Array.isArray(record.availableModels) ? record.availableModels : []
  if (availableModels.length) chips.push(`Models ${availableModels.length}`)
  const authProviders = Array.isArray(record.authProviders) ? record.authProviders : []
  if (authProviders.length) chips.push(`Auth ${authProviders.length}`)
  const primaryModel = typeof record.primaryModel === 'string' ? record.primaryModel : ''
  if (primaryModel) chips.push(`模型 ${primaryModel}`)
  const providers = Array.isArray(record.modelProviders) ? record.modelProviders.map(String) : []
  if (providers.length) chips.push(`Provider ${providers.slice(0, 3).join(', ')}`)
  const agents = Array.isArray(record.agents) ? record.agents.map(String) : []
  if (agents.length) chips.push(`Agent ${agents.slice(0, 3).join(', ')}`)
  const toolProfile = typeof record.toolProfile === 'string' ? record.toolProfile : ''
  if (toolProfile) chips.push(`Tools ${toolProfile}`)
  const webSearch = record.webSearch && typeof record.webSearch === 'object' && !Array.isArray(record.webSearch)
    ? record.webSearch as Record<string, unknown>
    : undefined
  if (webSearch?.provider) chips.push(`Search ${String(webSearch.provider)}`)
  const channels = Array.isArray(record.enabledChannels) ? record.enabledChannels.map(String) : []
  if (channels.length) chips.push(`Channel ${channels.slice(0, 3).join(', ')}`)
  const plugins = Array.isArray(record.pluginEntries) ? record.pluginEntries.map(String) : []
  if (plugins.length) chips.push(`Plugin ${plugins.slice(0, 3).join(', ')}`)
  const mcpServers = Array.isArray(record.mcpServers) ? record.mcpServers.map(String) : []
  if (mcpServers.length) chips.push(`MCP ${mcpServers.slice(0, 3).join(', ')}`)
  const workspace = typeof record.workspace === 'string' ? record.workspace : ''
  if (workspace) chips.push('Workspace 已接入')
  return chips
}

function openClawAgentSupportsModelOverride(connection?: ExternalAgentConnection): boolean {
  const capabilities = connection?.configSummary?.capabilities
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) return false
  return (capabilities as Record<string, unknown>).agentSupportsModelOverride === true
}

function openClawAvailableModels(connection?: ExternalAgentConnection): Array<{ key: string; label: string }> {
  const capabilities = connection?.configSummary?.capabilities
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) return []
  const models = (capabilities as Record<string, unknown>).availableModels
  if (!Array.isArray(models)) return []
  return models.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const key = typeof record.key === 'string' ? record.key : ''
    if (!key) return []
    const provider = typeof record.provider === 'string' ? record.provider : ''
    const model = typeof record.model === 'string' ? record.model : ''
    const name = typeof record.name === 'string' ? record.name : ''
    const missing = record.missing === true || record.available === false
    const labelParts = [
      name && name !== key ? `${name} · ${key}` : key,
      provider && !key.startsWith(`${provider}/`) ? provider : '',
      model && !key.endsWith(model) ? model : '',
      missing ? '不可用' : '',
    ].filter(Boolean)
    return [{ key, label: labelParts.join(' · ') }]
  })
}

function developerCapabilityChips(environment?: DeveloperEnvironmentConnection | null): string[] {
  if (!environment) return []
  const chips = [
    environment.status === 'imported' ? 'Framework imported' : `Status ${environment.status}`,
    environment.configured ? 'OAuth configured' : 'OAuth missing',
    environment.connected ? 'Token connected' : undefined,
    environment.webhookConfigured ? 'Webhook HMAC' : undefined,
    `${environment.capabilities.filter((item) => item.available).length}/${environment.capabilities.length} caps`,
    `${environment.workflows.filter((item) => item.available).length}/${environment.workflows.length} workflows`,
  ]
  return chips.filter(Boolean) as string[]
}

function ConnectorsPrivacyPanel() {
  const [connector, setConnector] = useState<MessagingConnector | null>(null)
  const [session, setSession] = useState<ConnectorSession | null>(null)
  const [relayContract, setRelayContract] = useState<WeChatRelayContract | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const startAct = useActionState()
  const confirmAct = useActionState()
  const disconnectAct = useActionState()
  const copyAct = useActionState()
  const copyHint = useInlineHint(2200)

  const syncRelayContract = useCallback(async () => {
    const result = await getWeChatRelayContract()
    setRelayContract(result.contract)
    return result.contract
  }, [])

  const refresh = useCallback(async () => {
    setStatus('loading')
    try {
      const [result, contractResult] = await Promise.all([
        listConnectors(),
        getWeChatRelayContract(),
      ])
      setConnector(result.connectors.find((item) => item.kind === 'wechat') ?? null)
      setRelayContract(contractResult.contract)
      setStatus('ready')
    } catch (error) {
      setMessage(formatApiError(error))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (!session || session.status !== 'qr_pending') return
    const timer = window.setInterval(() => {
      getWeChatSession(session.id)
        .then((result) => {
          setConnector(result.connector)
          setSession(result.session)
          void syncRelayContract()
        })
        .catch((error) => {
          setMessage(formatApiError(error))
          setStatus('error')
        })
    }, 4000)
    return () => window.clearInterval(timer)
  }, [session, syncRelayContract])

  const start = () => {
    startAct.run(async () => {
      try {
        const result = await createWeChatSession()
        setConnector(result.connector)
        setSession(result.session)
        await syncRelayContract()
        setStatus('ready')
        setMessage('微信二维码已生成。')
      } catch (error) {
        setMessage(formatApiError(error))
        setStatus('error')
      }
    }, { duration: 300 })
  }

  const confirm = () => {
    if (!session) return
    confirmAct.run(async () => {
      try {
        const result = await confirmWeChatSession(session.id, { displayName: 'EvoPi WeChat' })
        setConnector(result.connector)
        setSession(result.session)
        await syncRelayContract()
        setStatus('ready')
        setMessage('微信连接已确认，Agent 跟进事件会进入进化日志。')
      } catch (error) {
        setMessage(formatApiError(error))
        setStatus('error')
      }
    }, { duration: 300 })
  }

  const disconnect = () => {
    disconnectAct.run(async () => {
      try {
        const result = await disconnectWeChat()
        setConnector(result.connector)
        setSession(null)
        await syncRelayContract()
        setStatus('ready')
        setMessage('微信连接已断开。')
      } catch (error) {
        setMessage(formatApiError(error))
        setStatus('error')
      }
    }, { duration: 300 })
  }

  const copyRelayConfig = () => {
    if (!relayContract) return
    copyAct.run(async () => {
      try {
        const text = JSON.stringify(relayContract.copyConfig, null, 2)
        if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable')
        await navigator.clipboard.writeText(text)
        copyHint.show('Relay 配置已复制。')
      } catch {
        copyHint.show('当前浏览器未开放剪贴板。')
      }
    }, { duration: 300 })
  }

  const connected = connector?.status === 'connected'
  const pending = session?.status === 'qr_pending'
  const expired = connector?.status === 'expired' || session?.status === 'expired'
  const connectedMeta = connected
    ? [
      connector?.connectedIdentity?.displayName ?? 'Agent 可在微信跟进',
      connector?.lastSeenAt ? `最近入站 ${formatEvolutionTime(connector.lastSeenAt)}` : '等待第一条入站消息',
      connector?.connectedIdentity?.chatId ? shortIdentifier(connector.connectedIdentity.chatId) : undefined,
    ].filter(Boolean).join(' · ')
    : '生成二维码后，真实 relay 可用签名回调确认；开发态可用按钮模拟。'

  return (
    <section className="setting-block connector-privacy">
      <div className="setting-head">
        <CuteIcon name="soft-chat-bubble" />
        <div>
          <strong>微信连接器</strong>
          <span>QR 会话、HMAC relay、Agent 跟进能力和 Hermes 风格平台描述</span>
        </div>
      </div>

      <div className="evomap-privacy-summary">
        <article className={connected ? 'ready' : pending ? 'pending' : expired ? 'pending' : ''}>
          <CuteIcon name={connected ? 'soft-success-check' : pending ? 'soft-loading-loop' : 'soft-warning-triangle'} />
          <div>
            <strong>{connected ? '微信已连接' : pending ? '等待扫码确认' : expired ? '二维码已过期' : '微信未连接'}</strong>
            <span>{connectedMeta}</span>
          </div>
          <em className={connected ? 'tag mint' : 'tag'}>{connector?.descriptor?.label ?? 'WeChat'}</em>
        </article>

        <article className="pending">
          <CuteIcon name="soft-refresh-loop" />
          <div>
            <strong>Relay-ready</strong>
            <span>已支持 raw body HMAC 签名的 ping、扫码确认与入站消息，消息会进入 Pi runtime。</span>
          </div>
          <em className="tag">v1</em>
        </article>
      </div>

      {pending && session && (
        <div className="connector-qr-row">
          <img src={session.qrDataUrl} alt="微信连接二维码" />
          <div>
            <strong>验证码 {session.manualCode}</strong>
            <span>{session.expiresInSec}s 后过期 · payload 已写入二维码</span>
          </div>
        </div>
      )}

      {relayContract && (
        <div className="wechat-contract-panel">
          <div className="wechat-contract-head">
            <div>
              <span className="tag mint">Relay Contract</span>
              <strong>{relayContract.label}</strong>
              <small>{relayContract.endpoint}</small>
            </div>
            <button className="ghost-btn sm" onClick={copyRelayConfig} disabled={copyAct.status === 'loading'}>
              <CuteIcon name="soft-document-page" />{copyAct.status === 'loading' ? '复制中' : '复制配置'}
            </button>
          </div>
          <div className="wechat-contract-grid">
            <article>
              <span>签名</span>
              <strong>{relayContract.signature.scheme}</strong>
              <em>{relayContract.signature.headerNames.join(' / ')}</em>
            </article>
            <article>
              <span>Secret</span>
              <strong>{relayContract.signature.secretExposed ? 'Exposed' : '后端持有'}</strong>
              <em>{relayContract.signature.secretLocation}</em>
            </article>
            <article>
              <span>当前会话</span>
              <strong>{relayContract.current.session?.status ?? 'none'}</strong>
              <em>{relayContract.current.session?.id ? shortIdentifier(relayContract.current.session.id) : '等待 QR session'}</em>
            </article>
            <article>
              <span>事件</span>
              <strong>{relayContract.copyConfig.supportedEvents.length}</strong>
              <em>{relayContract.copyConfig.supportedEvents.join(', ')}</em>
            </article>
          </div>
          <div className="wechat-contract-events">
            {relayContract.payloadSchemas.map((schema) => (
              <span key={schema.type}>{schema.type}</span>
            ))}
          </div>
          <pre>{JSON.stringify(relayContract.copyConfig, null, 2)}</pre>
          {copyHint.hint && (
            <div className="inline-hint">
              <CuteIcon name="soft-success-check" />
              {copyHint.hint}
            </div>
          )}
        </div>
      )}

      <div className="privacy-actions evomap-actions">
        <button className="primary-btn" onClick={start} disabled={startAct.status === 'loading'}>
          <CuteIcon name="soft-chat-bubble" />{startAct.status === 'loading' ? '生成中' : connected ? '重新生成二维码' : '生成微信二维码'}
        </button>
        <button className="ghost-btn lg" onClick={confirm} disabled={!pending || confirmAct.status === 'loading'}>
          <CuteIcon name="soft-success-check" />{confirmAct.status === 'loading' ? '确认中' : '确认已扫码'}
        </button>
        <button className="ghost-btn lg" onClick={disconnect} disabled={!connected || disconnectAct.status === 'loading'}>
          <CuteIcon name="soft-lock-keyhole" />{disconnectAct.status === 'loading' ? '断开中' : '断开连接'}
        </button>
        <button className="ghost-btn lg" onClick={() => void refresh()} disabled={status === 'loading'}>
          <CuteIcon name="soft-refresh-loop" />刷新状态
        </button>
      </div>

      {message && (
        <div className="inline-hint">
          <CuteIcon name={status === 'error' ? 'soft-warning-triangle' : 'soft-success-check'} />
          {message}
        </div>
      )}
    </section>
  )
}

function EvoMapPrivacyPanel() {
  const [connection, setConnection] = useState<EvoMapConnectionStatus | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const connectAct = useActionState()
  const revokeAct = useActionState()

  const refresh = async () => {
    setStatus('loading')
    try {
      const result = await getEvoMapConnection()
      setConnection(result)
      setStatus('ready')
    } catch (error) {
      setMessage(formatApiError(error))
      setStatus('error')
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const connect = () => {
    connectAct.run(async () => {
      try {
        const { url } = await getEvoMapConnectUrl()
        window.location.href = url
      } catch (error) {
        setMessage(formatApiError(error))
        setStatus('error')
      }
    }, { duration: 300 })
  }

  const revoke = () => {
    revokeAct.run(async () => {
      try {
        await revokeEvoMapConnection()
        setMessage('EvoMap 授权已撤回，后端 token 已失效。')
        await refresh()
      } catch (error) {
        setMessage(formatApiError(error))
        setStatus('error')
      }
    }, { duration: 400 })
  }

  const scopes = connection?.connection?.scopes ?? []
  const mode = connection?.connection?.mode ?? (connection?.configured ? 'live' : 'unknown')
  const connected = Boolean(connection?.connected)

  return (
    <section className="setting-block evomap-privacy">
      <div className="setting-head">
        <CuteIcon name="soft-shield-check" />
        <div>
          <strong>EvoMap Developers</strong>
          <span>OAuth、scope、test/live 模式和发布边界</span>
        </div>
      </div>

      <div className="evomap-privacy-summary">
        <article className={connected ? 'ready' : 'pending'}>
          <CuteIcon name={connected ? 'soft-success-check' : 'soft-warning-triangle'} />
          <div>
            <strong>{connected ? '已连接 EvoMap' : connection?.configured ? '已配置，等待授权' : '尚未配置 client'}</strong>
            <span>{connected ? connection?.connection?.evomapEmail ?? connection?.connection?.evomapName ?? connection?.connection?.evomapSub ?? 'OAuth token 存在后端' : '审批通过后点击连接完成 OAuth2 + PKCE'}</span>
          </div>
          <em className={mode === 'live' ? 'tag warn' : 'tag mint'}>{mode === 'live' ? 'Live' : mode === 'test' ? 'Test' : 'Unknown'}</em>
        </article>

        <article className="pending">
          <CuteIcon name="soft-lock-keyhole" />
          <div>
            <strong>{mode === 'live' ? 'Live publish 受保护' : 'Test mode 沙箱优先'}</strong>
            <span>{mode === 'live' ? '真实发布必须二次确认；当前 test publish 按钮不会绕过 live gate。' : '测试发布不会进入真实价值池。'}</span>
          </div>
          <em className="tag">PKCE S256</em>
        </article>
      </div>

      <div className="evomap-scope-list">
        {(scopes.length ? scopes : ['gene:read', 'recipe:read', 'recipe:write', 'recipe:publish', 'reuse:query']).map((scope) => (
          <span className="tag" key={scope}>{scope}</span>
        ))}
      </div>

      <div className="privacy-actions evomap-actions">
        <button className="primary-btn" onClick={connect} disabled={connectAct.status === 'loading'}>
          <CuteIcon name="soft-shield-check" />{connectAct.status === 'loading' ? '连接中' : connected ? '重新授权' : '连接 EvoMap'}
        </button>
        <button className="ghost-btn lg" onClick={revoke} disabled={!connected || revokeAct.status === 'loading'}>
          <CuteIcon name="soft-lock-keyhole" />{revokeAct.status === 'loading' ? '撤回中' : '撤回授权'}
        </button>
        <button className="ghost-btn lg" onClick={() => void refresh()} disabled={status === 'loading'}>
          <CuteIcon name="soft-refresh-loop" />刷新状态
        </button>
      </div>

      {(message || status === 'error') && (
        <div className="inline-hint">
          <CuteIcon name={status === 'error' ? 'soft-warning-triangle' : 'soft-success-check'} />
          {message || 'EvoMap 状态读取失败'}
        </div>
      )}
    </section>
  )
}

function PrivacyPage({ initialLevel = 2 }: { initialLevel?: number }) {
  const [level, setLevel] = useState(initialLevel)
  // 一键暂停：可切换的会话内状态
  const [paused, setPaused] = useState(false)
  const pauseAct = useActionState()
  const pauseHint = useInlineHint(2600)
  const logHint = useInlineHint(2400)

  const togglePause = () =>
    pauseAct.run(
      () => {
        setPaused((p) => !p)
        pauseHint.show(paused ? 'EvoPi 已恢复运行' : '已暂停 EvoPi 的自动采集与整理')
      },
      { duration: 700 },
    )

  return (
    <div className="library-page">
      <section className="setting-block">
        <div className="setting-head">
          <CuteIcon name="soft-target-bullseye" />
          <div>
            <strong>协作方式</strong>
            <span>决定 EvoPi 多主动。当前：<b>{collaborationLevels[level].label}模式</b></span>
          </div>
        </div>
        <div className="level-control">
          {collaborationLevels.map((lv, i) => (
            <button
              key={lv.code}
              className={level === i ? 'active' : ''}
              onClick={() => setLevel(i)}
              title={lv.desc}
            >
              <span>{lv.code}</span>
              {lv.label}
            </button>
          ))}
        </div>
        <p className="setting-desc">{collaborationLevels[level].desc}。</p>
      </section>

      <ExternalAgentsPanel />

      <ConnectorsPrivacyPanel />

      <EvoMapPrivacyPanel />

      <section className="setting-block">
        <div className="setting-head">
          <CuteIcon name="soft-shield-check" />
          <div><strong>数据与隐私</strong><span>每项自动化都从可控权限开始</span></div>
        </div>
        <div className="privacy-page">
          {privacyRows.map(([name, state, desc, ok]) => (
            <article className="privacy-row" key={name}>
              <CuteIcon name={ok ? 'soft-shield-check' : 'soft-lock-keyhole'} />
              <div><strong>{name}</strong><span>{desc}</span></div>
              <em className={ok ? 'tag' : 'tag warn'}>{state}</em>
            </article>
          ))}
        </div>
      </section>

      <div className="privacy-actions">
        <button
          className={`pause-button ${pauseAct.status === 'loading' ? 'btn-loading' : paused ? 'btn-done' : ''}`}
          onClick={togglePause}
          disabled={pauseAct.status === 'loading'}
        >
          {pauseAct.status === 'loading'
            ? '处理中…'
            : paused ? '已暂停 · 点击恢复' : '一键暂停 EvoPi'}
        </button>
        <button
          className={`ghost-btn lg ${logHint.hint ? 'btn-loading' : ''}`}
          onClick={() => logHint.show('采集日志面板准备中')}
        >
          <CuteIcon name="soft-log-lines" />查看采集日志
        </button>
      </div>
      {(pauseHint.hint || logHint.hint) && (
        <div className="inline-hint">
          <CuteIcon name={paused ? 'soft-success-check' : 'soft-warning-triangle'} />
          {pauseHint.hint ?? logHint.hint}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   主题切换器
   ============================================================ */
function ThemeSwitcher({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const themes: Array<{ key: Theme; label: string }> = [
    { key: 'cute', label: '可爱线条' },
    { key: 'notion', label: 'Notion 科技' },
    { key: 'glass', label: '玻璃拟态' },
  ]
  return (
    <div className="theme-switcher" role="group" aria-label="切换主题">
      {themes.map((t) => (
        <button
          key={t.key}
          className={theme === t.key ? 'theme-dot active' : 'theme-dot'}
          data-t={t.key}
          onClick={() => setTheme(t.key)}
          title={t.label}
          aria-label={t.label}
          aria-pressed={theme === t.key}
        />
      ))}
    </div>
  )
}

export default App

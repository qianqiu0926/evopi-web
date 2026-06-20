import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './App.css'
import {
  assetLibrary,
  clubCommunities,
  clubPosts,
  coEvolutionLoop,
  collaborationLevels,
  evolutionLogs,
  goals,
  goalSnippets,
  greeting,
  installedSkills,
  journeyMilestones,
  memories,
  memoryCategories,
  navGroups,
  pageMeta,
  pendingCount,
  productAssets,
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
import type { Asset, ChatMsg, Goal, GoalSnippet, ProductAsset, RoomPerson } from './data'
import { GroupedNav } from './components/GroupedNav'
import { PiCorePanel } from './components/PiCorePanel'
import { PetSprite } from './components/PetSprite'
import { InteractiveBg } from './components/InteractiveBg'
import { AuthModal } from './components/AuthModal'
import { EvolutionMindMap } from './components/EvolutionMindMap'
import { EvolutionMapCanvas } from './components/EvolutionMapCanvas'
import { Onboarding } from './components/Onboarding'
import { IconThemeSwap } from './components/IconThemeSwap'
import { TechCursor } from './components/TechCursor'
import { emitPiCoreSignal, type PiCoreSignalKind } from './piCoreSignals'
import {
  ApiError,
  attachEvoMapReference,
  bootstrapEvoMapDeveloperEnvironment,
  callExternalAgent,
  confirmWeChatSession,
  createAppleReminder,
  createEvoMapDraft,
  createPhotoDrop,
  createPiClubPost,
  commentPiClubPost,
  createReceiptRun,
  createSkill,
  createSkillFromReceiptRun,
  createVibeProduct,
  createWeChatSession,
  disconnectWeChat,
  discoverEvoMapDeveloperEnvironment,
  discoverExternalAgents,
  evolutionEventsStreamUrl,
  exportSkillToExternalAgent,
  getEvoMapDeveloperEnvironment,
  getWeChatRelayContract,
  getPiClubState,
  getSkill,
  getWeChatSession,
  importExternalAgents,
  getEvoMapConnectUrl,
  getEvoMapConnection,
  joinPiClubCommunity,
  likePiClubPost,
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
  runPiAgent,
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
  type PiClubProduct,
  type PiClubPost,
  type PiClubState,
  type PiRoomPersona,
  type Skill,
  type WeChatRelayContract,
} from './api'
import { useActionState, useInlineHint, type ActionStatus } from './hooks/useActionState'

/* ============================================================
   类型与基础
   ============================================================ */
type AppPage = 'launch' | 'today' | 'goals' | 'memory' | 'room' | 'club' | 'skills' | 'evolution' | 'privacy'
type Theme = 'cute' | 'notion' | 'glass'
type PiCoreEmotion = 'calm' | 'happy' | 'waiting'
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

type ClubCommentDrafts = Record<string, string>

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
  const [user, setUser] = useState<AuthUser | null>(null) // 登录态
  const [authOpen, setAuthOpen] = useState<Mode>(null) // 'login' | 'register' | null
  const [onboardingFor, setOnboardingFor] = useState<AuthUser | null>(null) // 新用户需先完成预配置
  const [onboardDepth, setOnboardDepth] = useState(2) // 预配置推导的初始介入深度
  const [piEmotion, setPiEmotion] = useState<PiCoreEmotion>('calm')
  const [piBoostUntil, setPiBoostUntil] = useState(0)
  const [inactive, setInactive] = useState(false)

  useEffect(() => { document.body.dataset.theme = theme }, [theme])
  useEffect(() => { document.body.dataset.piEmotion = piEmotion }, [piEmotion])
  useEffect(() => {
    const area = document.querySelector('.page-area')
    if (area) area.scrollTop = 0
  }, [page])

  useEffect(() => {
    let idleTimer = window.setTimeout(() => setInactive(true), 15000)
    const markActive = () => {
      setInactive(false)
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => setInactive(true), 15000)
    }
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll']
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }))
    return () => {
      window.clearTimeout(idleTimer)
      events.forEach((event) => window.removeEventListener(event, markActive))
    }
  }, [])

  useEffect(() => {
    const boost = (duration = 6200) => setPiBoostUntil(Date.now() + duration)
    const onSignal = (event: Event) => {
      const kind = (event as CustomEvent<{ kind?: PiCoreSignalKind }>).detail?.kind
      if (kind === 'delegate') boost(7800)
      else if (kind === 'work' || kind === 'confirm') boost(6200)
      else setInactive(false)
    }
    window.addEventListener('evopi:picore-signal', onSignal)
    return () => window.removeEventListener('evopi:picore-signal', onSignal)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const boosted = Date.now() < piBoostUntil
      if (boosted || page === 'goals' || page === 'club') setPiEmotion('happy')
      else if (inactive && pendingCount > 0) setPiEmotion('waiting')
      else setPiEmotion('calm')
    }, 500)
    return () => window.clearInterval(interval)
  }, [inactive, page, piBoostUntil])

  // 由页面状态推断 PiCore 心情（产品方案语义）
  const mood: PetMood = useMemo(() => {
    if (piEmotion === 'happy') return 'happy'
    if (piEmotion === 'waiting') return 'feeding'
    if (page === 'memory' || page === 'today') return pendingCount > 0 ? 'feeding' : 'idle'
    if (page === 'club') return 'happy'
    return 'idle'
  }, [page, piEmotion])

  // 认证完成：新用户走 onboarding，老用户直接进入
  const handleAuthed = (u: AuthUser, isNew: boolean) => {
    setUser(u)
    setAuthOpen(null)
    if (isNew) setOnboardingFor(u)
  }

  // 新用户预配置：必须完成才能领 Pi 伙伴
  if (onboardingFor) {
    return (
      <>
        <TechCursor active={theme === 'notion'} />
    <IconThemeSwap />
        <Onboarding
          userName={onboardingFor.name}
          onFinish={(r) => {
            setOnboardDepth(r.depth)
            setOnboardingFor(null)
            setPage('today')
          }}
        />
      </>
    )
  }

  if (page === 'launch') {
    return (
      <>
        <TechCursor active={theme === 'notion'} />
    <IconThemeSwap />
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
    <TechCursor active={theme === 'notion'} />
    <IconThemeSwap />
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
      piEmotion={piEmotion}
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
  navCollapsed, setNavCollapsed, mood, piEmotion, user, onboardDepth, onAuth, onLogout,
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
  piEmotion: PiCoreEmotion
  user: AuthUser | null
  onboardDepth: number
  onAuth: (m: 'login' | 'register') => void
  onLogout: () => void
}) {
  const inRoomChat = page === 'room' && activePerson
  const [railCollapsed, setRailCollapsed] = useState(false)
  const headerHint = useInlineHint(2400)

  const createPiReminder = async () => {
    try {
      const result = await createAppleReminder({
        topic: 'Pi 工作进度',
        body: page === 'today'
          ? '我正在整理今日工作台的待确认内容，处理完会回来让你点头。'
          : `我正在处理${pageMeta[page]?.title ?? '当前页面'}里的任务进度，完成后会回来给你确认。`,
        list: 'EvoPi',
        dueInMinutes: 10,
      })
      headerHint.show(result.ok ? `${result.mobileMessage} 已写入提醒事项` : `${result.mobileMessage} 已先记在本地`)
    } catch (error) {
      headerHint.show(`提醒事项写入失败：${formatApiError(error)}`)
    }
  }


  const selectPage = (key: string) => {
    setPage(key as AppPage)
    setActivePerson(null)
    emitPiCoreSignal(key === 'goals' || key === 'club' ? 'work' : 'interaction')
  }

  return (
    <main className={`app-shell ${inRoomChat ? 'wide-center' : ''} ${navCollapsed ? 'nav-collapsed' : ''} ${railCollapsed ? 'rail-collapsed' : ''}`}>
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
              <button className="soft-button" onClick={() => void createPiReminder()}><CuteIcon name="soft-calendar-reminder" />提醒事项</button>
              {headerHint.hint && (
                <div className="inline-hint header-hint"><CuteIcon name="soft-search-spark" />{headerHint.hint}</div>
              )}
            </div>
          </header>
        )}

        {page === 'today' && (
          <TodayPage
            goRoom={() => { setPage('room') }}
            goGoals={() => { setPage('goals') }}
          />
        )}
        {page === 'goals' && <GoalsPage />}
        {page === 'memory' && <MemoryPage />}
        {page === 'room' && (
          <RoomPage activePerson={activePerson} setActivePerson={setActivePerson} />
        )}
        {page === 'club' && <PiClubPage onExit={() => setPage('today')} />}
        {page === 'skills' && <SkillsPage />}
        {page === 'evolution' && <EvolutionPage />}
        {page === 'privacy' && <PrivacyPage initialLevel={onboardDepth} />}
      </section>

      {!inRoomChat && !railCollapsed && (
        <aside className="state-rail">
          <button
            className="rail-collapse-btn"
            onClick={() => setRailCollapsed(true)}
            aria-label="收起右侧 PiCore"
            title="收起右侧 PiCore"
          >
            <CuteIcon name="soft-arrow-right" />
            <span>收起</span>
          </button>
          <PiCorePanel mood={mood} emotion={piEmotion} />
        </aside>
      )}

      {!inRoomChat && railCollapsed && (
        <button
          className="rail-restore-btn"
          onClick={() => setRailCollapsed(false)}
          aria-label="展开右侧 PiCore"
          title="展开右侧 PiCore"
        >
          <CuteIcon name="soft-arrow-left" />
          <span>PiCore</span>
        </button>
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
    club: 'soft-role-users',
    skills: 'soft-settings-gear',
    evolution: 'soft-log-lines',
    privacy: 'soft-privacy-eye',
  }
  return map[page] ?? 'soft-sparkle-twinkle'
}

/* ============================================================
   今日工作台（Notion 风精简）
   ============================================================ */

type WorkbenchContextKind = 'goal' | 'collab' | 'skill'
type SensingSignal = 'idle' | 'collecting' | 'modelPending' | 'attentive' | 'confused' | 'happy' | 'away'
type SensingSource = 'none' | 'vision' | 'voice' | 'multimodal'
type AnalysisStatus = 'idle' | 'collecting' | 'analyzing' | 'ready' | 'error'
type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
type PiCallMode = 'text' | 'observe' | 'voice'

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number
    [index: number]: {
      isFinal?: boolean
      0?: { transcript?: string }
    }
  }
}

type SpeechRecognitionErrorEventLike = Event & {
  error?: string
  message?: string
}

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
  }
}

type WorkbenchContextCard = {
  id: string
  kind: WorkbenchContextKind
  title: string
  desc: string
  meta: string
  seed: string
  cta: string
}

const sensingSourceLabel: Record<SensingSource, string> = {
  none: '未开启',
  vision: '视觉',
  voice: '语音',
  multimodal: '视觉 + 语音',
}

const voiceStatusLabel: Record<VoiceStatus, string> = {
  idle: '待机',
  listening: '正在听',
  processing: '整理语音',
  speaking: 'Pi 回话中',
  error: '需要接入',
}

const sensingSignalMeta: Record<SensingSignal, { label: string; bubble: string; cue: string; mood: PetMood }> = {
  idle: {
    label: '等待授权',
    bubble: '开启视频或语音后，我会把画面、语音和对话语义合并给模型判断。',
    cue: '本地未采集，Pi 保持低打扰待机。',
    mood: 'idle',
  },
  collecting: {
    label: '采集中',
    bubble: '我正在接收你的摄像头和麦克风状态，先不要求你手动选择情绪。',
    cue: '采集链路已启动，等待模型侧分析。',
    mood: 'learning',
  },
  modelPending: {
    label: '等待模型判定',
    bubble: '页面已准备好自动感知入口，正式接入火山引擎后会由模型判断专注、疑虑、开心或离开。',
    cue: '当前不做人工选择，也不冒充情绪识别结果。',
    mood: 'learning',
  },
  attentive: {
    label: '专注协作',
    bubble: '模型判断你在电脑前，我会直接帮你推进任务。',
    cue: 'Pi 会同步你的注意力状态。',
    mood: 'learning',
  },
  confused: {
    label: '疑虑升高',
    bubble: '模型判断你可能有点疑惑，我会先补背景，再给更小的下一步。',
    cue: 'Pi 会放慢解释速度，先补上下文。',
    mood: 'feeding',
  },
  happy: {
    label: '高能灵感',
    bubble: '模型判断你状态很好，像是有了新想法。我会立刻帮你抓住这个方向。',
    cue: '小狗 Pi 会进入兴奋反馈。',
    mood: 'happy',
  },
  away: {
    label: '暂时离开',
    bubble: '模型判断你不在电脑前。我会只做低风险整理，等你回来再确认执行。',
    cue: 'Pi 进入低打扰自动整理模式。',
    mood: 'sleeping',
  },
}

const sensingPromptCue = (
  status: AnalysisStatus,
  source: SensingSource,
  signal: SensingSignal,
  confidence: number,
  transcript: string,
) => {
  if (source === 'none') return '用户尚未开启视觉或语音自动感知。'
  const meta = sensingSignalMeta[signal]
  const base = `自动感知链路：${sensingSourceLabel[source]}；状态：${meta.label}；分析阶段：${status}；置信度参考：${confidence}%。${meta.cue}`
  return transcript ? `${base} 最近语音转写：${transcript}` : base
}

const workbenchContexts: WorkbenchContextCard[] = [
  {
    id: 'career-quarter',
    kind: 'goal',
    title: todayFocus.next,
    desc: '这件事属于「职业成长」目标舱，可以直接回到目标舱继续补素材。',
    meta: '目标舱 · 上次停在述职材料',
    seed: '继续整理我的季度成果素材，先帮我列出还缺哪些证据。',
    cta: '进目标舱',
  },
  {
    id: 'piroom-career',
    kind: 'collab',
    title: '继续和张雪峰聊：考研还是换赛道',
    desc: '上次对话里已经沉淀出“先校准赛道，再判断读研”的核心观点。',
    meta: 'PiRoom · 14:06',
    seed: '继续上次关于考研和换赛道的讨论，帮我把判断条件列清楚。',
    cta: '继续协作',
  },
  {
    id: 'vibe-product',
    kind: 'skill',
    title: '把用户访谈整理成 VibeCoding 小产品',
    desc: '这不像长期目标，可以先协作完成，再决定是否沉淀成 Skill 或归入目标舱。',
    meta: '工作台 · 可沉淀为 Skill',
    seed: '我想做一个用户访谈洞察看板，帮我先梳理产品逻辑。',
    cta: '开始对话',
  },
]

const initialWorkbenchMessages: ChatMsg[] = [
  {
    from: 'them',
    text: '告诉我你现在想做什么。我会先和你聊清楚，再决定是跳到目标舱、留在当前工作台协作，还是把过程沉淀成一个 Skill。',
    time: '现在',
    attached: ['可接入摄像头观察', '可续接历史上下文'],
  },
]

function TodayPage({ goRoom, goGoals }: { goRoom: () => void; goGoals: () => void }) {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>(initialWorkbenchMessages)
  const [activeContextId, setActiveContextId] = useState<string | null>(workbenchContexts[0]?.id ?? null)
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'on' | 'error'>('idle')
  const [cameraError, setCameraError] = useState('')
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [sensingSignal, setSensingSignal] = useState<SensingSignal>('idle')
  const [sensingSource, setSensingSource] = useState<SensingSource>('none')
  const [sensingConfidence, setSensingConfidence] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [piCallMode, setPiCallMode] = useState<PiCallMode>('text')
  const [piVoiceEnabled, setPiVoiceEnabled] = useState(false)
  const [captureHint, setCaptureHint] = useState<'idle' | 'skill' | 'goal'>('idle')
  const chatRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analysisTimerRef = useRef<number | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  // 发送：loading → 清空 + 提示
  const send = useActionState()
  const sendHint = useInlineHint(2600)
  const voiceHint = useInlineHint(2200)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, cameraStatus, sensingSignal, voiceStatus])

  useEffect(() => {
    if (sensingSignal !== 'idle') document.body.dataset.piVision = sensingSignal
    else delete document.body.dataset.piVision
    return () => { delete document.body.dataset.piVision }
  }, [sensingSignal])

  useEffect(() => {
    if (cameraStatus === 'on' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraStatus])

  useEffect(() => {
    return () => {
      if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current)
      recognitionRef.current?.abort()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const activeContext = workbenchContexts.find((item) => item.id === activeContextId) ?? workbenchContexts[0]
  const sensingMeta = sensingSignalMeta[sensingSignal]
  const callMood = voiceStatus === 'speaking' ? 'happy' : sensingMeta.mood

  const captureVideoFrame = () => {
    const video = videoRef.current
    if (!video || cameraStatus !== 'on' || video.videoWidth <= 0 || video.videoHeight <= 0) return ''
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * canvas.width))
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.72)
  }

  const applyCallMode = (mode: PiCallMode) => {
    setPiCallMode(mode)
    setPiVoiceEnabled(mode === 'voice')
    if (mode === 'text') {
      if (cameraStatus === 'on' || cameraStatus === 'requesting') stopCamera()
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
      setVoiceStatus('idle')
      setVoiceTranscript('')
    }
    if (mode === 'observe') {
      if (cameraStatus === 'on') {
        stopCamera()
        void startCamera('observe')
      }
      setSensingSource(cameraStatus === 'on' ? 'vision' : 'none')
      setPiVoiceEnabled(false)
    }
    if (mode === 'voice') {
      if (cameraStatus === 'on') {
        stopCamera()
        void startCamera('voice')
      }
      setSensingSource(cameraStatus === 'on' ? 'multimodal' : 'none')
    }
  }

  const startCamera = async (mode: PiCallMode = piCallMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error')
      setCameraError('当前浏览器不支持摄像头调用。')
      setAnalysisStatus('error')
      return
    }
    setCameraStatus('requesting')
    setCameraError('')
    setAnalysisStatus('collecting')
    setSensingSignal('collecting')
    setSensingSource(mode === 'voice' ? 'multimodal' : 'vision')
    setSensingConfidence(18)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360 },
        audio: mode === 'voice',
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraStatus('on')
      setAnalysisStatus('analyzing')
      setSensingSignal('modelPending')
      setSensingSource(mode === 'voice' ? 'multimodal' : 'vision')
      setSensingConfidence(42)
      voiceHint.show(mode === 'voice' ? '视频对话已开启，你可以直接说出任务。' : '视频观察已开启，Pi 会结合画面理解你的工作状态。')
      if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current)
      analysisTimerRef.current = window.setTimeout(() => {
        setAnalysisStatus('ready')
        setSensingSignal('modelPending')
        setSensingConfidence(56)
      }, 900)
    } catch (error) {
      setCameraStatus('error')
      setAnalysisStatus('error')
      setSensingSignal('idle')
      setSensingSource('none')
      setSensingConfidence(0)
      setCameraError(formatApiError(error))
    }
  }

  const stopCamera = () => {
    if (analysisTimerRef.current !== null) {
      window.clearTimeout(analysisTimerRef.current)
      analysisTimerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraStatus('idle')
    setAnalysisStatus('idle')
    setSensingSignal('idle')
    setSensingSource(voiceStatus === 'idle' ? 'none' : 'voice')
    setSensingConfidence(0)
    delete document.body.dataset.piVision
  }

  const startVoiceInput = () => {
    emitPiCoreSignal('interaction')
    if (piCallMode !== 'voice') {
      setPiCallMode('voice')
      setPiVoiceEnabled(true)
    }
    if (voiceStatus === 'listening') {
      recognitionRef.current?.stop()
      setVoiceStatus('processing')
      return
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceStatus('error')
      setSensingSource(cameraStatus === 'on' ? 'multimodal' : 'voice')
      setAnalysisStatus(cameraStatus === 'on' ? 'ready' : 'error')
      setSensingSignal(cameraStatus === 'on' ? 'modelPending' : 'idle')
      voiceHint.show('当前浏览器暂不支持语音转写，你可以先用文字说明任务。')
      return
    }
    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false
    setVoiceTranscript('')
    setVoiceStatus('listening')
    setSensingSource(cameraStatus === 'on' ? 'multimodal' : 'voice')
    setAnalysisStatus('collecting')
    setSensingSignal('collecting')
    setSensingConfidence(26)
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < event.results.length; i += 1) {
        const part = event.results[i]?.[0]?.transcript ?? ''
        if (event.results[i]?.isFinal) finalText += part
        else interimText += part
      }
      const transcript = (finalText || interimText).trim()
      setVoiceTranscript(transcript)
      if (transcript) setText((current) => current.trim() ? current : transcript)
      if (finalText.trim()) {
        setVoiceStatus('processing')
        setAnalysisStatus('ready')
        setSensingSignal('modelPending')
        setSensingConfidence(58)
      }
    }
    recognition.onerror = (event) => {
      setVoiceStatus('error')
      setAnalysisStatus(cameraStatus === 'on' ? 'ready' : 'error')
      setSensingSignal(cameraStatus === 'on' ? 'modelPending' : 'idle')
      voiceHint.show(event.message || `语音识别暂不可用：${event.error ?? '未知错误'}`)
    }
    recognition.onend = () => {
      setVoiceStatus((current) => (current === 'listening' ? 'processing' : current === 'error' ? 'error' : 'idle'))
      setAnalysisStatus((current) => (current === 'collecting' ? 'ready' : current))
      setSensingSignal((current) => (current === 'collecting' ? 'modelPending' : current))
    }
    try {
      recognition.start()
    } catch (error) {
      setVoiceStatus('error')
      voiceHint.show(formatApiError(error))
    }
  }

  const continueContext = (context: WorkbenchContextCard) => {
    emitPiCoreSignal(context.kind === 'goal' ? 'work' : 'interaction')
    setActiveContextId(context.id)
    if (context.kind === 'goal') {
      setMessages((current) => [
        ...current,
        {
          from: 'them',
          text: `这件事属于目标舱。我可以带你回「职业成长」继续推进，也可以先在这里帮你把问题拆成小票。`,
          time: '现在',
          attached: ['目标舱', context.title],
        },
      ])
      return
    }
    setText(context.seed)
    setMessages((current) => [
      ...current,
      {
        from: 'them',
        text: `我把上次上下文放进来了。你可以直接发送，我会接着这个方向继续问你关键问题。`,
        time: '现在',
        attached: [context.meta],
      },
    ])
  }

  const speakPiReply = (reply: string) => {
    if (piCallMode !== 'voice' || !piVoiceEnabled) return
    if (!('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(reply.replace(/\*/g, ''))
    utterance.lang = 'zh-CN'
    utterance.rate = 1
    utterance.pitch = 1.04
    utterance.onend = () => setVoiceStatus('idle')
    utterance.onerror = () => setVoiceStatus('idle')
    window.speechSynthesis.cancel()
    setVoiceStatus('speaking')
    window.speechSynthesis.speak(utterance)
  }

  const onSend = () => {
    const clean = text.trim()
    if (!clean) return
    emitPiCoreSignal(activeContext?.kind === 'goal' ? 'work' : 'delegate')
    const contextText = activeContext ? `当前续接上下文：${activeContext.title}。${activeContext.desc}` : '没有选择历史上下文。'
    const sensingText = sensingPromptCue(analysisStatus, sensingSource, sensingSignal, sensingConfidence, voiceTranscript)
    const visualFrameDataUrl = cameraStatus === 'on' ? captureVideoFrame() : ''
    const modeText = piCallMode === 'voice'
      ? '当前是视频对话模式。用户可能通过语音或文字表达任务，你需要像 1V1 导师一样先复述任务，再推进下一步。只有用户明确确认后，才说开始执行。'
      : piCallMode === 'observe'
        ? '当前是开视频观察 + 手写对话模式。请结合画面判断用户是否在电脑前、是否疑惑、疲惫、专注或兴奋，但不要输出技术字段，不要声称百分百准确。Pi 默认不说话，只在文字里温和提示观察到的协作节奏。'
        : '当前是文字协作模式。不要假装看到了画面或听到了语音。'

    setMessages((current) => [...current, { from: 'me', text: clean, time: '现在' }])
    setText('')
    setCaptureHint('idle')
    send.run(async () => {
      try {
        const result = await runPiAgent({
          workspaceTitle: 'EvoPi 今日工作台',
          goalName: activeContext?.kind === 'goal' ? '职业成长' : undefined,
          sessionKey: 'today-eve-workbench',
          message: [
            '你是 EvoPi，用户的自进化个人助理。',
            '请用中文自然回复，不要使用星号符号。',
            '你的任务不是只给建议，而是先对话协作，判断这件事应该进入目标舱、继续在工作台完成，还是沉淀成 Skill。',
            contextText,
            modeText,
            sensingText,
            `用户说：${clean}`,
          ].join('\n'),
          visualFrameDataUrl: visualFrameDataUrl || undefined,
          timeoutSec: 30,
        })
        const reply = externalAgentOutput(result.result) || '我收到你的想法了。我们先把目标、约束和下一步动作拆清楚。'
        setMessages((current) => [...current, { from: 'them', text: reply, time: '现在' }])
        if (piCallMode === 'voice' && piVoiceEnabled) speakPiReply(reply)
        setCaptureHint(activeContext?.kind === 'goal' ? 'goal' : 'skill')
      } catch (error) {
        setMessages((current) => [
          ...current,
          {
            from: 'them',
            text: `后端暂时没有回复：${formatApiError(error)}。我先在本地帮你记下这件事，等连接恢复后继续处理。`,
            time: '现在',
          },
        ])
      }
    }, { duration: 0 })
  }

  const captureAsSkill = () => {
    emitPiCoreSignal('confirm')
    setCaptureHint('skill')
    setMessages((current) => [
      ...current,
      {
        from: 'them',
        text: '可以。我会把这次协作里可复用的步骤整理成 Skill 草稿，等你确认后再安装到技能中心。',
        time: '现在',
        attached: ['Skill 草稿', activeContext?.title ?? '当前任务'],
      },
    ])
    sendHint.show('已生成 Skill 沉淀意向，待确认后写入技能中心')
  }

  const captureAsGoal = () => {
    emitPiCoreSignal('work')
    setCaptureHint('goal')
    setMessages((current) => [
      ...current,
      {
        from: 'them',
        text: '可以。我会先把这件事归纳成长期维护事项，并建议放入目标舱。你进入目标舱后可以继续拆里程碑。',
        time: '现在',
        attached: ['目标舱候选'],
      },
    ])
    sendHint.show('已准备归纳到目标舱')
  }

  return (
    <div className="today-workbench">
      <section className="eve-workbench-panel">
        <div className="eve-workbench-copy">
          <span className="tag blue">EvoPi 工作台</span>
          <h2>告诉 EvoPi 你现在想做什么</h2>
          <p>先在这里对话协作。属于长期目标的事会回到目标舱，不属于目标舱的事先做完，再决定是否沉淀成 Skill 或长期维护目标。</p>
        </div>

        <div className="pi-call-mode-switch" aria-label="选择协作方式">
          {([
            ['text', '文字协作', 'soft-chat-bubble'],
            ['observe', '开视频观察', 'soft-privacy-eye'],
            ['voice', '视频对话', 'soft-microphone-voice'],
          ] as Array<[PiCallMode, string, CuteIconName]>).map(([mode, label, icon]) => (
            <button
              className={piCallMode === mode ? 'active' : ''}
              key={mode}
              onClick={() => applyCallMode(mode)}
              type="button"
            >
              <CuteIcon name={icon} />
              {label}
            </button>
          ))}
        </div>

        <div className="eve-workbench-grid">
          <div className="eve-chat-card">
            <div className="eve-chat-stream" ref={chatRef}>
              {messages.map((msg, index) => (
                <article className={`eve-message ${msg.from === 'me' ? 'from-me' : 'from-pi'}`} key={`${msg.time}-${index}`}>
                  <div className="eve-message-avatar">
                    <CuteIcon name={msg.from === 'me' ? 'soft-role-users' : 'soft-sparkle-twinkle'} />
                  </div>
                  <div className="eve-message-body">
                    <p>{msg.text}</p>
                    {msg.attached && (
                      <div className="eve-message-tags">
                        {msg.attached.map((item) => <span key={item}>{item}</span>)}
                      </div>
                    )}
                    <em>{msg.time}</em>
                  </div>
                </article>
              ))}
              {captureHint !== 'idle' && (
                <article className="eve-capture-bubble">
                  <CuteIcon name={captureHint === 'skill' ? 'soft-settings-gear' : 'soft-goal-flag'} />
                  <div>
                    <strong>{captureHint === 'skill' ? '是否整理成 Skill？' : '是否归纳到目标舱？'}</strong>
                    <span>{captureHint === 'skill' ? '这次协作里有可复用流程，可以确认后安装到技能中心。' : '这件事已经像长期事项，可以进入目标舱做里程碑维护。'}</span>
                  </div>
                </article>
              )}
            </div>

            <div className="eve-chat-input">
              <CuteIcon name="soft-sparkle-twinkle" />
              <textarea
                placeholder="比如：我现在想做一个用户访谈洞察看板，帮我先想清楚产品逻辑。"
                value={text}
                rows={2}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSend()
                  }
                }}
              />
              <button
                className={`send-button ${statusCls(send.status)}`}
                aria-label="发送"
                onClick={onSend}
                disabled={send.status === 'loading' || !text.trim()}
              >
                {send.status === 'loading' ? <span className="btn-spinner" /> : <CuteIcon name="soft-send-plane" />}
              </button>
            </div>
          </div>

          <aside className={`eve-vision-card ${cameraStatus === 'on' ? 'is-live' : ''}`}>
            <div className="eve-vision-head">
              <strong>和小狗 Pi 1V1</strong>
              <span>{piCallMode === 'voice' ? '说清任务，Pi 复述确认后再开始做。' : piCallMode === 'observe' ? '开着视频写字聊，Pi 只观察节奏不抢话。' : '安静文字协作，需要时再开启视频。'}</span>
            </div>
            <div className="eve-vision-preview">
              {cameraStatus === 'on' ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted />
                  <div className="pet-video-avatar">
                    <PetSprite mood={callMood} size={86} />
                    <span>{piCallMode === 'voice' ? voiceStatusLabel[voiceStatus] : '陪你看着'}</span>
                  </div>
                </>
              ) : (
                <div className="eve-camera-placeholder">
                  <PetSprite mood={callMood} size={82} />
                  <strong>{cameraStatus === 'requesting' ? '等待授权' : 'Pi 在这里陪你'}</strong>
                  <span>{piCallMode === 'voice' ? '开启后直接说任务。' : piCallMode === 'observe' ? '开启后用文字聊，Pi 会参考画面。' : '先从文字开始也可以。'}</span>
                </div>
              )}
            </div>
            <div className="eve-vision-actions">
              <button
                className="primary-btn sm"
                onClick={() => {
                  const nextMode = piCallMode === 'text' ? 'observe' : piCallMode
                  if (cameraStatus === 'on') stopCamera()
                  else {
                    setPiCallMode(nextMode)
                    void startCamera(nextMode)
                  }
                }}
              >
                <CuteIcon name={cameraStatus === 'on' ? 'soft-success-check' : 'soft-privacy-eye'} />
                {cameraStatus === 'on' ? '结束视频' : cameraStatus === 'requesting' ? '请求中' : '开启视频'}
              </button>
              {piCallMode === 'voice' && (
                <button className={`ghost-btn sm ${voiceStatus === 'listening' ? 'btn-loading' : ''}`} onClick={startVoiceInput}>
                  <CuteIcon name="soft-microphone-voice" />
                  {voiceStatus === 'listening' ? '停止听我说' : '开始说话'}
                </button>
              )}
              {piCallMode !== 'text' && (
                <button
                  className={`ghost-btn sm ${piVoiceEnabled ? 'active' : ''}`}
                  onClick={() => setPiVoiceEnabled((current) => !current)}
                  type="button"
                >
                  <CuteIcon name={piVoiceEnabled ? 'soft-waveform-audio' : 'soft-privacy-eye'} />
                  {piVoiceEnabled ? 'Pi 说话' : '静音观察'}
                </button>
              )}
            </div>
            {voiceTranscript && piCallMode === 'voice' && (
              <div className="voice-transcript compact">
                <CuteIcon name="soft-microphone-voice" />
                <span>{voiceTranscript}</span>
              </div>
            )}
            {cameraStatus === 'error' && (
              <div className="inline-hint"><CuteIcon name="soft-warning-triangle" />{cameraError || '摄像头暂不可用'}</div>
            )}
          </aside>
        </div>
      </section>

      {voiceHint.hint && (
        <div className="inline-hint"><CuteIcon name="soft-microphone-voice" />{voiceHint.hint}</div>
      )}
      {sendHint.hint && (
        <div className="inline-hint"><CuteIcon name="soft-success-check" />{sendHint.hint}</div>
      )}

      <section className="context-continuation">
        <div className="section-title">
          <CuteIcon name="soft-bookmark-study" />
          <strong>你可能想继续这些上下文</strong>
          <span>按任务归路由，不再只是今日聚焦</span>
        </div>
        <div className="context-card-grid">
          {workbenchContexts.map((context) => (
            <article className={`context-card ${activeContextId === context.id ? 'active' : ''}`} key={context.id}>
              <div>
                <em>{context.meta}</em>
                <strong>{context.title}</strong>
                <p>{context.desc}</p>
              </div>
              <div className="context-actions">
                {context.kind === 'goal' ? (
                  <button className="primary-btn sm" onClick={() => {
                    emitPiCoreSignal('work')
                    goGoals()
                  }}>
                    <CuteIcon name="soft-goal-flag" />{context.cta}
                  </button>
                ) : (
                  <button className="primary-btn sm" onClick={() => continueContext(context)}>
                    <CuteIcon name="soft-chat-bubble" />{context.cta}
                  </button>
                )}
                <button className="ghost-btn sm" onClick={() => {
                  setActiveContextId(context.id)
                  setText(context.seed)
                }}>
                  放到输入框
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="eve-capture-actions">
        <button className="ghost-btn sm" onClick={captureAsSkill}>
          <CuteIcon name="soft-settings-gear" />整理成 Skill
        </button>
        <button className="ghost-btn sm" onClick={captureAsGoal}>
          <CuteIcon name="soft-goal-flag" />归纳到目标舱
        </button>
        <button className="ghost-btn sm" onClick={goRoom}>
          <CuteIcon name="soft-chat-bubble" />进入 PiRoom 深聊
        </button>
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
  const [showEvoMap, setShowEvoMap] = useState(false)
  const [showRuntime, setShowRuntime] = useState(false)
  const [showSkillTools, setShowSkillTools] = useState(false)
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

      <section className="ws-compact-accordion">
        <button className="ws-accordion-head" onClick={() => setShowEvoMap((v) => !v)} aria-expanded={showEvoMap}>
          <span className="tag pink">EvoMap</span>
          <strong>可复用经验</strong>
          <span>{showEvoMap ? '收起' : '展开'}</span>
        </button>
        {showEvoMap && (
          <div className="ws-accordion-body">
            <div className="ws-evomap-head">
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
                  <span>正在读取资料...</span>
                </div>
              )}
              {evomapStatus === 'ready' && evomapRecipes.length === 0 && (
                <div className="ws-evomap-empty">
                  <CuteIcon name="soft-search-spark" />
                  <span>这次搜索没有返回内容。</span>
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
                          <span>暂无关联。</span>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section className="ws-compact-accordion">
        <button className="ws-accordion-head" onClick={() => setShowRuntime((v) => !v)} aria-expanded={showRuntime}>
          <span className="tag blue">执行</span>
          <strong>调用执行环境</strong>
          <span>{showRuntime ? '收起' : '展开'}</span>
        </button>
        {showRuntime && (
          <div className="ws-accordion-body">
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
                <span>执行环境暂时不可用，可稍后再试。</span>
              </div>
            )}
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
          <button className="ghost-btn sm ws-skill-toggle" onClick={() => setShowSkillTools((value) => !value)} aria-expanded={showSkillTools}>
            <CuteIcon name="soft-settings-gear" />{showSkillTools ? '收起高级' : skillSaved ? '沉淀已完成' : '高级沉淀'}
          </button>
        </header>

        {showSkillTools && (
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
        )}

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
  const [memoryProducts, setMemoryProducts] = useState<PiClubProduct[]>(() => productAssets.map(productAssetToClubProduct))
  // 会话内保持的处理结果：按 title 记录（刷新才重置，符合 mock 边界）
  const [handled, setHandled] = useState<Record<string, 'confirmed' | 'merged' | 'ignored'>>({})

  const filtered = memories.filter(
    (m) => (cat === '全部' || m.cat === cat) && m.title.includes(query),
  )
  const filteredProducts = memoryProducts.filter((product) => (
    product.name.includes(query) || product.desc.includes(query) || product.community?.includes(query)
  ))

  useEffect(() => {
    let cancelled = false
    getPiClubState()
      .then((next) => {
        if (!cancelled && next.products?.length) setMemoryProducts(next.products)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

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
      {cat === '产品' && (
        <section className="memory-product-section">
          <div className="skill-section-title"><CuteIcon name="soft-sparkle-twinkle" />VibeCoding 产品资产</div>
          <div className="club-product-list">
            {filteredProducts.map((product) => (
              <article className="club-product-card" key={product.id}>
                <CuteIcon name="soft-sparkle-twinkle" />
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.desc}</p>
                  <span>{product.url}</span>
                  <div className="club-product-tags">
                    {product.stack.slice(0, 3).map((tag) => <em className="tag" key={tag}>{tag}</em>)}
                  </div>
                </div>
                <em className="tag mint">{productStatusLabel(product.status)}</em>
              </article>
            ))}
          </div>
        </section>
      )}
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

type InspirationNote = {
  id: string
  text: string
  source: 'me' | 'them' | 'research'
  time: string
}

type ResearchItem = {
  id: string
  title: string
  source: string
  angle: string
  quote: string
  tag: string
}

const inspirationSeed: InspirationNote[] = [
  {
    id: 'seed-purpose',
    text: '考研是手段不是目的，真正要判断的是我是否要换到更看好的赛道继续做产品。',
    source: 'them',
    time: '14:06',
  },
]

const researchSuggestions: ResearchItem[] = [
  {
    id: 'r-product-career',
    title: '产品经理转赛道时，复用能力比学历标签更快产生迁移价值',
    source: '职业访谈摘录',
    angle: '支持“先换赛道再评估读研”的论据',
    quote: '需求拆解、用户访谈、跨团队推进通常能直接迁移到新行业。',
    tag: '迁移能力',
  },
  {
    id: 'r-grad-cost',
    title: '两到三年的收入下降需要被量化成机会成本，而不是只看录取概率',
    source: '教育投资分析',
    angle: '反驳“读研天然更稳”的观点',
    quote: '决策应同时比较现金流、行业入口、个人学习曲线和未来岗位密度。',
    tag: '机会成本',
  },
  {
    id: 'r-sector-fit',
    title: '换方向前先做 3 个低成本行业实验，可以避免把焦虑误判成志向',
    source: '创业者复盘',
    angle: '把观点落成行动验证',
    quote: '访谈、兼职项目、公开作品是验证行业真实吸引力的低风险路径。',
    tag: '实验验证',
  },
]

function buildInspirationTitle(notes: InspirationNote[]) {
  if (!notes.length) return '等待你挑一句值得留下的话'
  const text = notes.map((note) => note.text).join(' ')
  if (text.includes('赛道') || text.includes('产品')) return '职业选择：先校准赛道，再决定是否读研'
  if (text.includes('成本') || text.includes('收入')) return '决策成本：把情绪判断换成可比较账本'
  return '这一轮 PiRoom 对话的思想沉淀'
}

function buildInspirationPoints(notes: InspirationNote[]) {
  if (!notes.length) return ['从对话中选中关键句，Pi 会把它们串成可写入记忆库的主题。']
  const points = [
    '核心问题不是“要不要换方向”，而是“什么路径能把现有产品能力迁移到更看好的赛道”。',
  ]
  if (notes.some((note) => note.text.includes('成本') || note.text.includes('收入'))) {
    points.push('读研的价值需要和机会成本一起算，避免只被身份标签或安全感牵引。')
  }
  if (notes.some((note) => note.source === 'research')) {
    points.push('外部资料补上了论据：先做低成本行业实验，再决定是否投入长期路径。')
  }
  if (notes.length >= 3) {
    points.push('下一步可以把这组洞察写成“赛道验证清单”，沉入职业成长目标舱。')
  }
  return points
}

function noteSourceLabel(source: InspirationNote['source']) {
  if (source === 'me') return '我的表达'
  if (source === 'them') return '对方观点'
  return '资料论据'
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
  const [searchQuery, setSearchQuery] = useState('职业转赛道 读研 机会成本')
  const [selectedResearch, setSelectedResearch] = useState<Set<string>>(new Set(['r-product-career']))
  const [inspirations, setInspirations] = useState<InspirationNote[]>(inspirationSeed)
  const [memorySaved, setMemorySaved] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const filteredResearch = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return researchSuggestions
    return researchSuggestions.filter((item) => {
      const haystack = `${item.title} ${item.source} ${item.angle} ${item.quote} ${item.tag}`.toLowerCase()
      return query.split(/\s+/).some((word) => haystack.includes(word))
    })
  }, [searchQuery])

  const inspirationTitle = useMemo(() => buildInspirationTitle(inspirations), [inspirations])
  const inspirationPoints = useMemo(() => buildInspirationPoints(inspirations), [inspirations])
  const primaryResearch = filteredResearch[0]
  const researchCandidates = filteredResearch.slice(1, 4)
  const latestNotes = inspirations.slice(-3)

  useEffect(() => {
    document.querySelector('.page-area')?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [person.id])

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

  const collectMessage = (msg: ChatMsg, index: number) => {
    const id = `msg-${index}`
    setMemorySaved(false)
    setInspirations((prev) => {
      if (prev.some((item) => item.id === id)) return prev
      return [...prev, { id, text: msg.text, source: msg.from, time: msg.time }]
    })
  }

  const toggleResearch = (id: string) => {
    setSelectedResearch((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const collectResearch = (item: ResearchItem) => {
    setMemorySaved(false)
    setSelectedResearch((prev) => new Set(prev).add(item.id))
    setInspirations((prev) => {
      const id = `research-${item.id}`
      if (prev.some((note) => note.id === id)) return prev
      return [...prev, { id, text: `${item.title}：${item.quote}`, source: 'research', time: item.source }]
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
          <CuteIcon name="soft-folder-tab" />{showAssets ? '收起沉淀' : '展开沉淀'}
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
              <button
                className="capture-arrow"
                onClick={() => collectMessage(msg, i)}
                aria-label="沉淀到右侧灵感专题"
                title="沉淀到右侧灵感专题"
              >
                <CuteIcon name="soft-arrow-right" />
              </button>
            </div>
          ))}
        </div>

        {showAssets && (
          <aside className="thinking-rail">
            <section className="research-desk">
              <div className="rail-section-head">
                <div>
                  <span className="rail-eyebrow">找论据</span>
                  <strong>资料借鉴窗</strong>
                </div>
                <em className="tag blue">{selectedResearch.size} 条可引用</em>
              </div>
              <label className="research-search">
                <CuteIcon name="soft-search-spark" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜论据、案例或反驳资料"
                />
              </label>
              <div className="research-focus">
                {primaryResearch ? (
                  <article className={`research-card primary ${selectedResearch.has(primaryResearch.id) ? 'selected' : ''}`}>
                    <button className="research-check" onClick={() => toggleResearch(primaryResearch.id)} aria-label="选中资料">
                      {selectedResearch.has(primaryResearch.id) ? '✓' : '+'}
                    </button>
                    <div>
                      <span>{primaryResearch.source} · {primaryResearch.tag}</span>
                      <strong>{primaryResearch.title}</strong>
                      <p>{primaryResearch.angle}</p>
                      <button className="mini-link" onClick={() => collectResearch(primaryResearch)}>
                        <CuteIcon name="soft-arrow-right" />收进沉淀
                      </button>
                    </div>
                  </article>
                ) : (
                  <div className="research-empty">换个关键词试试，Pi 会把合适资料放在这里。</div>
                )}
              </div>
              {researchCandidates.length > 0 && (
                <div className="research-candidates">
                  {researchCandidates.map((item) => (
                    <button
                      className={`research-candidate ${selectedResearch.has(item.id) ? 'selected' : ''}`}
                      key={item.id}
                      onClick={() => collectResearch(item)}
                    >
                      <span>{item.tag}</span>
                      <strong>{item.title}</strong>
                    </button>
                  ))}
                </div>
              )}
              <div className="context-strip">
                <div className="asset-mini-head">
                  <CuteIcon name="soft-folder-tab" />
                  <strong>带入当前对话</strong>
                  <span>{selectedAssets.size} 份</span>
                </div>
                <div className="asset-chip-list">
                  {assetLibrary.slice(0, 5).map((a) => (
                    <button
                      className={`asset-chip ${selectedAssets.has(a.id) ? 'selected' : ''}`}
                      key={a.id}
                      onClick={() => toggleAsset(a.id)}
                    >
                      <CuteIcon name={assetIcon(a.kind)} />
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="inspiration-desk">
              <div className="rail-section-head">
                <div>
                  <span className="rail-eyebrow">沉淀成专题</span>
                  <strong>Pi 思想沉淀</strong>
                </div>
                <CuteIcon name="soft-idea-bulb" />
              </div>
              <div className="memory-topic">
                <div>
                  <span>本轮灵感专题</span>
                  <h3>{inspirationTitle}</h3>
                </div>
                <em>{inspirations.length} 条素材</em>
              </div>
              <div className="inspiration-thread">
                {latestNotes.map((note, index) => (
                  <article className="inspiration-note" key={note.id}>
                    <span className="note-index">{String(inspirations.length - latestNotes.length + index + 1).padStart(2, '0')}</span>
                    <div>
                      <em>{noteSourceLabel(note.source)} · {note.time}</em>
                      <p>{note.text}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="pi-organizer">
                <strong><CuteIcon name="soft-sparkle-edit" />Pi 自动整理</strong>
                <ul>
                  {inspirationPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <button className={`save-memory-btn ${memorySaved ? 'saved' : ''}`} onClick={() => setMemorySaved(true)}>
                <CuteIcon name={memorySaved ? 'soft-success-check' : 'soft-database-stack'} />
                {memorySaved ? '已写入 Pi 记忆库' : '写入 Pi 记忆库'}
              </button>
            </section>
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
    case 'product': return 'soft-sparkle-twinkle'
  }
}

/* ============================================================
   PiClub：朋友圈 / 组织 / 相册 / VibeCoding
   ============================================================ */
function PiClubPage({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<PiClubState>(() => ({
    communities: clubCommunities,
    posts: clubPosts,
    photoDrops: [],
    products: productAssets.map(productAssetToClubProduct),
  }))
  const [clubState, setClubState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [postText, setPostText] = useState('把今天整理好的照片和研究进展发一条朋友圈，语气自然一点。')
  const [postTitle, setPostTitle] = useState('Pi 的今日进展')
  const [selectedCommunity, setSelectedCommunity] = useState('AI 学术共研组')
  const [photoTitle, setPhotoTitle] = useState('今天的现场照片')
  const [photoCount, setPhotoCount] = useState(9)
  const [vibeName, setVibeName] = useState('用户访谈洞察看板')
  const [vibeBrief, setVibeBrief] = useState('把访谈记录自动整理成痛点、证据、下一步实验，并生成一个可分享的小网站。')
  const [postComposerOpen, setPostComposerOpen] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => new Set())
  const [openComments, setOpenComments] = useState<Set<string>>(() => new Set())
  const [commentDrafts, setCommentDrafts] = useState<ClubCommentDrafts>({})
  const [publishingProductId, setPublishingProductId] = useState<string | null>(null)
  const actionHint = useInlineHint(3200)
  const postAction = useActionState()
  const photoAction = useActionState()
  const vibeAction = useActionState()

  useEffect(() => {
    let cancelled = false
    getPiClubState()
      .then((next) => {
        if (cancelled) return
        setState(mergePiClubState(next))
        setClubState('ready')
      })
      .catch(() => {
        if (!cancelled) setClubState('error')
      })
    return () => { cancelled = true }
  }, [])

  const refreshState = (next: PiClubState) => {
    setState(mergePiClubState(next))
    setClubState('ready')
  }

  const publishPost = () => postAction.run(async () => {
    const result = await createPiClubPost({
      title: postTitle,
      text: postText,
      community: selectedCommunity,
      source: 'EvoPi 朋友圈',
    })
    refreshState(result.state)
    setPostComposerOpen(false)
    actionHint.show(`已发到 ${result.post.community}`)
  })

  const joinCommunity = (communityId: string) => {
    void joinPiClubCommunity(communityId)
      .then((result) => {
        refreshState(result.state)
        actionHint.show(`已加入 ${result.community.name}`)
      })
      .catch((error) => actionHint.show(`加入失败：${formatApiError(error)}`))
  }

  const dropPhotos = () => photoAction.run(async () => {
    const result = await createPhotoDrop({
      title: photoTitle,
      count: photoCount,
      source: 'apple-photos',
      useCase: 'moments',
    })
    refreshState(result.state)
    setPostTitle(photoTitle)
    setPostText(result.drop.draftText)
    setPostComposerOpen(true)
    actionHint.show('Apple 相册素材已生成朋友圈草稿')
  })

  const buildProduct = () => vibeAction.run(async () => {
    const result = await createVibeProduct({
      name: vibeName,
      brief: vibeBrief,
      community: selectedCommunity || '创业者产品会客厅',
    })
    refreshState(result.state)
    actionHint.show(`已部署 ${result.product.name}，已进入我的子产品，可选择投放社区`)
  })

  const joinedCommunities = state.communities.filter((community) => community.joined)
  const communityOptions = [...joinedCommunities, ...state.communities.filter((community) => !community.joined)]
  const products = state.products.length ? state.products : productAssets.map(productAssetToClubProduct)
  const postedProductNames = new Set(state.posts.map((post) => post.product).filter(Boolean))

  const publishProduct = async (product: PiClubProduct) => {
    if (publishingProductId) return
    setPublishingProductId(product.id)
    try {
      const result = await createPiClubPost({
        title: `投放产品：${product.name}`,
        text: product.desc,
        community: product.community || selectedCommunity || '创业者产品会客厅',
        source: 'VibeCoding',
        product: product.name,
      })
      refreshState(result.state)
      actionHint.show(`${product.name} 已投放到 ${result.post.community}`)
    } catch (error) {
      actionHint.show(`投放失败：${formatApiError(error)}`)
    } finally {
      setPublishingProductId(null)
    }
  }

  const enterCommunity = (communityId: string) => {
    const community = state.communities.find((item) => item.id === communityId)
    if (!community) return
    if (community.joined) {
      setSelectedCommunity(community.name)
      actionHint.show(`已进入 ${community.name} 自习室`)
      return
    }
    joinCommunity(communityId)
  }

  const likePost = async (post: PiClubPost) => {
    if (likedPosts.has(post.id)) {
      actionHint.show('这条动态已经点过赞了')
      return
    }
    setLikedPosts((prev) => new Set(prev).add(post.id))
    try {
      const result = await likePiClubPost(post.id)
      refreshState(result.state)
    } catch (error) {
      setLikedPosts((prev) => {
        const next = new Set(prev)
        next.delete(post.id)
        return next
      })
      actionHint.show(`点赞失败：${formatApiError(error)}`)
    }
  }

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const submitComment = async (postId: string) => {
    const text = commentDrafts[postId]?.trim()
    if (!text) return
    try {
      const result = await commentPiClubPost(postId, text)
      refreshState(result.state)
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
      setOpenComments((prev) => new Set(prev).add(postId))
      actionHint.show('评论已发送')
    } catch (error) {
      actionHint.show(`评论失败：${formatApiError(error)}`)
    }
  }

  return (
    <div className="piclub-page">
      <div className="piclub-topbar">
        <button className="ghost-btn sm" onClick={onExit}><CuteIcon name="soft-arrow-left" />回工作台</button>
        <div>
          <strong>PiClub</strong>
          <span>{state.posts.length} 条动态 · {state.communities.length} 个 Club · {products.length} 个子产品</span>
        </div>
      </div>

      <section className="piclub-hero">
        <div className="piclub-hero-copy">
          <em className="tag mint">PiClub</em>
          <h2>让你的 EvoPi 去社区里工作、表达和协作</h2>
          <p>Pi 可以替你发朋友圈，加入学术组织做研究，也能把已经完成的子产品投到社区里收反馈。</p>
          <div className="piclub-hero-actions">
            <button className="primary-btn sm" onClick={() => setPostComposerOpen(true)}>
              <CuteIcon name="soft-add-plus" />
              发一条 Pi 朋友圈
            </button>
            <button className="ghost-btn sm" onClick={dropPhotos} disabled={photoAction.status === 'loading'}>
              {photoAction.status === 'loading' ? <span className="btn-spinner" /> : <CuteIcon name="soft-image-landscape" />}
              接 Apple 相册
            </button>
          </div>
        </div>
        <div className="piclub-camera-card">
          <div className="piclub-camera-orbit">
            <CuteIcon name="soft-image-landscape" />
          </div>
          <strong>Apple 相册共享</strong>
          <span>手机照片可通过 Apple Photos / AirDrop 进入 EvoPi，Pi 会生成朋友圈文案、研究证据或短视频脚本。</span>
          <div className="piclub-camera-form">
            <input className="text-input" value={photoTitle} onChange={(e) => setPhotoTitle(e.target.value)} />
            <input className="text-input" type="number" min={1} max={99} value={photoCount} onChange={(e) => setPhotoCount(Number(e.target.value))} />
          </div>
        </div>
      </section>

      {actionHint.hint && (
        <div className="inline-hint"><CuteIcon name="soft-success-check" />{actionHint.hint}</div>
      )}
      {clubState === 'error' && (
        <div className="ws-evomap-error"><CuteIcon name="soft-warning-triangle" />PiClub 后端暂不可用，正在显示本地预置内容。</div>
      )}

      <section className="piclub-grid">
        {postComposerOpen ? (
          <div className="piclub-panel piclub-post-composer is-open">
            <div className="piclub-panel-head">
              <div className="skill-section-title"><CuteIcon name="soft-send-plane" />Pi 朋友圈</div>
              <button className="ghost-btn sm" onClick={() => setPostComposerOpen(false)} aria-label="收起 Pi 朋友圈编辑器">
                <CuteIcon name="soft-arrow-left" />收起
              </button>
            </div>
            <input className="text-input" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
            <textarea value={postText} onChange={(e) => setPostText(e.target.value)} rows={4} />
            <select value={selectedCommunity} onChange={(e) => setSelectedCommunity(e.target.value)}>
              {communityOptions.map((community) => (
                <option key={community.id} value={community.name}>{community.name}</option>
              ))}
            </select>
            <button className="primary-btn" onClick={publishPost} disabled={postAction.status === 'loading'}>
              {postAction.status === 'loading' ? <span className="btn-spinner" /> : <CuteIcon name="soft-send-plane" />}
              让 Pi 发布
            </button>
          </div>
        ) : (
          <button className="piclub-panel piclub-compose-launch" onClick={() => setPostComposerOpen(true)}>
            <span className="piclub-compose-plus"><CuteIcon name="soft-add-plus" /></span>
            <div>
              <strong>发 Pi 朋友圈</strong>
              <span>点击加号后再编辑标题、正文和投放的 Club，自习室不会被编辑框长期占住。</span>
            </div>
          </button>
        )}

        <div className="piclub-panel piclub-vibe">
          <div className="skill-section-title"><CuteIcon name="soft-sparkle-edit" />VibeCoding</div>
          <input className="text-input" value={vibeName} onChange={(e) => setVibeName(e.target.value)} />
          <textarea value={vibeBrief} onChange={(e) => setVibeBrief(e.target.value)} rows={4} />
          <p className="piclub-panel-note">产品先进入记忆资产库的「我的子产品」，部署完成后你再决定是否投放社区。</p>
          <button className="primary-btn" onClick={buildProduct} disabled={vibeAction.status === 'loading'}>
            {vibeAction.status === 'loading' ? <span className="btn-spinner" /> : <CuteIcon name="soft-sparkle-twinkle" />}
            生成并部署子产品
          </button>
        </div>
      </section>

      <section className="piclub-grid wide">
        <div className="piclub-panel">
          <div className="skill-section-title"><CuteIcon name="soft-role-users" />Club 自习室</div>
          <div className="club-room-grid">
            {state.communities.map((community, index) => (
              <article className="club-room-card" key={community.id}>
                <div className={`club-room-cover tone-${index % 4}`}>
                  <span>{communityTypeLabel(community.type)}</span>
                  <strong>{community.name}</strong>
                  <em>{community.joined ? '已在自习室' : '可加入'}</em>
                </div>
                <div className="club-room-body">
                  <p>{community.desc}</p>
                  <div className="club-room-stats">
                    <span>{community.members} 位成员</span>
                    <span>{community.piAgents} 个 EvoPi</span>
                    <span>{community.owner}</span>
                  </div>
                </div>
                <button className="ghost-btn sm" onClick={() => enterCommunity(community.id)}>
                  <CuteIcon name={community.joined ? 'soft-success-check' : 'soft-add-plus'} />{community.joined ? '进入' : '加入'}
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="piclub-panel">
          <div className="skill-section-title"><CuteIcon name="soft-folder-tab" />我的子产品</div>
          <div className="club-product-list">
            {products.map((product) => (
              <article className="club-product-card" key={product.id}>
                <CuteIcon name="soft-sparkle-twinkle" />
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.desc}</p>
                  <span>{product.url}</span>
                  <div className="club-product-tags">
                    {product.stack.slice(0, 3).map((tag) => <em className="tag" key={tag}>{tag}</em>)}
                  </div>
                </div>
                <div className="club-product-actions">
                  <em className="tag mint">{productStatusLabel(product.status)}</em>
                  <button
                    className="ghost-btn sm"
                    disabled={product.status !== 'deployed' || postedProductNames.has(product.name) || publishingProductId === product.id}
                    onClick={() => void publishProduct(product)}
                  >
                    {publishingProductId === product.id ? <span className="btn-spinner" /> : <CuteIcon name={postedProductNames.has(product.name) ? 'soft-success-check' : 'soft-send-plane'} />}
                    {postedProductNames.has(product.name) ? '已投放' : product.status === 'deployed' ? '投放社区' : '待部署'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="piclub-feed">
        <div className="skill-section-title"><CuteIcon name="soft-chat-bubble" />社区动态</div>
        <div className="club-feed-list">
          {state.posts.map((post, index) => (
            <article className="club-post-card" key={post.id}>
              <div className={`club-post-cover tone-${index % 5}`}>
                <CuteIcon name={post.avatar as CuteIconName} />
                <span>{post.community}</span>
                <strong>{post.title}</strong>
              </div>
              <div className="club-post-body">
                <p>{post.text}</p>
                <div className="club-post-head">
                  <span className="club-post-avatar"><CuteIcon name={post.avatar as CuteIconName} />{post.author}</span>
                  <span>{post.time}</span>
                </div>
                <div className="club-post-meta">
                  <em className="tag">{post.source}</em>
                  {post.product && <em className="tag mint">{post.product}</em>}
                  {post.media && <em className="tag blue">{post.media}</em>}
                </div>
                <div className="club-post-actions">
                  <button className={likedPosts.has(post.id) ? 'active' : ''} onClick={() => void likePost(post)}>
                    <CuteIcon name="soft-heart-favorite" />
                    {post.likes} 赞
                  </button>
                  <button className={openComments.has(post.id) ? 'active' : ''} onClick={() => toggleComments(post.id)}>
                    <CuteIcon name="soft-chat-bubble" />
                    {post.replies} 评论
                  </button>
                </div>
                {openComments.has(post.id) && (
                  <div className="club-comments">
                    {(post.comments ?? []).length ? (
                      post.comments?.map((comment) => (
                        <div className="club-comment" key={comment.id}>
                          <strong>{comment.author}</strong>
                          <span>{comment.text}</span>
                          <em>{comment.time}</em>
                        </div>
                      ))
                    ) : (
                      <p className="club-comment-empty">还没有评论，可以让 Pi 先发一条观察。</p>
                    )}
                    <div className="club-comment-form">
                      <input
                        className="text-input"
                        value={commentDrafts[post.id] ?? ''}
                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="写一句评论"
                        onKeyDown={(e) => { if (e.key === 'Enter') void submitComment(post.id) }}
                      />
                      <button className="primary-btn sm" onClick={() => void submitComment(post.id)}>
                        <CuteIcon name="soft-send-plane" />发送
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function productAssetToClubProduct(product: ProductAsset): PiClubProduct {
  return {
    id: product.id,
    name: product.name,
    desc: product.desc,
    status: product.status === '已部署' ? 'deployed' : product.status === '内测中' ? 'building' : 'draft',
    url: product.url,
    community: product.community,
    createdAt: new Date(0).toISOString(),
    updatedAt: product.updatedAt,
    stack: product.stack,
  }
}

function mergePiClubState(next: PiClubState): PiClubState {
  return {
    communities: next.communities?.length ? next.communities : clubCommunities,
    posts: next.posts?.length ? next.posts : clubPosts,
    photoDrops: next.photoDrops ?? [],
    products: next.products?.length ? next.products : productAssets.map(productAssetToClubProduct),
  }
}

function communityTypeLabel(type: PiClubState['communities'][number]['type']) {
  if (type === 'research') return '学术组织'
  if (type === 'org') return '组织管理'
  return '产品社区'
}

function productStatusLabel(status: PiClubProduct['status']) {
  if (status === 'deployed') return '已部署'
  if (status === 'building') return '构建中'
  return '草稿'
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
        setExternalSkills(result.skills.filter(isWorkbenchSkill))
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
      setExternalSkills(result.skills.filter(isWorkbenchSkill))
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
      networkHint.show(`已导入工作台 Skill：${result.skill.name}`)
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

      <SkillSection icon="soft-import-data" title="工作台外部技能">
        <section className="skill-evomap-panel">
          <div className="skill-evomap-status">
            <div>
              <em className="tag blue">生产力 Skill</em>
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
              <p className="ws-snippet-empty">还没有工作台外部 Skill。公众号发布、自动做 PPT 等生产力技能会显示在这里；名人 Skill 只在 PiRoom 管理。</p>
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

function isWorkbenchSkill(skill: ExternalAgentSkill) {
  return skill.source === 'productivity'
}

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
  const [mapOpen, setMapOpen] = useState(false)

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
  const densityBars = useMemo(() => evolutionDensityBars(events), [events])
  const recentLiveEvents = useMemo(() => events.slice(0, 5), [events])
  const userSignalEvents = useMemo(() => events.filter(isUserFacingEvolutionEvent).slice(0, 8), [events])
  const chainLanes = useMemo(() => evolutionLanes.filter((lane) => lane.key !== 'all'), [])
  const allFilteredExpanded = filteredEvents.length > 0 && filteredEvents.every((event) => expandedEventIds.has(event.id))
  const journeySummary = useMemo(() => {
    const achieved = journeyMilestones.filter((milestone) => milestone.achieved)
    const current = [...achieved].reverse().find((milestone) => milestone.kind === 'current') ?? achieved.at(-1)
    const coreLevel = Math.max(1, ...achieved.map((milestone) => milestone.coreLevel ?? 1))
    const petLevel = Math.max(1, ...achieved.map((milestone) => milestone.petLevel ?? 1))
    const permission = [...achieved].reverse().find((milestone) => milestone.permissionLevel)?.permissionLevel ?? 'L1'
    return { achieved, current, coreLevel, petLevel, permission }
  }, [])

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
      {mapOpen && <EvolutionMapCanvas onClose={() => setMapOpen(false)} />}
      <section className="evo-hero">
        <div className="evo-hero-top">
          <div className="evo-hero-copy">
            <span className="tag blue">EvoMAP Neural Hub</span>
            <h2>进化中枢</h2>
            <p>把资料、目标、权限、PiCore、宠物等级和关键交互折叠成一张可探索的进化神经网络。</p>
          </div>
          <div className="evo-live-panel">
            <span className={`evo-live-dot ${eventsState === 'error' ? 'error' : autoRefresh ? 'on' : ''}`} />
            <div>
              <strong>{eventsState === 'error' ? '审计轨迹离线' : evolutionTransportTitle(autoRefresh, eventTransport)}</strong>
              <span>{lastUpdatedAt ? `后台同步 ${formatEvolutionTime(lastUpdatedAt)}` : '等待第一次同步'}</span>
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
            <span>PiCore 旅程完整度</span>
            <strong>{journeySummary.achieved.length}/{journeyMilestones.length}</strong>
          </div>
          <div className="evo-progress-bar" aria-label="自进化闭环完成度">
            <span style={{ width: `${Math.round((journeySummary.achieved.length / journeyMilestones.length) * 100)}%` }} />
          </div>
          <div className="evo-progress-nodes">
            {journeyMilestones.slice(0, 6).map((milestone) => (
              <span
                className={milestone.achieved ? 'done' : ''}
                key={milestone.id}
              >
                {milestone.badge ?? milestone.title}
              </span>
            ))}
          </div>
        </div>
        <div className="evo-hero-summary">
          <article>
            <span>生命核等级</span>
            <strong>Lv.{journeySummary.coreLevel}</strong>
            <em>{journeySummary.permission}</em>
          </article>
          <article>
            <span>宠物养成</span>
            <strong>Lv.{journeySummary.petLevel}</strong>
            <em>目标完成会继续提升</em>
          </article>
          <article>
            <span>当前节点</span>
            <strong>{journeySummary.current?.badge ?? '中枢'}</strong>
            <em>{journeySummary.current?.title ?? '等待里程碑'}</em>
          </article>
        </div>
        <div className="evo-live-strip evo-live-strip-compact" aria-label="后台审计轨迹">
          {recentLiveEvents.length ? recentLiveEvents.map((event) => (
            <div className={`evo-live-strip-item ${freshEventIds.includes(event.id) ? 'is-live' : ''}`} key={event.id}>
              <CuteIcon name={eventIcon(event.type)} />
              <div>
                <strong>{event.summary}</strong>
                <span>审计轨迹 · {event.type} · {formatEvolutionAge(event.createdAt)}</span>
              </div>
            </div>
          )) : (
            <div className="evo-live-strip-item empty">
              <CuteIcon name="soft-log-lines" />
              <div>
                <strong>等待第一条后台审计轨迹</strong>
                <span>用户确认、Skill 固化、社区发布或 webhook 到达后会进入审计台。</span>
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
                进化中枢
              </div>
              {/* 进化中枢入口：点击进入全屏进化旅程地图 */}
              <button className="evo-hub-entry" onClick={() => setMapOpen(true)}>
                <span className="evo-hub-core" aria-hidden="true">
                  <span className="evo-hub-ring" />
                  <CuteIcon name="soft-sparkle-twinkle" />
                </span>
                <div className="evo-hub-text">
                  <strong>全屏打开 EvoMAP 进化神经网络</strong>
                  <span>查看从起点、资料、目标、权限到 PiClub 的整张大画布；关键里程碑点开后才显示交互记录。</span>
                </div>
                <span className="evo-hub-cta">
                  展开 <CuteIcon name="soft-arrow-right" />
                </span>
              </button>
              {/* 保留旧思维导图作为缩略预览（折叠态） */}
              <details className="evo-map-legacy">
                <summary>查看分支速览</summary>
                <EvolutionMindMap events={events} />
              </details>
            </div>
            <aside className="evo-current-panel">
              <div className="skill-section-title">
                <CuteIcon name="soft-role-users" />
                当前进化画像
              </div>
              <div className="evo-current-card evo-profile-card">
                <span className="evo-lane-pill lane-reuse">老板 / 管理者分支</span>
                <strong>从个人助理升级为组织智能中枢</strong>
                <p>Pi 正在把你的资料、管理任务、产品想法和社区反馈沉淀成可复用的管理思维，而不是把每一次操作都当作一条朋友圈动态。</p>
                <div className="evo-profile-grid">
                  <span>组织任务中枢</span>
                  <span>管理思维进化</span>
                  <span>子产品投放台</span>
                  <span>宠物 Lv.{journeySummary.petLevel}</span>
                </div>
              </div>
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

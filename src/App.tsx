import { useEffect, useMemo, useRef, useState } from 'react'
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

/* ============================================================
   类型与基础
   ============================================================ */
type AppPage = 'launch' | 'today' | 'goals' | 'memory' | 'room' | 'skills' | 'evolution' | 'privacy'
type Theme = 'cute' | 'notion' | 'glass'

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
  const [page, setPage] = useState<AppPage>('launch')
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
              <button className="round-action" aria-label="搜索"><CuteIcon name="soft-search-spark" /></button>
              <button className="soft-button"><CuteIcon name="soft-calendar-reminder" />提醒事项</button>
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
function TodayPage({ goRoom }: { goRoom: () => void }) {
  const [text, setText] = useState('')
  return (
    <div className="today-narrow">
      <article className="focus-hero">
        <div className="focus-label">
          <CuteIcon name="soft-target-bullseye" />
          <span>今日聚焦</span>
          <em className="tag">{todayFocus.deadline}</em>
        </div>
        <h2>{todayFocus.next}</h2>
        <div className="focus-actions">
          <button className="primary-btn"><CuteIcon name="soft-sparkle-edit" />开始推进</button>
          <button className="ghost-btn"><CuteIcon name="soft-arrow-right" />换一件</button>
        </div>
      </article>

      <div className="today-compose">
        <CuteIcon name="soft-sparkle-twinkle" />
        <input
          placeholder="或者告诉 EvoPi 你现在想做什么……"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="mini-action" aria-label="语音"><CuteIcon name="soft-microphone-voice" /></button>
        <button className="send-button" aria-label="发送"><CuteIcon name="soft-send-plane" /></button>
      </div>

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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

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

  const confirmSkill = () => {
    if (contextCache.length === 0) return
    const nextSnippet: GoalSnippet = {
      id: `skill-${goal.name}-${Date.now()}`,
      title: `Skill：${goal.workspace.title}协作规则`,
      kind: 'template',
      preview: contextCache.slice(-3).join('；').slice(0, 88),
    }
    onConfirmSkill(nextSnippet)
    setContextCache([])
    setSkillSaved(true)
    setMessages((m) => [
      ...m,
      {
        from: 'them',
        text: `已等你确认后沉淀成「${nextSnippet.title}」，并放回「${goal.name}」的目标模板库。之后打开这个工作舱会优先引用它。`,
        time: '现在',
        attached: [nextSnippet.title],
      },
    ])
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

      <div className="room-chat-shell ws-room-shell">
        <header className="chat-header">
          <div className="chat-person">
            <div className="person-avatar sm"><CuteIcon name="soft-sparkle-twinkle" /></div>
            <div>
              <strong>{goal.name} · 大对话</strong>
              <span>缓存 {contextCache.length} 条 · 模板库 {snippets.length} 条</span>
            </div>
          </div>
          <button className="ghost-btn sm" disabled={contextCache.length === 0} onClick={confirmSkill}>
            <CuteIcon name="soft-settings-gear" />{skillSaved ? '已沉淀' : '确认成 Skill'}
          </button>
        </header>

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
            <div className="asset-list">
              {snippets.map((snippet) => {
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

/* ============================================================
   记忆库
   ============================================================ */
function MemoryPage() {
  const [cat, setCat] = useState('全部')
  const [query, setQuery] = useState('')
  const filtered = memories.filter(
    (m) => (cat === '全部' || m.cat === cat) && m.title.includes(query),
  )
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
        {filtered.map((m) => (
          <article className="memory-item" key={m.title}>
            <CuteIcon name={m.state === '敏感' ? 'soft-lock-keyhole' : 'soft-database-stack'} />
            <div>
              <strong>{m.title}</strong>
              <span>来源：{m.source} · {m.time} · {m.cat}记忆</span>
            </div>
            <div className="memory-actions">
              <em className={m.state === '敏感' ? 'tag warn' : 'tag'}>{m.state}</em>
              {m.state !== '敏感' ? (
                <><button>确认</button><button>合并</button></>
              ) : <button>设为忽略</button>}
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="empty">没有匹配的记忆。</p>}
      </div>
    </div>
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

  return (
    <div className="library-page">
      <div className="room-hero">
        <div>
          <h2 style={{ fontSize: 26 }}>把你想请教的人请进房间</h2>
          <p style={{ color: 'var(--muted)', marginTop: 6, maxWidth: 520 }}>
            基于公开资料或你上传的资料，生成可对话的「模拟视角」。不是真人本人，每次对话都标注来源。
          </p>
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
              className="primary-btn"
              disabled={!customName.trim()}
              onClick={() => {
                setActivePerson({
                  id: 'custom-' + Date.now(),
                  name: customName.trim(),
                  type: 'custom',
                  desc: '自定义导入',
                  basis: customBasis.trim() || '用户上传资料',
                  avatar: 'soft-role-users',
                  online: true,
                })
              }}
            >
              <CuteIcon name="soft-add-plus" /> 创建并对话
            </button>
          </div>
        </div>
      )}

      <div className="person-grid">
        {presetPersons.map((p) => (
          <article className="person-card" key={p.id}>
            <div className="person-avatar">
              <CuteIcon name={p.avatar as CuteIconName} />
              {p.online && <span className="online-dot" />}
            </div>
            <div className="person-info">
              <h3>{p.name}</h3>
              <span className="person-desc">{p.desc}</span>
              <span className="person-basis">依据：{p.basis}</span>
            </div>
            <button className="primary-btn sm" onClick={() => setActivePerson(p)}>
              <CuteIcon name="soft-chat-bubble" /> 开聊
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

function RoomChat({ person, onBack }: { person: RoomPerson; onBack: () => void }) {
  const initial: ChatMsg[] = sampleChat[person.id] ?? [
    { from: 'them', text: `你好，我是基于「${person.basis}」生成的${person.name}模拟视角。你想聊什么？`, time: '现在' },
  ]
  const [messages, setMessages] = useState<ChatMsg[]>(initial)
  const [input, setInput] = useState('')
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [showAssets, setShowAssets] = useState(true)
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

  const send = () => {
    if (!input.trim() && selectedAssets.size === 0) return
    const attached = assetLibrary.filter((a) => selectedAssets.has(a.id)).map((a) => a.name)
    setMessages((m) => [
      ...m,
      { from: 'me', text: input.trim() || '（附上几份资料）', time: '现在', attached: attached.length ? attached : undefined },
    ])
    setInput('')
    setSelectedAssets(new Set())
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { from: 'them', text: '收到你的资料，我来基于这些看一下。先说我的判断……（这是模拟回复）', time: '现在' },
      ])
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
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
        />
        <button className="send-button" onClick={send} aria-label="发送"><CuteIcon name="soft-send-plane" /></button>
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
  return (
    <div className="library-page">
      <SkillSection icon="soft-success-check" title="已安装技能">
        <div className="skill-page">
          {installedSkills.map((s) => (
            <article className="skill-card" key={s.name}>
              <CuteIcon name={s.icon} />
              <div><h2>{s.name}</h2><span>触发：{s.trigger}</span><span>范围：{s.scope}</span></div>
              <div><em className="tag">{s.status}</em><button>管理</button></div>
            </article>
          ))}
        </div>
      </SkillSection>
      <SkillSection icon="soft-bookmark-study" title="技能商店推荐">
        <div className="skill-page">
          {storeSkills.map((s) => (
            <article className="skill-card" key={s.name}>
              <CuteIcon name={s.icon} />
              <div><h2>{s.name}</h2><span>触发：{s.trigger}</span><span>范围：{s.scope}</span></div>
              <div><em className="tag">{s.status}</em><button>安装</button></div>
            </article>
          ))}
        </div>
      </SkillSection>
    </div>
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

  return (
    <div className="evo-page">
      {/* 共进化循环：用户进化 ⇄ Agent进化，互相促进 */}
      <section className="co-evo-loop">
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

      {/* 切换：Agent 进化思维导图 / 用户进化记录 */}
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
          <div className="room-notice mint">
            <strong>展开任意分支查看 EvoPi 最近在学什么、自动处理了什么</strong>
            点开每条线，可以看到它研究的开源项目、配置的 Skill、跑通的自动化和整理的资料。可审计、可回滚。
          </div>
          <EvolutionMindMap />

          {/* 底部保留 GEP 链路解释（Signal → Gene → Capsule → Validation） */}
          <div className="evo-gep">
            <div className="skill-section-title">
              <CuteIcon name="soft-log-lines" />
              一条行为是怎么变成的（GEP 链路）
            </div>
            <div className="evolution-page">
              {evolutionLogs.map((log, i) => (
                <article className="evolution-step" key={log.label}>
                  <div className="step-number">{i + 1}</div>
                  <div>
                    <div className="ev-tags">
                      <CuteIcon name={log.icon} />
                      <span className="ev-tag">{log.label}</span>
                      <span className="ev-en">{log.en}</span>
                    </div>
                    <p>{log.text}</p>
                  </div>
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

function PrivacyPage({ initialLevel = 2 }: { initialLevel?: number }) {
  const [level, setLevel] = useState(initialLevel)
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
        <button className="pause-button">一键暂停 EvoPi</button>
        <button className="ghost-btn lg"><CuteIcon name="soft-log-lines" />查看采集日志</button>
      </div>
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

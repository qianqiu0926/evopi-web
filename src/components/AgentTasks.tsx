import { useCallback, useEffect, useRef, useState } from 'react'
import {
  agentFreqOptions,
  presetAgentTasks,
  type AgentTask,
  type AgentTaskFreq,
  type AgentTaskResult,
} from '../data'
import { emitPiCoreSignal } from '../piCoreSignals'

/* ============================================================
   AgentTasks · Agent 代理任务（Pi 伙伴下方）
   - 用户授权 Agent CLI 代理信息获取/工作任务
   - 授权一次后按计划自动定时执行
   - 真实抓取 Reddit 公开 RSS（Atom XML，走 /reddit-proxy 代理绕 CORS）
   - Reddit 已停用 .json，且对自动请求限流（429），故用 .rss + DOMParser 解析
   ⚠️ 仅抓公开数据，不碰需要登录的内容；可在面板随时撤回授权
   ============================================================ */

// 解析 Reddit 的 Atom RSS（.rss 端点）为结果列表
function parseRedditRss(xmlText: string, limit: number): AgentTaskResult[] {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  // 是否是错误页（HTML 而非 XML）
  if (doc.querySelector('parsererror') || !doc.querySelector('entry')) {
    throw new Error('返回内容不是 RSS（可能被限流或封禁）')
  }
  const entries = Array.from(doc.querySelectorAll('entry')).slice(0, limit)
  return entries.map((entry) => {
    const get = (tag: string) => entry.querySelector(tag)?.textContent?.trim() ?? ''
    const title = get('title')
    const linkEl = entry.querySelector('link')
    const url = linkEl?.getAttribute('href') ?? undefined
    const author = get('author > name') || get('name')
    const updated = get('updated').slice(0, 10)
    return {
      title,
      meta: `r/ · ${author}${updated ? ' · ' + updated : ''}`,
      url,
    }
  })
}

export function AgentTasks() {
  const [tasks, setTasks] = useState<AgentTask[]>(presetAgentTasks)
  const [open, setOpen] = useState(true)
  const [schoolBound, setSchoolBound] = useState(false)
  const [schoolStep, setSchoolStep] = useState<'idle' | 'qr' | 'binding' | 'bound' | 'importing' | 'synced'>('idle')
  const [calendarSynced, setCalendarSynced] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftSub, setDraftSub] = useState('')
  const [draftFreq, setDraftFreq] = useState<AgentTaskFreq>('daily')
  const [expanded, setExpanded] = useState<string | null>(null)
  const timers = useRef<Record<string, number>>({})

  // 清理定时器
  useEffect(() => {
    const t = timers.current
    return () => {
      Object.values(t).forEach((id) => clearInterval(id))
    }
  }, [])

  // 真实抓取 Reddit（走 .rss，Reddit 已停用 .json）
  const fetchReddit = useCallback(async (task: AgentTask) => {
    const sub = task.subreddit ?? 'worldnews'
    const sort = task.sort ?? 'top'
    // 429 限流时自动重试一次（带退避）
    const doFetch = async () => {
      const url = `/reddit-proxy/r/${sub}/${sort}/.rss`
      const res = await fetch(url, { headers: { Accept: 'application/atom+xml' } })
      if (res.status === 429) throw new Error('Reddit 限流（429），请稍后再试')
      if (!res.ok) throw new Error(`Reddit 返回 ${res.status}`)
      return res.text()
    }
    let text: string
    try {
      text = await doFetch()
    } catch (e) {
      // 退避 1.5s 重试一次
      await new Promise((r) => setTimeout(r, 1500))
      text = await doFetch().catch(() => {
        throw e
      })
    }
    return parseRedditRss(text, task.limit)
  }, [])

  // 执行单个任务（授权后才允许）
  const runTask = useCallback(
    async (id: string) => {
      emitPiCoreSignal('delegate')
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'running', lastRun: nowStr() } : t)),
      )
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      try {
        const results = await fetchReddit(task)
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: 'done', results, lastRun: nowStr() } : t,
          ),
        )
      } catch (e) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, status: 'error', results: [{ title: '抓取失败：' + (e as Error).message, meta: '可稍后重试' }] }
              : t,
          ),
        )
      }
    },
    [fetchReddit, tasks],
  )

  // 授权一个任务：授权一次后启动自动定时（演示：按频率模拟，真实定时需后端 cron）
  const authorize = useCallback(
    (id: string) => {
      emitPiCoreSignal('delegate')
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t
          const next: AgentTask = { ...t, status: 'authorized', lastRun: nowStr() }
          return next
        }),
      )
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      // 立即跑一次
      runTask(id)
      // 设置定时（演示：hourly=演示用 60s，daily/weekly 不真等，仅标记下次时间）
      const intervalMs = task.freq === 'hourly' ? 60_000 : task.freq === 'daily' ? 30_000 : 60_000
      if (timers.current[id]) clearInterval(timers.current[id])
      timers.current[id] = window.setInterval(() => runTask(id), intervalMs)
    },
    [runTask, tasks],
  )

  // 撤回授权 / 暂停
  const revoke = useCallback((id: string) => {
    if (timers.current[id]) {
      clearInterval(timers.current[id])
      delete timers.current[id]
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'paused' } : t)))
  }, [])

  // 删除任务
  const remove = useCallback((id: string) => {
    if (timers.current[id]) clearInterval(timers.current[id])
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // 添加新任务
  const addTask = () => {
    emitPiCoreSignal('delegate')
    const sub = draftSub.trim() || 'worldnews'
    const name = draftName.trim() || `r/${sub} ${freqLabel(draftFreq)}`
    const t: AgentTask = {
      id: 'task-' + Date.now(),
      name,
      source: 'reddit',
      subreddit: sub,
      sort: 'top',
      freq: draftFreq,
      status: 'draft',
      limit: 5,
      nextRun: freqLabel(draftFreq) === '手动' ? '手动触发' : '授权后启动',
    }
    setTasks((prev) => [...prev, t])
    setAdding(false)
    setDraftName('')
    setDraftSub('')
    setDraftFreq('daily')
  }

  const startSchoolBinding = () => {
    emitPiCoreSignal('delegate')
    setSchoolStep('qr')
    setCalendarSynced(false)
  }

  const confirmSchoolBinding = () => {
    emitPiCoreSignal('delegate')
    setSchoolStep('binding')
    window.setTimeout(() => {
      setSchoolBound(true)
      setSchoolStep('bound')
    }, 700)
  }

  const importSchedule = () => {
    emitPiCoreSignal('delegate')
    setSchoolStep('importing')
    window.setTimeout(() => {
      setSchoolStep('synced')
    }, 900)
  }

  const syncCalendar = () => {
    emitPiCoreSignal('delegate')
    setCalendarSynced(true)
  }

  return (
    <div className={`agent-tasks ${open ? 'is-open' : ''}`}>
      <button
        className="agent-tasks-head collapsible-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" />
        <div>
          <strong>Pi 代理任务</strong>
          <span>
            学校事务{schoolBound ? '已绑定' : '待绑定'} · {tasks.filter((task) => task.status === 'authorized' || task.status === 'running').length} 个运行中 · {tasks.length} 个自动任务
          </span>
        </div>
        <em>{open ? '收起' : '展开'}</em>
      </button>

      {open && (
        <>
        <section className={`school-agent-card ${schoolBound ? 'bound' : ''}`}>
          <div className="school-agent-head">
            <span className="school-agent-icon">
              <img className="cute-icon" src="/cute-line-icons/soft-bookmark-study.png" alt="" />
            </span>
            <div>
              <strong>学校事务一站式</strong>
              <span>{schoolBound ? '企业微信已绑定 · 可导入课表和同步日历' : '通过企业微信扫码双因子验证，不保存账号密码'}</span>
            </div>
          </div>

          <div className="school-agent-flow" aria-label="学校事务接入步骤">
            <span className={schoolStep !== 'idle' ? 'active' : ''}>扫码验证</span>
            <span className={schoolBound ? 'active' : ''}>绑定企业微信</span>
            <span className={schoolStep === 'synced' || calendarSynced ? 'active' : ''}>导入课表</span>
            <span className={calendarSynced ? 'active' : ''}>加入日历</span>
          </div>

          {schoolStep === 'qr' && (
            <div className="school-qr-panel">
              <div className="school-qr" aria-label="企业微信扫码验证二维码">
                <span />
                <span />
                <span />
                <i />
              </div>
              <div>
                <strong>企业微信扫码确认</strong>
                <span>扫码后在手机端完成学校身份二次验证，Pi 只接收授权回执。</span>
                <button className="primary-btn sm" onClick={confirmSchoolBinding}>我已扫码确认</button>
              </div>
            </div>
          )}

          <div className="school-agent-actions">
            {!schoolBound ? (
              <button className="primary-btn sm" onClick={startSchoolBinding}>
                <img className="cute-icon" src="/cute-line-icons/soft-shield-check.png" alt="" />
                企业微信扫码绑定
              </button>
            ) : (
              <>
                <button className="ghost-btn sm" onClick={importSchedule} disabled={schoolStep === 'importing'}>
                  <img className="cute-icon" src="/cute-line-icons/soft-import-data.png" alt="" />
                  {schoolStep === 'importing' ? '导入中' : '导入课表'}
                </button>
                <button className="primary-btn sm" onClick={syncCalendar} disabled={schoolStep !== 'synced' || calendarSynced}>
                  <img className="cute-icon" src="/cute-line-icons/soft-calendar-reminder.png" alt="" />
                  {calendarSynced ? '已加入日历' : '加入日历'}
                </button>
              </>
            )}
          </div>

          <div className="school-schedule-preview">
            <article>
              <span>今日课程</span>
              <strong>{schoolStep === 'synced' || calendarSynced ? '3 门' : '待导入'}</strong>
            </article>
            <article>
              <span>日历同步</span>
              <strong>{calendarSynced ? '已完成' : '未同步'}</strong>
            </article>
            <article>
              <span>安全方式</span>
              <strong>扫码授权</strong>
            </article>
          </div>

          {(schoolStep === 'binding' || schoolStep === 'importing') && (
            <div className="agent-running">
              <span className="agent-spin" />
              {schoolStep === 'binding' ? 'Pi 正在确认企业微信授权回执。' : 'Pi 正在读取课表并整理成日历事件。'}
            </div>
          )}

          {(schoolStep === 'synced' || calendarSynced) && (
            <ul className="school-course-list">
              <li><strong>机器学习导论</strong><span>周一 09:00 · 教学楼 A302</span></li>
              <li><strong>产品设计专题</strong><span>周三 14:30 · 东校园实验室</span></li>
              <li><strong>大学体育</strong><span>周五 16:00 · 体育中心</span></li>
            </ul>
          )}

          <p className="agent-note">
            参考 SYSU-Anything 的校园 skill layer：优先走企业微信扫码、官方授权或既有登录态，可继续扩展教务、雨课堂、场馆、图书馆和就业事务。
          </p>
        </section>

        <button
          className="agent-add-btn"
          onClick={() => setAdding((v) => !v)}
          aria-label="添加代理任务"
          title="添加代理任务"
        >
          {adding ? '−' : '+'}
        </button>

      {adding && (
        <div className="agent-add-form">
          <input
            className="text-input"
            placeholder="任务名（如：每日 AI 资讯）"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
          <div className="agent-add-row">
            <span className="agent-add-prefix">r/</span>
            <input
              className="text-input"
              placeholder="subreddit（如 worldnews）"
              value={draftSub}
              onChange={(e) => setDraftSub(e.target.value.replace(/[^\w]/g, ''))}
            />
          </div>
          <div className="agent-freq-pick">
            {agentFreqOptions.map((f) => (
              <button
                key={f.value}
                className={draftFreq === f.value ? 'agent-freq active' : 'agent-freq'}
                onClick={() => setDraftFreq(f.value)}
                title={f.hint}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="agent-add-actions">
            <button className="ghost-btn sm" onClick={() => setAdding(false)}>取消</button>
            <button className="primary-btn sm" onClick={addTask}>添加</button>
          </div>
        </div>
      )}

      <div className="agent-tasks-list">
        {tasks.map((t) => (
          <div className="agent-task" key={t.id}>
            <button
              className="agent-task-main"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            >
              <span className={`agent-status-dot ${t.status}`} title={statusLabel(t.status)} />
              <div className="agent-task-info">
                <strong>{t.name}</strong>
                <span>
                  {t.source === 'reddit' && t.subreddit ? `r/${t.subreddit}` : t.source} · {freqLabel(t.freq)}
                  {t.lastRun ? ` · 上次 ${t.lastRun}` : ''}
                </span>
              </div>
              <span className="agent-chev">{expanded === t.id ? '▾' : '▸'}</span>
            </button>

            <div className="agent-task-actions">
              {t.status === 'draft' && (
                <button className="primary-btn sm" onClick={() => authorize(t.id)}>
                  授权并开始
                </button>
              )}
              {(t.status === 'authorized' || t.status === 'done') && (
                <>
                  <button className="ghost-btn sm" onClick={() => runTask(t.id)} title="立即执行一次">
                    现在执行
                  </button>
                  <button className="ghost-btn sm" onClick={() => revoke(t.id)} title="暂停自动执行">
                    暂停
                  </button>
                </>
              )}
              {t.status === 'paused' && (
                <button className="primary-btn sm" onClick={() => authorize(t.id)}>
                  重新授权
                </button>
              )}
              {t.status === 'error' && (
                <button className="ghost-btn sm" onClick={() => runTask(t.id)}>重试</button>
              )}
              <button className="agent-del" onClick={() => remove(t.id)} aria-label="删除任务">✕</button>
            </div>

            {expanded === t.id && (
              <div className="agent-results">
                {t.status === 'running' && (
                  <div className="agent-running">
                    <span className="agent-spin" />
                    Pi 正在抓取 {t.source === 'reddit' ? `r/${t.subreddit}` : '数据'}…
                  </div>
                )}
                {t.results && t.results.length > 0 ? (
                  <ul className="agent-result-list">
                    {t.results.map((r, i) => (
                      <li key={i}>
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                        ) : (
                          <span>{r.title}</span>
                        )}
                        <em>{r.meta}</em>
                      </li>
                    ))}
                  </ul>
                ) : (
                  t.status !== 'running' && <p className="agent-empty">还没有结果，授权后 Pi 会去抓取。</p>
                )}
                <p className="agent-note">
                  ⚠️ 仅抓取公开数据，不碰需登录内容。授权后按「{freqLabel(t.freq)}」自动执行，可随时暂停。
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  )
}

function nowStr(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function freqLabel(f: AgentTaskFreq): string {
  return agentFreqOptions.find((o) => o.value === f)?.label ?? f
}

function statusLabel(s: AgentTask['status']): string {
  const m: Record<AgentTask['status'], string> = {
    draft: '草稿（未授权）',
    authorized: '已授权·自动执行中',
    running: '正在抓取',
    done: '完成',
    error: '出错',
    paused: '已暂停',
  }
  return m[s]
}

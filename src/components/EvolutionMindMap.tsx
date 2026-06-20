import { useState } from 'react'
import { evolutionBranches, type EvBranch } from '../data'
import type { EvolutionEvent } from '../api'

/* ============================================================
   EvolutionMindMap · 进化思维导图画布
   - 中心 = PiCore 生命核
   - 向上下左右辐射 4 条进化线（Agent知识/自动化/资料整理/行为基因）
   - 每个分支可展开，露出子节点；子节点用 SVG 连线 + 卡片
   - 横向可滚动画布，不挤压
   ============================================================ */

// 四条分支在画布上的方位
const layout = [
  { id: 'knowledge', dir: 'left' },
  { id: 'automation', dir: 'right' },
  { id: 'knowledge2', dir: 'top' },
  { id: 'behavior', dir: 'bottom' },
] as const

const colorVar: Record<EvBranch['color'], string> = {
  pink: 'var(--cute-pink)',
  blue: 'var(--cute-blue)',
  yellow: 'var(--cute-yellow)',
  mint: 'var(--cute-mint)',
}

type LiveBranchKey = 'knowledge' | 'automation' | 'knowledge2' | 'behavior'

export function EvolutionMindMap({ events = [] }: { events?: EvolutionEvent[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ knowledge: true, automation: true, knowledge2: false, behavior: true })

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }))
  const liveEvents = groupLiveEvolutionEvents(events)

  return (
    <div className="mindmap-scroll">
      <div className="mindmap-canvas">
        {/* 中心核 */}
        <div className="mm-core">
          <img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" />
          <strong>PiCore</strong>
          <span>EvoPi 的进化中枢</span>
        </div>

        {/* 四条分支 */}
        <div className={`mm-branch mm-${layout[0].dir}`} data-open={open.knowledge}>
          <BranchHead branch={evolutionBranches[0]} open={open.knowledge} onToggle={() => toggle('knowledge')} />
          {open.knowledge && <BranchChildren branch={evolutionBranches[0]} />}
          {open.knowledge && <BranchLiveTrail events={liveEvents.knowledge} empty="等待 EvoMap 搜索、Pi 调用或外部信号" />}
        </div>
        <div className={`mm-branch mm-${layout[1].dir}`} data-open={open.automation}>
          <BranchHead branch={evolutionBranches[1]} open={open.automation} onToggle={() => toggle('automation')} />
          {open.automation && <BranchChildren branch={evolutionBranches[1]} />}
          {open.automation && <BranchLiveTrail events={liveEvents.automation} empty="等待小票流沉淀成本地 Skill" />}
        </div>
        <div className={`mm-branch mm-${layout[2].dir}`} data-open={open.knowledge2}>
          <BranchHead branch={evolutionBranches[2]} open={open.knowledge2} onToggle={() => toggle('knowledge2')} />
          {open.knowledge2 && <BranchChildren branch={evolutionBranches[2]} />}
          {open.knowledge2 && <BranchLiveTrail events={liveEvents.knowledge2} empty="等待 Recipe draft / test publish" />}
        </div>
        <div className={`mm-branch mm-${layout[3].dir}`} data-open={open.behavior}>
          <BranchHead branch={evolutionBranches[3]} open={open.behavior} onToggle={() => toggle('behavior')} />
          {open.behavior && <BranchChildren branch={evolutionBranches[3]} />}
          {open.behavior && <BranchLiveTrail events={liveEvents.behavior} empty="等待 reuse graph 或 webhook 回执" />}
        </div>
      </div>
    </div>
  )
}

function BranchHead({ branch, open, onToggle }: { branch: EvBranch; open: boolean; onToggle: () => void }) {
  return (
    <button
      className="mm-head"
      style={{ background: colorVar[branch.color] }}
      onClick={onToggle}
      aria-expanded={open}
    >
      <img className="cute-icon" src={`/cute-line-icons/${branch.icon}.png`} alt="" />
      <div>
        <strong>{branch.label}</strong>
        <span>{branch.desc}</span>
      </div>
      <em className="mm-chev">{open ? '−' : '+'}</em>
    </button>
  )
}

function BranchChildren({ branch }: { branch: EvBranch }) {
  return (
    <div className="mm-children">
      {branch.children.map((c, i) => (
        <div className="mm-child" key={c.title} style={{ '--i': i } as React.CSSProperties}>
          <span className="mm-dot" style={{ background: colorVar[branch.color] }} />
          {c.icon && <img className="cute-icon mm-child-icon" src={`/cute-line-icons/${c.icon}.png`} alt="" />}
          <div>
            <strong>{c.title}</strong>
            {c.meta && <span>{c.meta}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function BranchLiveTrail({ events, empty }: { events: EvolutionEvent[]; empty: string }) {
  return (
    <div className="mm-live-trail">
      <div className="mm-live-head">
        <span>Live trail</span>
        <em>{events.length} recent</em>
      </div>
      {events.length ? (
        events.slice(0, 3).map((event) => (
          <article className="mm-live-item" key={event.id}>
            <strong>{event.type}</strong>
            <span>{shortMindMapText(event.summary)}</span>
            <em>{formatMindMapTime(event.createdAt)}</em>
          </article>
        ))
      ) : (
        <p className="mm-live-empty">{empty}</p>
      )}
    </div>
  )
}

function groupLiveEvolutionEvents(events: EvolutionEvent[]): Record<LiveBranchKey, EvolutionEvent[]> {
  return events.slice(0, 40).reduce<Record<LiveBranchKey, EvolutionEvent[]>>((groups, event) => {
    groups[liveBranchForEvent(event)].push(event)
    return groups
  }, {
    knowledge: [],
    automation: [],
    knowledge2: [],
    behavior: [],
  })
}

function liveBranchForEvent(event: EvolutionEvent): LiveBranchKey {
  if (event.type === 'receipt_run.created' || event.type === 'skill.confirmed' || event.type === 'external_skill.synced') return 'automation'
  if (event.type === 'recipe.draft_created' || event.type === 'recipe.test_published' || event.type === 'recipe.published') return 'knowledge2'
  if (event.type === 'evomap.reuse_queried' || event.type === 'evomap.reference_attached' || event.type === 'webhook.received') return 'behavior'
  return 'knowledge'
}

function shortMindMapText(value: string): string {
  return value.length > 46 ? `${value.slice(0, 46)}...` : value
}

function formatMindMapTime(value: string): string {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

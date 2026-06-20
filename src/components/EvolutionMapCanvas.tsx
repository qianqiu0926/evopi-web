import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  journeyMilestones,
  professionBranches,
  type EvolutionLane,
  type Milestone,
  type MilestoneKind,
  type Profession,
} from '../data'
import { PetSprite } from './PetSprite'

/* ============================================================
   EvolutionMapCanvas · EvoMAP 进化中枢
   - 默认全览一张大画布，放大后探索里程碑
   - 主画布保持干净，只显示阶段、时间、核心等级
   - 点击里程碑后打开右侧记录面板，查看交互证据
   - PiCore 与宠物 Level 在中枢联动展示
   ============================================================ */

const CANVAS = {
  width: 3800,
  height: 2400,
  minX: -1900,
  minY: -1200,
}

const evolutionLanes: Array<{ lane: EvolutionLane; label: string; y: number }> = [
  { lane: 'user', label: '用户进化线', y: -260 },
  { lane: 'agent', label: 'Agent 进化线', y: 180 },
]

const CALENDAR = {
  top: -560,
  monthWidth: 960,
  monthGap: 74,
  rowGap: 96,
  maxColumns: 3,
  monthHeight: 1010,
  weekStep: 150,
  dayStep: 116,
  laneOffset: 28,
}

type PlacedMilestone = {
  milestone: Milestone
  x: number
  y: number
  dayY: number
  monthKey: string
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const kindMeta: Record<MilestoneKind, { color: string; ring: string; label: string; icon: string }> = {
  start: { color: 'var(--cute-mint)', ring: '#68d69f', label: '起点', icon: 'soft-sparkle-twinkle' },
  data: { color: 'var(--cute-blue)', ring: '#72bfff', label: '资料', icon: 'soft-database-stack' },
  goal: { color: 'var(--cute-yellow)', ring: '#f4c642', label: '目标', icon: 'soft-target-bullseye' },
  permission: { color: 'var(--cute-lilac)', ring: '#a997ff', label: '权限', icon: 'soft-unlock-next' },
  core: { color: 'var(--cute-pink)', ring: '#ff97bd', label: '生命核', icon: 'soft-heart-favorite' },
  skill: { color: 'var(--cute-peach)', ring: '#ffac7a', label: '技能', icon: 'soft-settings-gear' },
  current: { color: 'var(--cute-blue)', ring: '#4f9df7', label: '当前', icon: 'soft-sparkle-edit' },
}

export function EvolutionMapCanvas({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const [transform, setTransform] = useState({ x: 0, y: 24, scale: 0.4 })
  const [selected, setSelected] = useState<Milestone | null>(null)
  const [profession, setProfession] = useState<Profession>('manager')
  const [branchOpen, setBranchOpen] = useState(false)
  const drag = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  })
  const wrapRef = useRef<HTMLDivElement>(null)

  const achievedMilestones = useMemo(() => journeyMilestones.filter((item) => item.achieved), [])
  const currentCoreLevel = Math.max(1, ...achievedMilestones.map((item) => item.coreLevel ?? 1))
  const currentPetLevel = Math.max(1, ...achievedMilestones.map((item) => item.petLevel ?? 1))
  const latestPermission = [...achievedMilestones].reverse().find((item) => item.permissionLevel)?.permissionLevel ?? 'L1'
  const activeBranch = professionBranches.find((branch) => branch.id === profession) ?? professionBranches[0]
  const calendarLayout = useMemo(() => buildCalendarLayout(journeyMilestones), [])
  const placedMilestones = calendarLayout.milestones
  const currentMilestone = [...placedMilestones].reverse().find((item) => item.milestone.achieved && item.milestone.kind === 'current')
    ?? [...placedMilestones].reverse().find((item) => item.milestone.achieved)
  const dayGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; x: number; y: number; achieved: boolean }>()
    placedMilestones.forEach((placed) => {
      const current = groups.get(placed.milestone.dayKey)
      if (!current) {
        groups.set(placed.milestone.dayKey, {
          key: placed.milestone.dayKey,
          label: placed.milestone.dayLabel,
          x: placed.x,
          y: placed.dayY,
          achieved: placed.milestone.achieved,
        })
        return
      }
      current.x = Math.min(current.x, placed.x)
      current.y = Math.min(current.y, placed.dayY)
      current.achieved = current.achieved || placed.milestone.achieved
    })
    return Array.from(groups.values()).sort((a, b) => a.x - b.x)
  }, [placedMilestones])
  const laneJourneys = useMemo(() => evolutionLanes.map(({ lane }) => ({
    lane,
    milestones: placedMilestones.filter((placed) => placed.milestone.lane === lane).sort((a, b) => a.x - b.x),
  })), [placedMilestones])

  const fitOverview = useCallback(() => {
    const el = wrapRef.current
    const width = el?.clientWidth ?? window.innerWidth
    const height = el?.clientHeight ?? window.innerHeight
    const scale = clamp(Math.min((width - 130) / CANVAS.width, (height - 150) / CANVAS.height), 0.3, 0.62)
    setTransform({ x: 0, y: 26, scale })
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(fitOverview, 0)
    return () => window.clearTimeout(timer)
  }, [fitOverview])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setTransform((current) => ({
        ...current,
        scale: clamp(current.scale - e.deltaY * 0.0011, 0.3, 1.65),
      }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.map-node, .map-branch-dock, .map-toolbar, .map-record-panel')) return
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, baseX: transform.x, baseY: transform.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [transform.x, transform.y])

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    setTransform((current) => ({ ...current, x: drag.current.baseX + dx, y: drag.current.baseY + dy }))
  }, [])

  const onPointerUp = useCallback(() => { drag.current.active = false }, [])

  const zoomBy = (delta: number) => {
    setTransform((current) => ({ ...current, scale: clamp(current.scale + delta, 0.3, 1.65) }))
  }

  const focusMilestone = (milestone: Milestone) => {
    const placed = placedMilestones.find((item) => item.milestone.id === milestone.id)
    const x = placed?.x ?? milestone.x
    const y = placed?.y ?? milestone.y
    setSelected(milestone)
    setTransform((current) => ({
      x: -x * current.scale,
      y: -y * current.scale + 20,
      scale: clamp(Math.max(current.scale, 0.86), 0.3, 1.35),
    }))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, selected])

  const map = (
    <div className={`map-overlay map-calendar-overlay ${embedded ? 'embedded' : ''}`} role="dialog" aria-modal={!embedded} aria-label="EvoMAP 进化中枢">
      <div
        className="map-viewport"
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="map-world"
          style={{ transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.scale})` }}
        >
          <svg className="map-nerves" viewBox={`${CANVAS.minX} ${CANVAS.minY} ${CANVAS.width} ${CANVAS.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <radialGradient id="mapCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#9be8ff" stopOpacity="0.58" />
                <stop offset="54%" stopColor="#b8f4d5" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="mapJourneyLine" x1="0%" x2="100%" y1="50%" y2="50%">
                <stop offset="0%" stopColor="#7eddb0" />
                <stop offset="48%" stopColor="#7ec8ff" />
                <stop offset="100%" stopColor="#ffc5dc" />
              </linearGradient>
            </defs>
            <rect x={CANVAS.minX + 90} y={CANVAS.minY + 80} width={CANVAS.width - 180} height={CANVAS.height - 160} rx="88" className="map-boundary" />
            <circle cx="0" cy="0" r="520" fill="url(#mapCoreGlow)" />
            <ellipse cx="-1020" cy="160" rx="640" ry="410" className="map-region region-memory" />
            <ellipse cx="-240" cy="-250" rx="640" ry="380" className="map-region region-permission" />
            <ellipse cx="930" cy="-20" rx="690" ry="430" className="map-region region-community" />
            <ellipse cx="1560" cy="160" rx="460" ry="340" className="map-region region-future" />

            {calendarLayout.months.map((month) => (
              <g className={month.isFuture ? 'map-month-panel future' : 'map-month-panel'} key={month.key}>
                <rect x={month.x} y={month.y} width={CALENDAR.monthWidth} height={CALENDAR.monthHeight} rx="34" />
                <text x={month.x + 28} y={month.y + 48}>{month.label}</text>
              </g>
            ))}

            {dayGroups.map((day) => (
              <g className={day.achieved ? 'map-day-column' : 'map-day-column future'} key={day.key}>
                <line x1={day.x} y1={day.y - 44} x2={day.x} y2={day.y + 66} />
              </g>
            ))}

            {evolutionLanes.map((lane) => (
              <g className={`map-lane-guide lane-${lane.lane}`} key={lane.lane}>
                <line x1={calendarLayout.bounds.left} y1={lane.y} x2={calendarLayout.bounds.right} y2={lane.y} />
                <text x={calendarLayout.bounds.left - 34} y={lane.y - 22}>{lane.label}</text>
              </g>
            ))}

            {laneJourneys.map(({ lane, milestones }) => milestones.slice(0, -1).map((milestone, index) => {
              const next = milestones[index + 1]
              return (
                <path
                  className={`map-link lane-${lane} ${milestone.milestone.achieved && next.milestone.achieved ? 'solid' : 'dashed'}`}
                  d={journeyPath(milestone, next)}
                  key={`${lane}-${milestone.milestone.id}`}
                />
              )
            }))}

            {placedMilestones.map((placed) => (
              <line
                className={placed.milestone.achieved ? 'map-nerve-line' : 'map-nerve-line future'}
                key={`nerve-${placed.milestone.id}`}
                x1="0"
                y1="640"
                x2={placed.x}
                y2={placed.y}
              />
            ))}
          </svg>

          <div className="map-core map-calendar-core" style={{ top: calendarLayout.bounds.bottom + 220 } as CSSProperties}>
            <span className="map-core-ring r1" />
            <span className="map-core-ring r2" />
            <span className="map-core-ring r3" />
            <div className="map-core-body">
              <img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" />
              <strong>PiCore Lv.{currentCoreLevel}</strong>
              <span>进化中枢</span>
            </div>
            <div className="map-core-stats">
              <em>小奶狗 Lv.{currentPetLevel}</em>
              <em>{latestPermission}</em>
              <em>{achievedMilestones.length} 个里程碑</em>
            </div>
          </div>

          {dayGroups.map((day) => (
            <div className={day.achieved ? 'map-date-pin' : 'map-date-pin future'} key={`pin-${day.key}`} style={{ left: day.x, top: day.y - 46 } as CSSProperties}>
              {day.label}
            </div>
          ))}

          {currentMilestone && (
            <div className="map-running-pet" style={{ left: currentMilestone.x + 92, top: currentMilestone.y - 94 } as CSSProperties}>
              <span className="map-pet-trail" />
              <PetSprite mood="happy" size={96} />
              <em>奔跑中 · Lv.{currentPetLevel}</em>
            </div>
          )}

          {placedMilestones.map((placed) => {
            const milestone = placed.milestone
            const meta = kindMeta[milestone.kind]
            return (
              <button
                className={`map-node kind-${milestone.kind} ${milestone.achieved ? 'achieved' : 'future'} ${selected?.id === milestone.id ? 'active' : ''}`}
                key={milestone.id}
                style={{ left: placed.x, top: placed.y, '--node-color': meta.color, '--node-ring': meta.ring } as CSSProperties}
                onClick={() => focusMilestone(milestone)}
              >
                <span className="map-node-dot">
                  <img src={`/cute-line-icons/${meta.icon}.png`} alt="" />
                  {milestone.kind === 'current' && <span className="map-node-pulse" />}
                </span>
                <span className="map-node-label">
                  <em>{milestone.badge ?? meta.label}</em>
                  <strong>{milestone.title}</strong>
                  <span>{milestone.dayLabel} · {laneLabel(milestone.lane)}{milestone.coreLevel ? ` · PiCore Lv.${milestone.coreLevel}` : ''}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="map-toolbar">
        <div className="map-toolbar-title">
          <strong>EvoMAP 进化中枢</strong>
          <span>全览你的资料、目标、权限、PiCore 和宠物养成旅程</span>
        </div>
        <div className="map-prof-pick" role="group" aria-label="选择个体进化分支">
          <span className="map-prof-label">个体分支</span>
          {professionBranches.map((branch) => (
            <button
              className={profession === branch.id ? 'map-prof active' : 'map-prof'}
              key={branch.id}
              onClick={() => {
                setProfession(branch.id)
                setBranchOpen(true)
              }}
              title={branch.desc}
            >
              {branch.label}
            </button>
          ))}
        </div>
        <div className="map-zoom">
          <button onClick={() => zoomBy(0.14)} aria-label="放大">+</button>
          <button onClick={() => zoomBy(-0.14)} aria-label="缩小">-</button>
          <button onClick={fitOverview} aria-label="全览">全览</button>
          <button onClick={onClose} aria-label={embedded ? '打开全屏进化中枢' : '关闭进化中枢'}>{embedded ? '全屏' : '返回'}</button>
        </div>
      </div>

      <aside className={branchOpen ? 'map-branch-dock open' : 'map-branch-dock collapsed'}>
        <button className="map-branch-toggle" onClick={() => setBranchOpen((value) => !value)}>
          <img className="cute-icon" src={`/cute-line-icons/${activeBranch.icon}.png`} alt="" />
          <span>{activeBranch.label}分支</span>
          <em>{branchOpen ? '收起' : '展开'}</em>
        </button>
        {branchOpen && (
          <div className="map-branch-dock-body">
            <p>{activeBranch.desc}</p>
            <div className="map-branch-nodes">
              {activeBranch.nodes.map((node, index) => (
                <article className="map-branch-node" key={node.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{node.title}</strong>
                  <em>{node.hint}</em>
                </article>
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="map-hint">拖拽平移 · 滚轮缩放 · 点击里程碑查看交互记录{embedded ? '' : ' · Esc 返回'}</div>
      {selected && <RecordPanel milestone={selected} onClose={() => setSelected(null)} />}
    </div>
  )

  return embedded ? map : createPortal(map, document.body)
}

function buildCalendarLayout(milestones: Milestone[]) {
  const realMonthKeys = Array.from(new Set(
    milestones
      .filter((milestone) => milestone.dayKey !== 'future')
      .map((milestone) => milestone.dayKey.slice(0, 7)),
  )).sort()
  const hasFuture = milestones.some((milestone) => milestone.dayKey === 'future')
  const monthKeys = hasFuture ? [...realMonthKeys, 'future'] : realMonthKeys
  const columnCount = Math.max(1, Math.min(CALENDAR.maxColumns, monthKeys.length))
  const rowCount = Math.max(1, Math.ceil(monthKeys.length / columnCount))
  const totalWidth = columnCount * CALENDAR.monthWidth + Math.max(0, columnCount - 1) * CALENDAR.monthGap
  const totalHeight = rowCount * CALENDAR.monthHeight + Math.max(0, rowCount - 1) * CALENDAR.rowGap
  const firstX = -totalWidth / 2
  const firstY = -totalHeight / 2
  const months = monthKeys.map((key, index) => ({
    key,
    isFuture: key === 'future',
    label: key === 'future' ? '未来' : monthLabel(key),
    x: firstX + (index % columnCount) * (CALENDAR.monthWidth + CALENDAR.monthGap),
    y: firstY + Math.floor(index / columnCount) * (CALENDAR.monthHeight + CALENDAR.rowGap),
  }))
  const monthByKey = new Map(months.map((month) => [month.key, month]))
  const laneOffset = (lane: EvolutionLane) => lane === 'user' ? -CALENDAR.laneOffset : CALENDAR.laneOffset
  const milestonesInSameDay = new Map<string, number>()

  const placed = milestones.map((milestone): PlacedMilestone => {
    const monthKey = milestone.dayKey === 'future' ? 'future' : milestone.dayKey.slice(0, 7)
    const month = monthByKey.get(monthKey) ?? months[0]
    if (!month) {
      return { milestone, x: milestone.x, y: milestone.y, dayY: milestone.y, monthKey }
    }
    if (milestone.dayKey === 'future') {
      const laneY = milestone.lane === 'user' ? month.y + 320 : month.y + 570
      return {
        milestone,
        x: month.x + CALENDAR.monthWidth / 2,
        y: laneY,
        dayY: laneY,
        monthKey,
      }
    }

    const date = parseDayKey(milestone.dayKey)
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const weekIndex = Math.floor((date.getDate() + firstDay.getDay() - 1) / 7)
    const dayOfWeek = date.getDay()
    const sameDayIndex = milestonesInSameDay.get(`${milestone.dayKey}-${milestone.lane}`) ?? 0
    milestonesInSameDay.set(`${milestone.dayKey}-${milestone.lane}`, sameDayIndex + 1)
    const dayY = month.y + 136 + dayOfWeek * CALENDAR.dayStep
    return {
      milestone,
      x: month.x + 74 + weekIndex * CALENDAR.weekStep + sameDayIndex * 12,
      y: dayY + laneOffset(milestone.lane),
      dayY,
      monthKey,
    }
  })

  return {
    months,
    milestones: placed,
    bounds: {
      left: firstX - 52,
      right: firstX + totalWidth + 52,
      bottom: firstY + totalHeight,
    },
  }
}

function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `${year}年${Number(month)}月`
}

function journeyPath(current: PlacedMilestone, next: PlacedMilestone): string {
  const midX = (current.x + next.x) / 2
  const lift = current.milestone.lane === next.milestone.lane ? (current.milestone.lane === 'user' ? -58 : 58) : (current.y > next.y ? -90 : 90)
  return `M ${current.x} ${current.y} C ${midX} ${current.y + lift}, ${midX} ${next.y - lift}, ${next.x} ${next.y}`
}

function laneLabel(lane: EvolutionLane): string {
  return lane === 'user' ? '用户进化' : 'Agent 进化'
}

function RecordPanel({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  const meta = kindMeta[milestone.kind]
  return (
    <aside className="map-record-panel" style={{ '--panel-color': meta.color } as CSSProperties}>
      <div className="map-record-head">
        <div>
          <span className="map-record-kind">{meta.label}</span>
          <strong>{milestone.title}</strong>
          <span className="map-record-date">{milestone.evolutionDate} · {laneLabel(milestone.lane)}{milestone.coreLevel ? ` · PiCore Lv.${milestone.coreLevel}` : ''}</span>
        </div>
        <button className="map-record-close" onClick={onClose} aria-label="关闭记录面板">关闭</button>
      </div>
      {milestone.desc && <p className="map-record-desc">{milestone.desc}</p>}
      {milestone.diary && (
        <div className="map-diary">
          <article className="map-diary-card user">
            <span>用户日记</span>
            <p>{milestone.diary.user}</p>
          </article>
          <article className="map-diary-card agent">
            <span>Agent 日记</span>
            <p>{milestone.diary.agent}</p>
          </article>
        </div>
      )}
      <div className="map-record-metrics">
        {milestone.petLevel && <span>宠物 Lv.{milestone.petLevel}</span>}
        {milestone.permissionLevel && <span>{milestone.permissionLevel}</span>}
        <span>{milestone.achieved ? '已达成' : '待解锁'}</span>
      </div>
      {milestone.unlocks && milestone.unlocks.length > 0 && (
        <div className="map-record-unlocks">
          {milestone.unlocks.map((item) => <em key={item}>{item}</em>)}
        </div>
      )}
      <div className="map-record-list">
        {milestone.records && milestone.records.length > 0 ? (
          milestone.records.map((record, index) => (
            <article className={`map-record-item type-${record.type}`} key={`${record.title}-${index}`}>
              <span className="map-record-type">{recordTypeLabel(record.type)}</span>
              <strong>{record.title}</strong>
              <span>{record.detail}</span>
              <em>{record.time}</em>
            </article>
          ))
        ) : (
          <p className="map-record-empty">{milestone.achieved ? '这个里程碑暂无额外记录。' : '尚未达成，继续使用 EvoPi 即可解锁。'}</p>
        )}
      </div>
    </aside>
  )
}

function recordTypeLabel(type: 'log' | 'screenshot' | 'dialogue'): string {
  const labels = { log: '日志', screenshot: '截图', dialogue: '对话' }
  return labels[type]
}

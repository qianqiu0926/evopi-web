import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import {
  journeyMilestones,
  professionBranches,
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

export function EvolutionMapCanvas({ onClose }: { onClose: () => void }) {
  const [transform, setTransform] = useState({ x: 0, y: 24, scale: 0.4 })
  const [selected, setSelected] = useState<Milestone | null>(null)
  const [profession, setProfession] = useState<Profession>('manager')
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
  const branchPosition = useMemo(() => ({
    x: Math.cos(activeBranch.angle) * 900,
    y: Math.sin(activeBranch.angle) * 760,
  }), [activeBranch.angle])

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
    if ((e.target as HTMLElement).closest('.map-node, .map-branch, .map-toolbar, .map-record-panel')) return
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
    setSelected(milestone)
    setTransform((current) => ({
      x: -milestone.x * current.scale,
      y: -milestone.y * current.scale + 20,
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

  return (
    <div className="map-overlay" role="dialog" aria-modal="true" aria-label="EvoMAP 进化中枢">
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

            {journeyMilestones.slice(0, -1).map((milestone, index) => {
              const next = journeyMilestones[index + 1]
              return (
                <path
                  className={`map-link ${milestone.achieved && next.achieved ? 'solid' : 'dashed'}`}
                  d={journeyPath(milestone, next)}
                  key={milestone.id}
                />
              )
            })}

            {journeyMilestones.map((milestone) => (
              <line
                className={milestone.achieved ? 'map-nerve-line' : 'map-nerve-line future'}
                key={`nerve-${milestone.id}`}
                x1="0"
                y1="0"
                x2={milestone.x}
                y2={milestone.y}
              />
            ))}
            <path className="map-branch-link" d={`M 0 0 C ${branchPosition.x * 0.28} ${branchPosition.y * 0.18}, ${branchPosition.x * 0.66} ${branchPosition.y * 0.92}, ${branchPosition.x} ${branchPosition.y}`} />
          </svg>

          <div className="map-core">
            <span className="map-core-ring r1" />
            <span className="map-core-ring r2" />
            <span className="map-core-ring r3" />
            <div className="map-core-pet">
              <PetSprite mood="happy" size={86} />
            </div>
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

          {journeyMilestones.map((milestone) => {
            const meta = kindMeta[milestone.kind]
            return (
              <button
                className={`map-node kind-${milestone.kind} ${milestone.achieved ? 'achieved' : 'future'} ${selected?.id === milestone.id ? 'active' : ''}`}
                key={milestone.id}
                style={{ left: milestone.x, top: milestone.y, '--node-color': meta.color, '--node-ring': meta.ring } as CSSProperties}
                onClick={() => focusMilestone(milestone)}
              >
                <span className="map-node-dot">
                  <img src={`/cute-line-icons/${meta.icon}.png`} alt="" />
                  {milestone.kind === 'current' && <span className="map-node-pulse" />}
                </span>
                <span className="map-node-label">
                  <em>{milestone.badge ?? meta.label}</em>
                  <strong>{milestone.title}</strong>
                  <span>{milestone.date}{milestone.coreLevel ? ` · PiCore Lv.${milestone.coreLevel}` : ''}</span>
                </span>
              </button>
            )
          })}

          <div className="map-branch" style={{ left: branchPosition.x, top: branchPosition.y } as CSSProperties}>
            <div className="map-branch-head">
              <img className="cute-icon" src={`/cute-line-icons/${activeBranch.icon}.png`} alt="" />
              <div>
                <strong>{activeBranch.label}进化分支</strong>
                <span>{activeBranch.desc}</span>
              </div>
            </div>
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
              onClick={() => setProfession(branch.id)}
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
          <button onClick={onClose} aria-label="关闭进化中枢">返回</button>
        </div>
      </div>

      <div className="map-hint">拖拽平移 · 滚轮缩放 · 点击里程碑查看交互记录 · Esc 返回</div>
      {selected && <RecordPanel milestone={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function journeyPath(current: Milestone, next: Milestone): string {
  const midX = (current.x + next.x) / 2
  const lift = current.y > next.y ? -90 : 90
  return `M ${current.x} ${current.y} C ${midX} ${current.y + lift}, ${midX} ${next.y - lift}, ${next.x} ${next.y}`
}

function RecordPanel({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  const meta = kindMeta[milestone.kind]
  return (
    <aside className="map-record-panel" style={{ '--panel-color': meta.color } as CSSProperties}>
      <div className="map-record-head">
        <div>
          <span className="map-record-kind">{meta.label}</span>
          <strong>{milestone.title}</strong>
          <span className="map-record-date">{milestone.date}{milestone.coreLevel ? ` · PiCore Lv.${milestone.coreLevel}` : ''}</span>
        </div>
        <button className="map-record-close" onClick={onClose} aria-label="关闭记录面板">关闭</button>
      </div>
      {milestone.desc && <p className="map-record-desc">{milestone.desc}</p>}
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

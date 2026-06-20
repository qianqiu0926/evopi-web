import { useCallback, useEffect, useRef, useState } from 'react'
import {
  journeyMilestones,
  professionBranches,
  type Milestone,
  type MilestoneKind,
  type Profession,
} from '../data'

/* ============================================================
   EvolutionMapCanvas · 进化旅程全屏地图画布
   - 点击进化中枢后全屏打开
   - 可拖拽平移 + 滚轮缩放（pinch / wheel）
   - 神经网络中枢 = PiCore，向外辐射成长轨迹
   - 主旅程路径：起点 → 里程碑（已达成实线 / 未来虚线）
   - 个性化分支：随职业变化（管理者/老师/创业者/通用）
   - 点里程碑 → 右侧滑出交互记录面板（日志/截图/对话）
   ============================================================ */

const kindMeta: Record<MilestoneKind, { color: string; ring: string }> = {
  start: { color: 'var(--cute-mint)', ring: '#7eddb0' },
  data: { color: 'var(--cute-blue)', ring: '#7ec8ff' },
  goal: { color: 'var(--cute-yellow)', ring: '#ffd76b' },
  permission: { color: 'var(--cute-lilac)', ring: '#b8a6ff' },
  core: { color: 'var(--cute-pink)', ring: '#ff9ec4' },
  skill: { color: 'var(--cute-peach)', ring: '#ffb38a' },
  current: { color: 'var(--cute-blue)', ring: '#60a5fa' },
}

export function EvolutionMapCanvas({ onClose }: { onClose: () => void }) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.72 })
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

  // 平移
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.map-node, .map-branch, .map-toolbar, .map-record-panel')) return
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, baseX: transform.x, baseY: transform.y }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [transform.x, transform.y])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    setTransform((t) => ({ ...t, x: drag.current.baseX + dx, y: drag.current.baseY + dy }))
  }, [])

  const onPointerUp = useCallback(() => { drag.current.active = false }, [])

  // 缩放（滚轮）
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = -e.deltaY * 0.0012
      setTransform((t) => ({ ...t, scale: Math.min(1.8, Math.max(0.35, t.scale + delta)) }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (d: number) =>
    setTransform((t) => ({ ...t, scale: Math.min(1.8, Math.max(0.35, t.scale + d)) }))

  const reset = () => setTransform({ x: 0, y: 0, scale: 0.72 })

  const activeBranch = professionBranches.find((b) => b.id === profession)!

  // Esc 关闭 / 选中清除
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (selected) setSelected(null); else onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, selected])

  return (
    <div className="map-overlay" role="dialog" aria-modal="true" aria-label="进化旅程地图">
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
          {/* 神经网络背景连线（装饰，从中心放射） */}
          <svg className="map-nerves" viewBox="-1000 -700 2000 1400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <radialGradient id="nerveGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--cute-blue)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--cute-blue)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="320" fill="url(#nerveGlow)" />
            {/* 主旅程连线 */}
            {journeyMilestones.slice(0, -1).map((m, i) => {
              const next = journeyMilestones[i + 1]
              const achieved = m.achieved && next.achieved
              return (
                <line
                  key={m.id}
                  x1={m.x}
                  y1={m.y}
                  x2={next.x}
                  y2={next.y}
                  className={`map-link ${achieved ? 'solid' : 'dashed'}`}
                />
              )
            })}
            {/* 中枢放射神经线（装饰） */}
            {[-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4].map((a) => (
              <line key={a} x1="0" y1="0" x2={Math.cos(a) * 280} y2={Math.sin(a) * 280} className="map-nerve-line" />
            ))}
          </svg>

          {/* 中枢：PiCore 神经网络核心 */}
          <div className="map-core">
            <span className="map-core-ring r1" />
            <span className="map-core-ring r2" />
            <span className="map-core-ring r3" />
            <div className="map-core-body">
              <img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" />
              <strong>PiCore</strong>
              <span>进化中枢</span>
            </div>
          </div>

          {/* 主旅程里程碑 */}
          {journeyMilestones.map((m) => (
            <button
              key={m.id}
              className={`map-node kind-${m.kind} ${m.achieved ? '' : 'future'}`}
              style={{ left: m.x, top: m.y, '--node-color': kindMeta[m.kind].color, '--node-ring': kindMeta[m.kind].ring } as React.CSSProperties}
              onClick={() => setSelected(m)}
            >
              <span className="map-node-dot">
                {m.kind === 'current' && <span className="map-node-pulse" />}
              </span>
              <div className="map-node-label">
                <strong>{m.title}</strong>
                <span>{m.date}</span>
              </div>
            </button>
          ))}

          {/* 个性化职业分支 */}
          <div className={`map-branch branch-${profession}`} style={{ '--branch-angle': `${activeBranch.angle}rad` } as React.CSSProperties}>
            <div className="map-branch-head">
              <img className="cute-icon" src={`/cute-line-icons/${activeBranch.icon}.png`} alt="" />
              <strong>{activeBranch.label}进化线</strong>
              <span>{activeBranch.desc}</span>
            </div>
            <div className="map-branch-nodes">
              {activeBranch.nodes.map((n) => (
                <div className="map-branch-node" key={n.title}>
                  <strong>{n.title}</strong>
                  <span>{n.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 顶部工具栏 */}
      <div className="map-toolbar">
        <button className="ghost-btn sm" onClick={onClose}><img className="cute-icon" src="/cute-line-icons/soft-arrow-left.png" alt="" />返回</button>
        <div className="map-prof-pick" role="group" aria-label="选择你的职业">
          <span className="map-prof-label">你的进化线</span>
          {professionBranches.map((b) => (
            <button
              key={b.id}
              className={profession === b.id ? 'map-prof active' : 'map-prof'}
              onClick={() => setProfession(b.id)}
              title={b.desc}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="map-zoom">
          <button onClick={() => zoomBy(0.15)} aria-label="放大">+</button>
          <button onClick={() => zoomBy(-0.15)} aria-label="缩小">−</button>
          <button onClick={reset} aria-label="重置视图">⟲</button>
        </div>
      </div>

      {/* 提示条 */}
      <div className="map-hint">拖拽平移 · 滚轮缩放 · 点里程碑查看记录 · Esc 返回</div>

      {/* 里程碑交互记录面板 */}
      {selected && <RecordPanel milestone={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function RecordPanel({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  const meta = kindMeta[milestone.kind]
  return (
    <aside className="map-record-panel" style={{ '--panel-color': meta.color } as React.CSSProperties}>
      <div className="map-record-head">
        <div>
          <span className="map-record-kind">{kindLabel(milestone.kind)}</span>
          <strong>{milestone.title}</strong>
          <span className="map-record-date">{milestone.date}{milestone.coreLevel ? ` · 生命核 Lv.${milestone.coreLevel}` : ''}</span>
        </div>
        <button className="map-record-close" onClick={onClose} aria-label="关闭">✕</button>
      </div>
      {milestone.desc && <p className="map-record-desc">{milestone.desc}</p>}
      <div className="map-record-list">
        {milestone.records && milestone.records.length > 0 ? (
          milestone.records.map((r, i) => (
            <article className={`map-record-item type-${r.type}`} key={i}>
              <span className="map-record-type">{recordTypeLabel(r.type)}</span>
              <strong>{r.title}</strong>
              <span>{r.detail}</span>
              <em>{r.time}</em>
            </article>
          ))
        ) : (
          <p className="map-record-empty">{milestone.achieved ? '这个里程碑暂无额外记录。' : '尚未达成，继续使用 EvoPi 即可解锁。'}</p>
        )}
      </div>
    </aside>
  )
}

function kindLabel(k: MilestoneKind): string {
  const m: Record<MilestoneKind, string> = {
    start: '起点', data: '资料', goal: '目标', permission: '权限', core: '生命核', skill: '技能', current: '当前',
  }
  return m[k]
}

function recordTypeLabel(t: 'log' | 'screenshot' | 'dialogue'): string {
  const m = { log: '日志', screenshot: '截图', dialogue: '对话' }
  return m[t]
}

import { useState } from 'react'
import { PetSprite } from './PetSprite'
import { Integrations } from './Integrations'
import { AgentTasks } from './AgentTasks'
import { adoptablePets, piModules, petAnimations, type PetMood } from '../data'

type PiCoreEmotion = 'calm' | 'happy' | 'waiting'

/* ============================================================
   PiCorePanel · 右侧生命核面板
   - 以 HappyDog 为可视化身（产品方案：不做成单纯宠物，而是 PiCore 状态体）
   - 状态由用户与 EvoPi 的交互节奏自动驱动
   ============================================================ */
export function PiCorePanel({
  mood,
  emotion,
}: {
  mood: PetMood
  emotion: PiCoreEmotion
}) {
  const [petName, setPetName] = useState(adoptablePets[0].name)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const pet = adoptablePets[0]
  const anim = petAnimations.find((a) => a.mood === mood) ?? petAnimations[0]
  const emotionLabel = emotion === 'happy' ? '开心奔跑' : emotion === 'waiting' ? '等你确认' : anim.label

  const rename = () => {
    const n = draft.trim() || pet.name
    setPetName(n)
    setEditing(false)
    setDraft('')
  }

  const statusCopy = emotion === 'happy'
    ? '你在推进任务或把事情交给 Pi，它正开心地跑起来。'
    : emotion === 'waiting'
      ? '有任务等你确认。你停太久了，它在提醒你回来动一动。'
      : anim.desc

  return (
    <section className="picore-panel">
      <div className="rail-title">
        <span className="cute-icon-wrap"><img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" /></span>
        <div>
          <strong>EvoPi 生命核</strong>
          <span>{`${petName} · Lv.3 · ${emotionLabel}`}</span>
        </div>
      </div>

      {/* 宠物舞台 */}
      <div
        className={`pet-stage mood-${emotion}`}
        aria-label={`PiCore 当前状态：${anim.label}`}
      >
        <div className="pet-floor" />
        {emotion === 'happy' && (
          <div className="pet-hearts" aria-hidden="true">
            <span>♥</span>
            <span>♥</span>
            <span>♥</span>
          </div>
        )}
        <PetSprite mood={mood} size={118} />
        <span className="pet-mood-bubble">{statusCopy}</span>
      </div>

      {/* 养成 / 命名 */}
      {editing ? (
        <div className="adopt-box">
          <p className="adopt-desc">
            现在已进入 PiCore 养成。你可以给它换个称呼，不影响它继续学习你的工作节奏。
          </p>
          <input
            className="text-input"
            placeholder={`给 ${petName} 起个新名字`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') rename() }}
          />
          <div className="auth-aux">
            <button className="primary-btn sm" onClick={rename}>确定</button>
            <button className="ghost-btn sm" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      ) : (
        <div className="pet-owned">
          <div className="growth-copy">
            <span className="tag mint">养成中 · {petName}</span>
            <p>它会根据你推进目标、交给 Pi 代理、停留等待等节奏自动变化，不需要手动抚摸或休息。</p>
          </div>
          <div className="auth-aux">
            <button className="ghost-btn sm" onClick={() => setEditing(true)}>改名</button>
          </div>
        </div>
      )}

      {/* 三个 Pi 模块（产品方案：最多 3 个） */}
      <div className="pi-modules">
        {piModules.map((m) => (
          <div className="state-row pi-module" key={m.name}>
            <img className="cute-icon" src={`/cute-line-icons/${m.icon}.png`} alt="" />
            <div>
              <span>{m.name}</span>
              <strong>{m.value}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* 系统外接：微信/飞书/邮件 转接 + 快捷键回 + 开代理 */}
      <AgentTasks />

      <Integrations />
    </section>
  )
}

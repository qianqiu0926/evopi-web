import { useState } from 'react'
import { PetSprite } from './PetSprite'
import { Integrations } from './Integrations'
import { adoptablePets, piModules, petAnimations, type PetMood } from '../data'

/* ============================================================
   PiCorePanel · 右侧生命核面板
   - 以 HappyDog 为可视化身（产品方案：不做成单纯宠物，而是 PiCore 状态体）
   - 5 种心情对应 PiCore 的学习/待喂/整理/休眠/开心状态
   - 支持认领（命名）、互动（抚摸切换开心）
   ============================================================ */
export function PiCorePanel({
  mood,
  paused,
  onTogglePause,
}: {
  mood: PetMood
  paused: boolean
  onTogglePause: () => void
}) {
  const [petName, setPetName] = useState<string | null>(null) // null = 未认领
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [petting, setPetting] = useState(false)
  const [engaged, setEngaged] = useState(false)
  const pet = adoptablePets[0]
  const anim = petAnimations.find((a) => a.mood === mood) ?? petAnimations[0]

  const claim = () => {
    const n = draft.trim() || pet.name
    setPetName(n)
    setEditing(false)
    setDraft('')
  }

  const petIt = () => {
    setPetting(true)
    setTimeout(() => setPetting(false), 2200)
  }

  const displayMood: PetMood = petting ? 'happy' : paused ? 'sleeping' : engaged ? 'learning' : mood
  const displayAnim = petAnimations.find((a) => a.mood === displayMood) ?? anim

  return (
    <section className="picore-panel">
      <div className="rail-title">
        <span className="cute-icon-wrap"><img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" /></span>
        <div>
          <strong>EvoPi 生命核</strong>
          <span>{petName ? `${petName} · ${displayAnim.label}` : '认领你的 Pi 伙伴'}</span>
        </div>
      </div>

      {/* 宠物舞台 */}
      <div
        className="pet-stage"
        onClick={petIt}
        onPointerEnter={() => setEngaged(true)}
        onPointerLeave={() => setEngaged(false)}
        onFocus={() => setEngaged(true)}
        onBlur={() => setEngaged(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            petIt()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`互动 PiCore，当前状态：${displayAnim.label}`}
      >
        <div className="pet-floor" />
        <PetSprite mood={displayMood} size={118} paused={paused && !petting} />
        <span className="pet-mood-bubble">{displayAnim.desc}</span>
      </div>

      {/* 认领 / 命名 */}
      {!petName ? (
        <div className="adopt-box">
          <p className="adopt-desc">
            领养 <strong>{pet.name}</strong> 作为你的 PiCore 化身。它不是普通宠物，而是用状态反映你的学习与协作进度。
          </p>
          <button className="primary-btn sm" onClick={() => setEditing(true)}>
            <img className="cute-icon" src="/cute-line-icons/soft-heart-favorite.png" alt="" />
            认领这只 Pi
          </button>
        </div>
      ) : editing ? (
        <div className="adopt-box">
          <input
            className="text-input"
            placeholder={`给 ${petName} 起个新名字`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') claim() }}
          />
          <div className="auth-aux">
            <button className="primary-btn sm" onClick={claim}>确定</button>
            <button className="ghost-btn sm" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      ) : (
        <div className="pet-owned">
          <span className="tag">已认领 · {petName}</span>
          <div className="auth-aux">
            <button className="ghost-btn sm" onClick={petIt}>
              <img className="cute-icon" src="/cute-line-icons/soft-favorite-collection.png" alt="" />
              抚摸
            </button>
            <button className="ghost-btn sm" onClick={() => setEditing(true)}>改名</button>
            <button className="ghost-btn sm" onClick={onTogglePause}>
              {paused ? '唤醒' : '让它休息'}
            </button>
          </div>
        </div>
      )}

      {/* 三个 Pi 模块（产品方案：最多 3 个） */}
      {petName && (
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
      )}

      {/* 系统外接：微信/飞书/邮件 转接 + 快捷键回 + 开代理 */}
      {petName && <Integrations />}

      {editing && !petName && null}
    </section>
  )
}

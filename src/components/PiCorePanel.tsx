import { useState } from 'react'
import { PetSprite } from './PetSprite'
import { Integrations } from './Integrations'
import { adoptablePets, petAnimations, type PetMood } from '../data'

type PiCoreEmotion = 'calm' | 'happy' | 'waiting'

const iconPath = (name: string) => `/cute-line-icons/${name}.png`

/* ============================================================
   PiCorePanel · 右侧生命核面板
   - 以 HappyDog 为可视化身（产品方案：不做成单纯宠物，而是 PiCore 状态体）
   - 状态由用户与 EvoPi 的交互节奏自动驱动
   ============================================================ */
export function PiCorePanel({
  mood,
  moodIsLive = false,
  emotion,
  healthActive = false,
  onOpenHealth,
}: {
  mood: PetMood
  moodIsLive?: boolean
  emotion: PiCoreEmotion
  healthActive?: boolean
  onOpenHealth?: () => void
}) {
  const [petName, setPetName] = useState(adoptablePets[0].name)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const pet = adoptablePets[0]
  const anim = petAnimations.find((a) => a.mood === mood) ?? petAnimations[0]
  const emotionLabel = moodIsLive ? anim.label : emotion === 'happy' ? '开心奔跑' : emotion === 'waiting' ? '等你确认' : anim.label

  const rename = () => {
    const n = draft.trim() || pet.name
    setPetName(n)
    setEditing(false)
    setDraft('')
  }

  const liveStatusCopy: Record<PetMood, string> = {
    idle: anim.desc,
    happy: 'Pi 听到你确认或产生了新灵感，正在兴奋地回应你。',
    feeding: 'Pi 感觉你在修正或卡住了，会先放慢节奏，把问题拆小。',
    learning: 'Pi 正在理解你的表达、任务和语气，并准备接住下一步。',
    sleeping: 'Pi 会进入低打扰状态，等你回来再继续确认。',
  }

  const statusCopy = moodIsLive
    ? liveStatusCopy[mood]
    : emotion === 'happy'
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

      <section className={`pi-health-panel ${healthActive ? 'active' : ''}`}>
        <div className="pi-health-preview">
          <div className="pi-health-stick" aria-hidden="true">
            <span className="head" />
            <span className="body" />
            <span className="arms" />
            <span className="legs" />
          </div>
          <div>
            <strong>{healthActive ? '正在检测你的动作' : '身心健康检测'}</strong>
            <span>{healthActive ? 'Pi 正在看肩、髋、膝、踝的动作线。' : '站到屏幕前，Pi 会用视频帮你调动作。'}</span>
          </div>
        </div>

        <div className="pi-health-metrics">
          <article>
            <span>识别协议</span>
            <strong>OpenPose BODY_25</strong>
          </article>
          <article>
            <span>视觉模型</span>
            <strong>MiniMax</strong>
          </article>
          <article>
            <span>语音教练</span>
            <strong>豆包</strong>
          </article>
        </div>

        <button className="primary-btn pi-health-start" onClick={onOpenHealth} type="button">
          <img className="cute-icon" src={iconPath('soft-heart-favorite')} alt="" />
          {healthActive ? '回到训练画面' : '开始身心检测'}
        </button>
      </section>

      <Integrations />
    </section>
  )
}

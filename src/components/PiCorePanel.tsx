import { useMemo, useState } from 'react'
import { PetSprite } from './PetSprite'
import { AgentTasks } from './AgentTasks'
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
}: {
  mood: PetMood
  moodIsLive?: boolean
  emotion: PiCoreEmotion
  healthActive?: boolean
}) {
  const petName = adoptablePets[0].name
  const [pokeCount, setPokeCount] = useState(0)
  const anim = petAnimations.find((a) => a.mood === mood) ?? petAnimations[0]
  const displayMood = pokeCount % 3 === 1 ? '开心回应' : pokeCount % 3 === 2 ? '摇尾巴' : moodIsLive ? anim.label : emotion === 'happy' ? '开心奔跑' : emotion === 'waiting' ? '等你确认' : anim.label

  const liveStatusCopy: Record<PetMood, string> = {
    idle: anim.desc,
    happy: 'Pi 听到你确认或产生了新灵感，正在兴奋地回应你。',
    feeding: 'Pi 感觉你在修正或卡住了，会先放慢节奏，把问题拆小。',
    learning: 'Pi 正在理解你的表达、任务和语气，并准备接住下一步。',
    sleeping: 'Pi 会进入低打扰状态，等你回来再继续确认。',
  }

  const statusCopy = pokeCount % 3 === 1
    ? '你戳了它一下，它抬头看你，像是在说：我在，继续吧。'
    : pokeCount % 3 === 2
      ? '它围着你跑了一小圈，今天的能量又亮了一格。'
      : moodIsLive
    ? liveStatusCopy[mood]
    : emotion === 'happy'
      ? '你在推进任务或把事情交给 Pi，它正开心地跑起来。'
      : emotion === 'waiting'
        ? '有任务等你确认。你停太久了，它在提醒你回来动一动。'
        : anim.desc

  const petStats = useMemo(() => {
    const workLoad = emotion === 'happy' || mood === 'learning' ? 76 : emotion === 'waiting' ? 58 : 42
    const fitness = healthActive ? 4 : mood === 'happy' ? 3 : 2
    const growth = Math.min(96, 63 + pokeCount * 4 + (healthActive ? 9 : 0) + (emotion === 'happy' ? 8 : 0))
    return { workLoad, fitness, growth }
  }, [emotion, healthActive, mood, pokeCount])

  return (
    <section className="picore-panel">
      <div className="rail-title">
        <span className="cute-icon-wrap"><img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" /></span>
        <div>
          <strong>EvoPi 生命核</strong>
          <span>{`${petName} · Lv.3 · ${displayMood}`}</span>
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

      <div className="pet-owned pet-interaction-card">
        <div className="growth-copy">
          <span className="tag mint">养成中 · {petName}</span>
          <p>它会根据今日工作量、锻炼完成度和你交给 Pi 的任务自动成长。</p>
        </div>
        <div className="auth-aux">
          <button className="ghost-btn sm" onClick={() => setPokeCount((value) => value + 1)}>戳一戳</button>
        </div>
      </div>

      <section className="pet-progress-panel">
        <PetMeter icon="soft-sparkle-edit" label="今日工作量" value={petStats.workLoad} note={petStats.workLoad >= 70 ? '跑得很勤快' : '节奏稳定'} />
        <PetStars label="身心健康锻炼" value={petStats.fitness} active={healthActive} />
        <PetMeter icon="soft-heart-favorite" label="成长进度" value={petStats.growth} note={`Lv.4 还差 ${Math.max(0, 100 - petStats.growth)}%`} />
        <div className="pet-daily-line">
          <img className="cute-icon" src={iconPath('soft-note-sticky')} alt="" />
          <span>{pokeCount > 0 ? '它记下了这次互动，今天更愿意陪你继续推进。' : '今天先保持轻量节奏，完成一个小任务就会涨一点经验。'}</span>
        </div>
      </section>

      <AgentTasks />
      <Integrations />
    </section>
  )
}

function PetMeter({ icon, label, value, note }: { icon: string; label: string; value: number; note: string }) {
  return (
    <article className="pet-meter">
      <div className="pet-meter-head">
        <img className="cute-icon" src={iconPath(icon)} alt="" />
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="pet-meter-track" aria-hidden="true">
        <i style={{ width: `${value}%` }} />
      </div>
      <em>{note}</em>
    </article>
  )
}

function PetStars({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <article className="pet-stars">
      <div>
        <span>{label}</span>
        <strong>{active ? '训练中' : `${value}/5 星`}</strong>
      </div>
      <div className="pet-star-row" aria-label={`${label} ${value} 星`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <i className={index < value ? 'on' : ''} key={index}>★</i>
        ))}
      </div>
    </article>
  )
}

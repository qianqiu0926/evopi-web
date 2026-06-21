import { useEffect, useMemo, useState } from 'react'

/* eslint-disable react-refresh/only-export-components -- tutorial helpers co-located with the component by design */

/* ============================================================
   Tutorial · 新手教程（内嵌 tooltip 引导）
   - 首次登录或设置页"重新看教程"时弹出
   - 5-7 步，高亮目标元素 + tooltip 说明，可跳过/上一步/下一步
   - 用 CSS box-shadow 高亮目标，不遮挡点击
   - 完成后调 onComplete 持久化到后端（localStorage 兜底）
   ============================================================ */

export type TutorialStep = {
  target: string
  title: string
  body: string
  placement?: 'bottom' | 'top' | 'right' | 'left'
}

export const tutorialSteps: TutorialStep[] = [
  {
    target: '[data-tutorial="today-input"]',
    title: '今日工作台 · 每日起点',
    body: '在顶部输入框告诉 EvoPi 你现在想做什么，它会整理待确认内容并归纳近期事项。',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="goal-workspace"]',
    title: '目标舱 · 长期事项执行区',
    body: '点开一个目标卡进入工作舱。小票流是 EvoPi 一步步帮你推进的真实步骤，对话区讨论方案，资料架引用 EvoMap 经验。',
    placement: 'right',
  },
  {
    target: '[data-tutorial="memory"]',
    title: '记忆库 · 个人知识沉淀',
    body: '核心/情景/语义/程序/项目/技能六类记忆，每条可确认、合并或忽略。',
    placement: 'right',
  },
  {
    target: '[data-tutorial="piroom"]',
    title: 'PiRoom · 多视角头脑风暴',
    body: '选一个人物（马斯克 / 特朗普 / 张一鸣…），从他们的视角对话，突破自己的思维定式。',
    placement: 'right',
  },
  {
    target: '[data-tutorial="skills"]',
    title: '技能中心 + EvoMap',
    body: '连接 EvoMap 获取全网经验，搜索可复用 recipe，把你的流程发布成 recipe 给更多人复用。',
    placement: 'right',
  },
  {
    target: '[data-tutorial="evolution"]',
    title: '进化日志 · EvoPi 的成长',
    body: '实时事件流 + 链轨图：Signal → Skill → Recipe → EvolutionEvent，看 EvoPi 怎么一步步变强。',
    placement: 'left',
  },
  {
    target: '[data-tutorial="privacy"]',
    title: '隐私权限 · 你始终在控制',
    body: '协作方式决定 EvoPi 多主动，数据权限每项自动化可控，一键暂停随时收紧。',
    placement: 'left',
  },
]

export function Tutorial({
  steps = tutorialSteps,
  onClose,
  onComplete,
}: {
  steps?: TutorialStep[]
  onClose: () => void
  onComplete?: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  // Spotlight position follows the target element; if the selector misses
  // (target not rendered, e.g. user not on that page), center the tooltip.
  const [spot, setSpot] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const tooltip = useMemo(() => {
    if (!step) return null
    const placement = step.placement ?? 'bottom'
    if (!spot) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', placement }
    }
    const pad = 14
    if (placement === 'bottom') return { top: spot.top + spot.height + pad, left: spot.left, transform: 'none', placement }
    if (placement === 'top') return { top: Math.max(16, spot.top - 140), left: spot.left, transform: 'none', placement }
    if (placement === 'right') return { top: spot.top, left: spot.left + spot.width + pad, transform: 'none', placement }
    return { top: spot.top, left: Math.max(16, spot.left - 340), transform: 'none', placement }
  }, [step, spot])

  useEffect(() => {
    if (!step) return
    const measure = () => {
      const el = document.querySelector(step.target) as HTMLElement | null
      if (!el) { setSpot(null); return }
      const rect = el.getBoundingClientRect()
      setSpot({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [step])

  if (!step || !tooltip) return null

  const finish = () => {
    onComplete?.()
    onClose()
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label="EvoPi 新手教程">
      {/* Spotlight: a full-screen overlay with a transparent hole punched via box-shadow */}
      {spot && (
        <div
          className="tutorial-spotlight"
          style={{
            top: spot.top - 4,
            left: spot.left - 4,
            width: spot.width + 8,
            height: spot.height + 8,
          }}
          aria-hidden
        />
      )}
      <div
        className={`tutorial-tooltip tutorial-tooltip-${tooltip.placement}`}
        style={{ top: tooltip.top, left: tooltip.left, transform: tooltip.transform }}
      >
        <div className="tutorial-progress">
          <span>{stepIndex + 1} / {steps.length}</span>
          <div className="tutorial-bar">
            <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
        <strong>{step.title}</strong>
        <p>{step.body}</p>
        <div className="tutorial-nav">
          <button className="ghost-btn xs" onClick={finish}>跳过教程</button>
          <div className="tutorial-nav-right">
            {stepIndex > 0 && (
              <button className="ghost-btn xs" onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>上一步</button>
            )}
            {isLast ? (
              <button className="primary-btn xs" onClick={finish}>完成</button>
            ) : (
              <button className="primary-btn xs" onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}>下一步</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const TUTORIAL_LOCALSTORAGE_KEY = 'evopi_tutorial_done'

export function loadTutorialDone(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_LOCALSTORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markTutorialDoneLocally(): void {
  try {
    localStorage.setItem(TUTORIAL_LOCALSTORAGE_KEY, '1')
  } catch {
    /* localStorage may be unavailable; backend is the source of truth */
  }
}

export function clearTutorialDoneLocally(): void {
  try {
    localStorage.removeItem(TUTORIAL_LOCALSTORAGE_KEY)
  } catch {
    /* ignore */
  }
}

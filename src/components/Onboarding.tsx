import { useState } from 'react'
import { onboardingQuestions, type OnboardQuestion } from '../data'

/* ============================================================
   Onboarding · 新用户预配置
   - 登录/注册后必须完成，才能领 Pi 伙伴
   - 围绕算法厌恶 / 信息过载 / 信任 / 协作 设计
   - 答案汇总成一个初始介入深度 + 信任档，传回父级
   ============================================================ */
export function Onboarding({
  userName,
  onFinish,
}: {
  userName: string
  onFinish: (result: { depth: number; summary: string }) => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const q: OnboardQuestion | undefined = onboardingQuestions[step]
  const isLast = step === onboardingQuestions.length - 1
  const answered = q ? answers[q.id] !== undefined : false

  const pick = (qid: string, v: number) => setAnswers((a) => ({ ...a, [qid]: v }))

  const finish = () => {
    // 汇总：取各题 value 的平均，映射到介入深度
    const vals = Object.values(answers)
    const avg = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length)
    const depth = Math.max(0, Math.min(3, Math.round(avg)))
    const summary = buildSummary(answers)
    onFinish({ depth, summary })
  }

  return (
    <main className="onboard">
      <div className="onboard-card">
        <div className="onboard-progress">
          <span>{step + 1} / {onboardingQuestions.length}</span>
          <div className="onboard-bar">
            <span style={{ width: `${((step + (answered ? 1 : 0)) / onboardingQuestions.length) * 100}%` }} />
          </div>
        </div>

        <div className="onboard-hello">
          <span className="brand-mark">Pi</span>
          <div>
            <strong>欢迎，{userName}</strong>
            <p>先回答 4 个问题，EvoPi 才能按你的方式配合你。完成后就能领养你的 Pi 伙伴。</p>
          </div>
        </div>

        {q && (
          <div key={q.id} className="onboard-q">
            <span className="tag dim">{q.dimension}</span>
            <h2>{q.title}</h2>
            <p className="onboard-q-desc">{q.desc}</p>
            <div className="onboard-options">
              {q.options.map((o) => (
                <button
                  key={o.label}
                  className={`onboard-option ${answers[q.id] === o.value ? 'active' : ''}`}
                  onClick={() => pick(q.id, o.value)}
                >
                  <strong>{o.label}</strong>
                  <span>{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="onboard-nav">
          <button className="ghost-btn sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            上一题
          </button>
          {isLast ? (
            <button className="primary-btn" disabled={!answered} onClick={finish}>
              完成，去领养 Pi 伙伴
            </button>
          ) : (
            <button className="primary-btn sm" disabled={!answered} onClick={() => setStep((s) => s + 1)}>
              下一题
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

function buildSummary(answers: Record<string, number>): string {
  const a = answers
  const parts: string[] = []
  if (a.q1 !== undefined) parts.push(a.q1 <= 1 ? '偏克制：只在需要时动手' : '可主动做完低风险的事')
  if (a.q2 !== undefined) parts.push(a.q2 >= 3 ? '强化降噪：先给最关键的' : '关键与细节并重')
  if (a.q3 !== undefined) parts.push(a.q3 <= 0 ? '最小读取范围' : '可读日历/应用状态')
  if (a.q4 !== undefined) parts.push(a.q4 >= 3 ? '结论先行' : '步骤/解释优先')
  return parts.join('；')
}

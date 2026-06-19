import { useEffect, useState } from 'react'
import { integrations } from '../data'

/* ============================================================
   Integrations · 系统外接（Pi 伙伴下方）
   - 微信 / 飞书 / 邮件 转接入口
   - 点击跳转到对应应用继续工作
   - 显示快捷键，按快捷键回到 EvoPi
   - 可开代理让 Agent 去对应应用工作
   ⚠️ 跳转是真实外链动作，openIntegrations=false 时仅演示
   ============================================================ */
export function Integrations() {
  const [agentOn, setAgentOn] = useState<Record<string, boolean>>({})
  const [hint, setHint] = useState<string | null>(null)

  // 注册全局快捷键回到 EvoPi（演示：提示用户已就绪）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        W: '微信', F: '飞书', E: '邮件',
      }
      if (e.metaKey && e.shiftKey && map[e.key.toUpperCase()]) {
        e.preventDefault()
        setHint(`已准备从 ${map[e.key.toUpperCase()]} 回到 EvoPi（演示）`)
        setTimeout(() => setHint(null), 2000)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const jump = (url: string, name: string) => {
    // 真实跳转；失败（如未安装应用）会静默忽略
    try {
      window.open(url, '_self')
    } catch {
      /* ignore */
    }
    setHint(`正在跳转到${name}…（演示环境不真实跳转）`)
    setTimeout(() => setHint(null), 2200)
  }

  return (
    <div className="integrations">
      <div className="integrations-head">
        <img className="cute-icon" src="/cute-line-icons/soft-refresh-loop.png" alt="" />
        <strong>系统外接</strong>
      </div>
      <div className="integrations-list">
        {integrations.map((it) => (
          <div className="integration-row" key={it.id}>
            <button
              className="integration-main"
              onClick={() => jump(it.url, it.name)}
              title={`跳转到${it.name}`}
            >
              <img className="cute-icon" src={`/cute-line-icons/${it.icon}.png`} alt="" />
              <div>
                <strong>{it.name}</strong>
                <span>{it.desc}</span>
              </div>
            </button>
            <div className="integration-aux">
              <kbd className="kbd">{it.shortcut}</kbd>
              {it.agentSupported && (
                <button
                  className={`agent-toggle ${agentOn[it.id] ? 'on' : ''}`}
                  onClick={() => {
                    setAgentOn((p) => ({ ...p, [it.id]: !p[it.id] }))
                    setHint(!agentOn[it.id] ? `已开启${it.name}代理：Agent 将代为跟进（演示）` : `已关闭${it.name}代理`)
                    setTimeout(() => setHint(null), 2000)
                  }}
                  title={`让 Agent 去${it.name}工作`}
                >
                  <img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" />
                  {agentOn[it.id] ? '代理中' : '开代理'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {hint && <div className="integration-hint">{hint}</div>}
    </div>
  )
}

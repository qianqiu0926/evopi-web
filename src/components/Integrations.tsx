import { useEffect, useState } from 'react'
import {
  confirmWeChatSession,
  createWeChatSession,
  disconnectWeChat,
  getWeChatSession,
  listConnectors,
  sendWeChatFollowUp,
  sendWeChatInbound,
  type ConnectorSession,
  type MessagingConnector,
} from '../api'
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
  const [wechatConnector, setWechatConnector] = useState<MessagingConnector | null>(null)
  const [wechatSession, setWechatSession] = useState<ConnectorSession | null>(null)
  const [wechatBusy, setWechatBusy] = useState<'idle' | 'loading' | 'confirming' | 'followup' | 'inbound'>('idle')
  const [wechatInboundText, setWechatInboundText] = useState('帮我把这条微信消息变成一张小票')
  const [wechatReply, setWechatReply] = useState('')

  const showHint = (text: string, duration = 2200) => {
    setHint(text)
    window.setTimeout(() => setHint(null), duration)
  }

  const refreshConnectors = async () => {
    try {
      const result = await listConnectors()
      setWechatConnector(result.connectors.find((connector) => connector.kind === 'wechat') ?? null)
    } catch (error) {
      showHint(`微信连接状态读取失败：${formatConnectorError(error)}`)
    }
  }

  // 注册全局快捷键回到 EvoPi（演示：提示用户已就绪）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        W: '微信', F: '飞书', E: '邮件',
      }
      if (e.metaKey && e.shiftKey && map[e.key.toUpperCase()]) {
        e.preventDefault()
        showHint(`已准备从 ${map[e.key.toUpperCase()]} 回到 EvoPi`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshConnectors() }, 0)
    return () => window.clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!wechatSession || wechatSession.status !== 'qr_pending') return
    const timer = window.setInterval(() => {
      getWeChatSession(wechatSession.id)
        .then((result) => {
          setWechatConnector(result.connector)
          setWechatSession(result.session)
        })
        .catch((error) => showHint(`微信二维码状态刷新失败：${formatConnectorError(error)}`))
    }, 4000)
    return () => window.clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wechatSession?.id, wechatSession?.status])

  const jump = (url: string, name: string) => {
    // 真实跳转；失败（如未安装应用）会静默忽略
    try {
      window.open(url, '_self')
    } catch {
      /* ignore */
    }
    showHint(`正在跳转到${name}…`)
  }

  const startWeChatSession = async () => {
    setWechatBusy('loading')
    try {
      const result = await createWeChatSession()
      setWechatConnector(result.connector)
      setWechatSession(result.session)
      showHint('微信二维码已生成，等待扫码确认。')
    } catch (error) {
      showHint(`微信二维码生成失败：${formatConnectorError(error)}`, 3200)
    } finally {
      setWechatBusy('idle')
    }
  }

  const confirmWeChat = async () => {
    if (!wechatSession) return
    setWechatBusy('confirming')
    try {
      const result = await confirmWeChatSession(wechatSession.id, { displayName: 'EvoPi WeChat' })
      setWechatConnector(result.connector)
      setWechatSession(result.session)
      showHint('微信已连接，Agent 可以把跟进动作写入事件流。')
    } catch (error) {
      showHint(`微信确认失败：${formatConnectorError(error)}`, 3200)
    } finally {
      setWechatBusy('idle')
    }
  }

  const followUpInWeChat = async () => {
    setWechatBusy('followup')
    try {
      await sendWeChatFollowUp({ message: 'EvoPi 已接入微信，后续会把需要用户确认的 Agent 跟进发送到这里。' })
      setAgentOn((p) => ({ ...p, wechat: true }))
      showHint('Agent 跟进已写入微信连接事件流。')
    } catch (error) {
      showHint(`微信 Agent 跟进失败：${formatConnectorError(error)}`, 3200)
    } finally {
      setWechatBusy('idle')
    }
  }

  const sendInboundToAgent = async () => {
    const message = wechatInboundText.trim()
    if (!message) return
    setWechatBusy('inbound')
    try {
      const result = await sendWeChatInbound({
        sessionId: wechatSession?.id,
        goalName: 'WeChat',
        workspaceTitle: 'WeChat inbound',
        message,
        timeoutSec: 120,
      })
      setWechatConnector(result.connector)
      setWechatSession(result.session)
      setWechatReply(result.replyPreview)
      setAgentOn((p) => ({ ...p, wechat: true }))
      showHint(`微信入站消息已进入 Pi runtime，小票 ${result.run.id.slice(0, 18)} 已生成。`, 3200)
    } catch (error) {
      showHint(`微信入站处理失败：${formatConnectorError(error)}`, 3600)
    } finally {
      setWechatBusy('idle')
    }
  }

  const disconnectWeChatConnector = async () => {
    setWechatBusy('loading')
    try {
      const result = await disconnectWeChat()
      setWechatConnector(result.connector)
      setWechatSession(null)
      setAgentOn((p) => ({ ...p, wechat: false }))
      showHint('微信连接已断开。')
    } catch (error) {
      showHint(`微信断开失败：${formatConnectorError(error)}`, 3200)
    } finally {
      setWechatBusy('idle')
    }
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
              {it.id === 'wechat' ? (
                <WeChatConnectorControls
                  connector={wechatConnector}
                  session={wechatSession}
                  busy={wechatBusy}
                  agentOn={Boolean(agentOn.wechat)}
                  onStart={() => void startWeChatSession()}
                  onConfirm={() => void confirmWeChat()}
                  onFollowUp={() => void followUpInWeChat()}
                  onDisconnect={() => void disconnectWeChatConnector()}
                />
              ) : it.agentSupported && (
                <button
                  className={`agent-toggle ${agentOn[it.id] ? 'on' : ''}`}
                  onClick={() => {
                    setAgentOn((p) => ({ ...p, [it.id]: !p[it.id] }))
                    showHint(!agentOn[it.id] ? `已开启${it.name}代理：Agent 将代为跟进` : `已关闭${it.name}代理`)
                  }}
                  title={`让 Agent 去${it.name}工作`}
                >
                  <img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" />
                  {agentOn[it.id] ? '代理中' : '开代理'}
                </button>
              )}
            </div>
            {it.id === 'wechat' && wechatSession?.status === 'qr_pending' && (
              <div className="wechat-qr-box">
                <img src={wechatSession.qrDataUrl} alt="微信连接二维码" />
                <div>
                  <strong>扫码连接 EvoPi Agent</strong>
                  <span>验证码 {wechatSession.manualCode} · {wechatSession.expiresInSec}s 后过期</span>
                </div>
              </div>
            )}
            {it.id === 'wechat' && wechatConnector?.status === 'connected' && (
              <div className="wechat-inbound-box">
                <textarea
                  value={wechatInboundText}
                  onChange={(e) => setWechatInboundText(e.target.value)}
                  rows={2}
                  placeholder="模拟一条微信入站消息"
                />
                <button className="agent-toggle on" onClick={() => void sendInboundToAgent()} disabled={wechatBusy !== 'idle' || !wechatInboundText.trim()}>
                  {wechatBusy === 'inbound' ? '处理中' : '发给 Pi'}
                </button>
                {wechatReply && <p>{wechatReply.slice(0, 180)}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      {hint && <div className="integration-hint">{hint}</div>}
    </div>
  )
}

function WeChatConnectorControls({
  connector,
  session,
  busy,
  agentOn,
  onStart,
  onConfirm,
  onFollowUp,
  onDisconnect,
}: {
  connector: MessagingConnector | null
  session: ConnectorSession | null
  busy: 'idle' | 'loading' | 'confirming' | 'followup' | 'inbound'
  agentOn: boolean
  onStart: () => void
  onConfirm: () => void
  onFollowUp: () => void
  onDisconnect: () => void
}) {
  const connected = connector?.status === 'connected'
  const pending = session?.status === 'qr_pending'
  const expired = session?.status === 'expired' || connector?.status === 'expired'

  return (
    <div className="wechat-controls">
      <span className={`wechat-state ${connected ? 'connected' : pending ? 'pending' : expired ? 'expired' : ''}`}>
        {connected ? '已连接' : pending ? '待扫码' : expired ? '已过期' : '未连接'}
      </span>
      <button className="agent-toggle" onClick={onStart} disabled={busy !== 'idle'}>
        {busy === 'loading' ? '生成中' : connected ? '换码' : '扫码连接'}
      </button>
      {pending && (
        <button className="agent-toggle" onClick={onConfirm} disabled={busy !== 'idle'}>
          {busy === 'confirming' ? '确认中' : '我已扫码'}
        </button>
      )}
      {connected && (
        <button className={`agent-toggle ${agentOn ? 'on' : ''}`} onClick={onFollowUp} disabled={busy !== 'idle'}>
          {busy === 'followup' ? '写入中' : agentOn ? '代理中' : 'Agent 跟进'}
        </button>
      )}
      {connected && (
        <button className="agent-toggle" onClick={onDisconnect} disabled={busy !== 'idle'}>
          断开
        </button>
      )}
    </div>
  )
}

function formatConnectorError(error: unknown): string {
  if (error instanceof Error) return error.message
  return '未知错误'
}

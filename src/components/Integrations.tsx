import { useCallback, useEffect, useState } from 'react'
import {
  confirmWeChatSession,
  createWeChatSession,
  disconnectWeChat,
  getFeishuCapability,
  getOpenClawWeixinStatus,
  getWeChatSession,
  sendViaOpenClawWeixin,
  listConnectors,
  sendFeishuMessage,
  sendWeChatFollowUp,
  sendWeChatInbound,
  type ConnectorSession,
  type FeishuCapability,
  type MessagingConnector,
  type OpenClawWeixinStatus,
} from '../api'
import { integrations } from '../data'
import { emitPiCoreSignal } from '../piCoreSignals'

/* ============================================================
   Integrations · 系统外接（Pi 伙伴下方）
   - 微信 / 飞书 / 邮件 转接入口
   - 点击跳转到对应应用继续工作
   - 显示快捷键，按快捷键回到 EvoPi
   - 可开代理让 Agent 去对应应用工作
   ⚠️ 跳转是真实外链动作，openIntegrations=false 时仅演示
   ============================================================ */
export function Integrations() {
  const [open, setOpen] = useState(false)
  const [agentOn, setAgentOn] = useState<Record<string, boolean>>({})
  const [hint, setHint] = useState<string | null>(null)
  const [wechatConnector, setWechatConnector] = useState<MessagingConnector | null>(null)
  const [wechatSession, setWechatSession] = useState<ConnectorSession | null>(null)
  const [wechatBusy, setWechatBusy] = useState<'idle' | 'loading' | 'confirming' | 'followup' | 'inbound'>('idle')
  const [wechatInboundText, setWechatInboundText] = useState('帮我把这条微信消息变成一张小票')
  const [wechatReply, setWechatReply] = useState('')
  const [feishu, setFeishu] = useState<FeishuCapability | null>(null)
  const [feishuText, setFeishuText] = useState('EvoPi 已接入飞书，后续会把需要确认的 Agent 跟进发送到这里。')
  const [feishuBusy, setFeishuBusy] = useState<'idle' | 'sending'>('idle')
  const [ocWxStatus, setOcWxStatus] = useState<OpenClawWeixinStatus | null>(null)
  const [ocWxBusy, setOcWxBusy] = useState(false)
  const [ocWxMessage, setOcWxMessage] = useState('EvoPi 已通过 openclaw-weixin 接入你的微信，需要确认的事项会真实发到这里。')
  const [ocWxReplyTo, setOcWxReplyTo] = useState('filehelper')

  const showHint = useCallback((text: string, duration = 2200) => {
    setHint(text)
    window.setTimeout(() => setHint(null), duration)
  }, [])

  const refreshConnectors = useCallback(async () => {
    try {
      const result = await listConnectors()
      setWechatConnector(result.connectors.find((connector) => connector.kind === 'wechat') ?? null)
    } catch (error) {
      showHint(`微信连接状态读取失败：${formatConnectorError(error)}`)
    }
  }, [showHint])

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
  }, [showHint])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshConnectors() }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshConnectors])

  useEffect(() => {
    getFeishuCapability()
      .then(({ capability }) => setFeishu(capability))
      .catch(() => setFeishu(null))
  }, [])

  useEffect(() => {
    getOpenClawWeixinStatus()
      .then(({ status }) => setOcWxStatus(status))
      .catch(() => setOcWxStatus(null))
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
  }, [showHint, wechatSession])

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

  const sendFeishu = async () => {
    const text = feishuText.trim()
    if (!text) return
    emitPiCoreSignal('delegate')
    setFeishuBusy('sending')
    try {
      const { ok, result } = await sendFeishuMessage({ text })
      if (ok) {
        setAgentOn((p) => ({ ...p, feishu: true }))
        showHint(`飞书消息已发送（message_id: ${result.messageId ?? '-'}）。`, 3000)
      } else {
        showHint(`飞书发送失败：${result.error ?? result.status}`, 3600)
      }
    } catch (error) {
      showHint(`飞书发送失败：${formatConnectorError(error)}`, 3600)
    } finally {
      setFeishuBusy('idle')
    }
  }

  const sendViaOpenClawWeixinBridge = async () => {
    const message = ocWxMessage.trim()
    if (!message || ocWxBusy) return
    emitPiCoreSignal('delegate')
    setOcWxBusy(true)
    try {
      const { ok, result } = await sendViaOpenClawWeixin({ message, replyTo: ocWxReplyTo.trim() || undefined, deliver: true })
      if (ok) {
        setAgentOn((p) => ({ ...p, wechat: true }))
        showHint(`已通过 openclaw-weixin 真实发送到 ${result.replyTo}。`, 3200)
        void getOpenClawWeixinStatus().then(({ status }) => setOcWxStatus(status))
      } else {
        const hint = result.status === 'not_logged_in'
          ? 'openclaw-weixin 未登录：终端运行 openclaw channels login --channel openclaw-weixin 扫码。'
          : result.status === 'gateway_down'
            ? 'OpenClaw 网关未运行：终端运行 openclaw gateway start。'
            : `发送失败：${result.error ?? result.status}`
        showHint(hint, 4200)
      }
    } catch (error) {
      showHint(`openclaw-weixin 调用失败：${formatConnectorError(error)}`, 3600)
    } finally {
      setOcWxBusy(false)
    }
  }

  const followUpInWeChat = async () => {
    emitPiCoreSignal('delegate')
    setWechatBusy('followup')
    try {
      const result = await sendWeChatFollowUp({ message: 'EvoPi 已接入微信，后续会把需要用户确认的 Agent 跟进发送到这里。' })
      setAgentOn((p) => ({ ...p, wechat: true }))
      if (result.delivery.status === 'semi_automatic' && result.delivery.copyableMessage) {
        // Semi-automatic mode: copy the reply to clipboard so the user can paste
        // it into WeChat by hand. Avoids wxauto/wxhelper 封号 risk entirely.
        try {
          await navigator.clipboard.writeText(result.delivery.copyableMessage)
          showHint('Agent 跟进已生成并复制到剪贴板，粘贴到微信即可。', 3600)
        } catch {
          showHint('Agent 跟进已生成（半自动模式）。', 3200)
        }
      } else if (result.delivery.status === 'sent') {
        showHint('Agent 跟进已通过微信 relay 真实发送。', 3200)
      } else {
        showHint(`微信 Agent 跟进失败：${result.delivery.error ?? '未知'}`, 3600)
      }
    } catch (error) {
      showHint(`微信 Agent 跟进失败：${formatConnectorError(error)}`, 3200)
    } finally {
      setWechatBusy('idle')
    }
  }

  const sendInboundToAgent = async () => {
    const message = wechatInboundText.trim()
    if (!message) return
    emitPiCoreSignal('delegate')
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
    <div className={`integrations ${open ? 'is-open' : ''}`}>
      <button
        className="integrations-head collapsible-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <img className="cute-icon" src="/cute-line-icons/soft-refresh-loop.png" alt="" />
        <div>
          <strong>外部应用</strong>
          <span>{wechatConnector?.status === 'connected' ? '微信已连接' : '微信、飞书、邮件等低频入口'}</span>
        </div>
        <em>{open ? '收起' : '展开'}</em>
      </button>
      {open && (
        <>
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
                  ) : it.id === 'feishu' ? (
                    <FeishuConnectorControls
                      capability={feishu}
                      text={feishuText}
                      onText={setFeishuText}
                      busy={feishuBusy}
                      agentOn={Boolean(agentOn.feishu)}
                      onSend={() => void sendFeishu()}
                    />
                  ) : it.agentSupported && (
                    <button
                      className={`agent-toggle ${agentOn[it.id] ? 'on' : ''}`}
                      onClick={() => {
                        if (!agentOn[it.id]) emitPiCoreSignal('delegate')
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
        </>
      )}
      {!open && hint && <div className="integration-hint compact">{hint}</div>}
      <section className="setting-block" style={{ marginTop: 16 }}>
        <div className="setting-head">
          <img className="cute-icon" src="/cute-line-icons/soft-sparkle-twinkle.png" alt="" />
          <div>
            <strong>微信（openclaw-weixin 官方插件）</strong>
            <span>
              {!ocWxStatus ? '读取状态中…'
                : ocWxStatus.available ? `已就绪：${ocWxStatus.account ?? '默认账号'}`
                : ocWxStatus.gatewayReachable ? '网关在线，但微信未登录（需扫码）'
                : '网关未启动 / 未登录'}
            </span>
          </div>
        </div>
        <div className="wechat-controls" style={{ display: 'block' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`wechat-state ${ocWxStatus?.available ? 'connected' : ''}`}>
              {ocWxStatus?.available ? '已连接' : '待配置'}
            </span>
            <input
              value={ocWxReplyTo}
              onChange={(e) => setOcWxReplyTo(e.target.value)}
              placeholder="对方 wxid / 备注（默认 filehelper 文件传输助手）"
              style={{ flex: 1, minWidth: 200 }}
            />
            <button
              className={`agent-toggle ${agentOn.wechat ? 'on' : ''}`}
              onClick={() => void sendViaOpenClawWeixinBridge()}
              disabled={ocWxBusy || !ocWxMessage.trim()}
              title="通过 openclaw-weixin 真实发送到微信"
            >
              {ocWxBusy ? '发送中' : 'Agent 真实发送'}
            </button>
          </div>
          <textarea
            value={ocWxMessage}
            onChange={(e) => setOcWxMessage(e.target.value)}
            rows={2}
            placeholder="要发到微信的内容"
          />
          {ocWxStatus && !ocWxStatus.available && ocWxStatus.reason && (
            <small style={{ display: 'block', marginTop: 6, color: 'var(--text-muted, #8a90a0)' }}>
              {ocWxStatus.reason}
            </small>
          )}
        </div>
      </section>
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

function FeishuConnectorControls({
  capability,
  text,
  onText,
  busy,
  agentOn,
  onSend,
}: {
  capability: FeishuCapability | null
  text: string
  onText: (value: string) => void
  busy: 'idle' | 'sending'
  agentOn: boolean
  onSend: () => void
}) {
  const configured = capability?.configured
  const stateLabel = !capability ? '读取中' : configured ? (agentOn ? '代理中' : '已配置') : '未配置'
  return (
    <div className="wechat-controls">
      <span className={`wechat-state ${configured ? 'connected' : ''}`}>{stateLabel}</span>
      <button
        className={`agent-toggle ${agentOn ? 'on' : ''}`}
        onClick={onSend}
        disabled={busy !== 'idle' || !configured || !text.trim()}
        title={configured ? '发送一条飞书消息' : '需在 .env 配置 FEISHU_APP_ID / APP_SECRET / RECEIVE_ID'}
      >
        {busy === 'sending' ? '发送中' : 'Agent 发送'}
      </button>
      {configured && (
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          rows={2}
          placeholder="要发到飞书的内容"
        />
      )}
    </div>
  )
}

function formatConnectorError(error: unknown): string {
  if (error instanceof Error) return error.message
  return '未知错误'
}

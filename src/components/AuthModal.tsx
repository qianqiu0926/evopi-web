import { useEffect, useRef, useState } from 'react'
import { codeTTL, generateCode, type AuthUser } from '../data'

/* ============================================================
   AuthModal · 注册 / 登录（邮箱验证码）
   ⚠️ 前端 mock：验证码仅在界面内提示，未真实发送邮箱（本项目无后端）
   任意 6 位数字均可通过校验；上线需接后端发信服务。
   ============================================================ */
type Mode = 'login' | 'register'
type Step = 'email' | 'code' | 'done'

export function AuthModal({
  initialMode = 'login',
  onClose,
  onAuthed,
}: {
  initialMode?: Mode
  onClose: () => void
  onAuthed: (u: AuthUser) => void
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [sentCode, setSentCode] = useState<string | null>(null)
  const [sentAt, setSentAt] = useState(0)
  const [resendIn, setResendIn] = useState(0)
  const [error, setError] = useState('')
  const codeInputRef = useRef<HTMLInputElement>(null)

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // 倒计时
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  // 进入 code 步骤后聚焦输入框
  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus()
  }, [step])

  const sendCode = () => {
    if (!emailOk) {
      setError('请填写有效的邮箱地址')
      return
    }
    const c = generateCode()
    setSentCode(c)
    setSentAt(Date.now())
    setStep('code')
    setError('')
    setResendIn(60)
    // mock：本地演示用，真实环境由后端发送
    console.info(`[EvoPi mock] 验证码已生成：${c}（演示用，未真实发送邮箱）`)
  }

  const verify = () => {
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位数字验证码')
      return
    }
    if (Date.now() - sentAt > codeTTL) {
      setError('验证码已过期，请重新获取')
      return
    }
    // mock：任意 6 位均通过；如需严格演示，可比对 sentCode
    const user: AuthUser = {
      email,
      name: name.trim() || email.split('@')[0],
      loggedInAt: Date.now(),
    }
    setStep('done')
    setTimeout(() => onAuthed(user), 700)
  }

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label={mode === 'login' ? '登录' : '注册'}>
      <div className="auth-card">
        <button className="auth-close" aria-label="关闭" onClick={onClose}>
          ✕
        </button>

        <div className="auth-brand">
          <div className="brand-mark">Pi</div>
          <div>
            <strong>EvoPi</strong>
            <span>{mode === 'login' ? '欢迎回来' : '创建你的自进化助理'}</span>
          </div>
        </div>

        {/* 模式切换 */}
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setStep('email'); setError('') }}>
            登录
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setStep('email'); setError('') }}>
            注册
          </button>
        </div>

        {step === 'email' && (
          <div className="auth-form">
            {mode === 'register' && (
              <input
                className="text-input"
                placeholder="怎么称呼你（昵称）"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <input
              className="text-input"
              type="email"
              placeholder="邮箱地址"
              value={email}
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendCode() }}
            />
            <p className="auth-hint">我们将向该邮箱发送 6 位验证码。</p>
            <button className="primary-btn" disabled={!emailOk} onClick={sendCode}>
              获取验证码
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="auth-form">
            <p className="auth-sent">
              验证码已发送至 <strong>{email}</strong>
            </p>
            {sentCode && <p className="auth-demo">演示环境验证码：<b>{sentCode}</b>（未真实发信）</p>}
            <input
              ref={codeInputRef}
              className="text-input code-input"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 位验证码"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') verify() }}
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="primary-btn" onClick={verify}>验证并{mode === 'login' ? '登录' : '注册'}</button>
            <div className="auth-aux">
              <button className="ghost-btn sm" onClick={() => { setStep('email'); setError('') }}>
                ← 换个邮箱
              </button>
              <button className="ghost-btn sm" disabled={resendIn > 0} onClick={sendCode}>
                {resendIn > 0 ? `${resendIn}s 后重发` : '重新获取'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="auth-form auth-done">
            <div className="auth-check">✓</div>
            <p>{mode === 'login' ? '登录成功' : '注册成功，正在进入'}…</p>
          </div>
        )}

        <p className="auth-foot">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            className="link-btn"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStep('email'); setError('') }}
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  )
}

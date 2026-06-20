import { useCallback, useRef, useState } from 'react'

/* ============================================================
   useActionState · 行内按钮反馈原语
   - 统一驱动按钮：idle → loading → done
   - loading 态显示小转圈、禁用点击
   - done 态可选自动回落到 idle（ttl > 0），或永久保持会话内状态
   - 用于：开始推进 / 换一件 / 确认记忆 / 安装技能 / 暂停 EvoPi 等
   ============================================================ */
export type ActionStatus = 'idle' | 'loading' | 'done'

export function useActionState(opts: { ttl?: number } = {}) {
  const { ttl = 0 } = opts
  const [status, setStatus] = useState<ActionStatus>('idle')
  const timer = useRef<number | null>(null)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const run = useCallback(
    (work: () => void | Promise<void>, { duration = 700 }: { duration?: number } = {}) => {
      if (status === 'loading') return
      setStatus('loading')
      const finish = async () => {
        await work()
        setStatus('done')
        if (ttl > 0) {
          clear()
          timer.current = window.setTimeout(() => setStatus('idle'), ttl)
        }
      }
      window.setTimeout(() => { void finish() }, duration)
    },
    [status, ttl, clear],
  )

  const reset = useCallback(() => {
    clear()
    setStatus('idle')
  }, [clear])

  return { status, run, reset, setStatus }
}

/* useInlineHint · 就近提示气泡（复用 .inline-hint 样式）
   - 无后端能力入口（搜索/提醒/采集日志/语音）用这个
   - 自动消失，避免遮挡
*/
export function useInlineHint(ttl = 2400) {
  const [hint, setHint] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const show = useCallback(
    (text: string) => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      setHint(text)
      timer.current = window.setTimeout(() => setHint(null), ttl)
    },
    [ttl],
  )

  return { hint, show }
}

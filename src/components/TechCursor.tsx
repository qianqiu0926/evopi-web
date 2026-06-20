import { useEffect, useRef, useState } from 'react'

/* ============================================================
   TechCursor · 科技炫彩光标跟随（仅 notion 主题生效）
   - 一个跟随鼠标的多彩发光光晕（彩虹色相循环）
   - 一个延迟跟随的小核心点
   - 点击时迸发涟漪
   - 鼠标移出窗口时隐藏
   ============================================================ */
export function TechCursor({ active }: { active: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
  const raf = useRef<number | null>(null)
  const ringPos = useRef({ x: 0, y: 0 })
  const targetPos = useRef({ x: 0, y: 0 })
  const hue = useRef(180)

  useEffect(() => {
    if (!active) return
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    targetPos.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    ringPos.current = { ...targetPos.current }

    let visible = false

    const onMove = (e: PointerEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY }
      if (!visible) {
        visible = true
        dot.style.opacity = '1'
        ring.style.opacity = '1'
      }
    }

    const onDown = (e: PointerEvent) => {
      const id = Date.now() + Math.random()
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }])
      setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600)
    }

    const onLeave = () => {
      visible = false
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    const onEnter = () => {
      visible = true
      dot.style.opacity = '1'
      ring.style.opacity = '1'
    }

    const loop = () => {
      // 核心点：直接跟随
      dot.style.transform = `translate3d(${targetPos.current.x - 4}px, ${targetPos.current.y - 4}px, 0)`
      // 外环：缓动跟随（延迟感）
      ringPos.current.x += (targetPos.current.x - ringPos.current.x) * 0.18
      ringPos.current.y += (targetPos.current.y - ringPos.current.y) * 0.18
      // 色相循环
      hue.current = (hue.current + 0.6) % 360
      const c = `hsl(${hue.current}, 100%, 60%)`
      ring.style.transform = `translate3d(${ringPos.current.x - 16}px, ${ringPos.current.y - 16}px, 0)`
      ring.style.borderColor = c
      ring.style.boxShadow = `0 0 20px ${c}, inset 0 0 12px hsla(${hue.current}, 100%, 60%, 0.4)`
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointerenter', onEnter)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerenter', onEnter)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [active])

  if (!active) return null

  return (
    <div className="tech-cursor-layer" aria-hidden="true">
      <div ref={ringRef} className="tech-cursor-ring" />
      <div ref={dotRef} className="tech-cursor-dot" />
      {ripples.map((r) => (
        <span
          className="tech-cursor-ripple"
          key={r.id}
          style={{ left: r.x, top: r.y }}
        />
      ))}
    </div>
  )
}

import { useEffect, useRef } from 'react'

/* ============================================================
   InteractiveBg · 可交互背景层
   - 鼠标移动时，附近产生汇聚光点（光标汇聚效果）
   - 可爱线条风：跟随手绘小星星/小点，pointer-events:none 不挡交互
   - glass 主题下显示为冷光粒子，cute 主题下为暖色星点
   性能：用单一 canvas + requestAnimationFrame，限频采样
   ============================================================ */
type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  hue: string
}

export function InteractiveBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const particles: Particle[] = []
    const mouse = { x: -999, y: -999, active: false }
    let lastSpawn = 0

    // 读取当前主题决定色调
    const palette = () => {
      const t = document.body.dataset.theme
      if (t === 'glass') return ['#7ab8ff', '#a78bfa', '#34d399']
      if (t === 'notion') return ['#9b9a93', '#6b6a64', '#c4c3bd']
      return ['#ffb3d1', '#7ec8ff', '#ffd76b', '#7eddb0'] // cute
    }

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
      const now = performance.now()
      if (reduce) return
      if (now - lastSpawn < 24) return // 限频
      lastSpawn = now
      const pal = palette()
      // 在光标处汇聚生成：初速度朝向光标（汇聚感）
      for (let i = 0; i < 2; i++) {
        const ang = Math.random() * Math.PI * 2
        const dist = 26 + Math.random() * 30
        const sx = mouse.x + Math.cos(ang) * dist
        const sy = mouse.y + Math.sin(ang) * dist
        // 速度指向光标
        const dx = mouse.x - sx
        const dy = mouse.y - sy
        const len = Math.hypot(dx, dy) || 1
        const sp = 0.6 + Math.random() * 0.8
        particles.push({
          x: sx,
          y: sy,
          vx: (dx / len) * sp,
          vy: (dy / len) * sp,
          life: 0,
          max: 40 + Math.random() * 30,
          size: 2 + Math.random() * 3,
          hue: pal[Math.floor(Math.random() * pal.length)],
        })
      }
      if (particles.length > 220) particles.splice(0, particles.length - 220)
    }
    const onLeave = () => {
      mouse.active = false
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', resize)

    let raf = 0
    const loop = () => {
      ctx.clearRect(0, 0, w, h)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx
        p.y += p.vy
        // 靠近光标后轻微减速并停留闪烁
        p.vx *= 0.96
        p.vy *= 0.96
        const t = p.life / p.max
        if (t >= 1) {
          particles.splice(i, 1)
          continue
        }
        const alpha = Math.sin(t * Math.PI) * 0.85
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.hue
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.3), 0, Math.PI * 2)
        ctx.fill()
      }
      // 光标处柔光晕（汇聚焦点）
      if (mouse.active && !reduce) {
        const pal = palette()
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 40)
        g.addColorStop(0, hexA(pal[0], 0.22))
        g.addColorStop(1, hexA(pal[0], 0))
        ctx.globalAlpha = 1
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 40, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className="interactive-bg" aria-hidden="true" />
}

function hexA(hex: string, a: number) {
  // 支持 #rrggbb
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

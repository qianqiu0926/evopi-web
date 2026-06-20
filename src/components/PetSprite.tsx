import { useEffect, useRef, useState } from 'react'
import { petAnimations, petSheet, type PetMood } from '../data'

type SpriteFrame = { x: number; y: number; w: number; h: number }

const framesByMood: Record<PetMood, SpriteFrame[]> = {
  idle: [
    { x: 1, y: 1, w: 190, h: 206 },
    { x: 195, y: 1, w: 190, h: 206 },
    { x: 385, y: 1, w: 190, h: 206 },
    { x: 577, y: 1, w: 190, h: 206 },
    { x: 769, y: 1, w: 190, h: 206 },
    { x: 961, y: 1, w: 190, h: 206 },
  ],
  happy: [
    { x: 1, y: 626, w: 190, h: 204 },
    { x: 193, y: 627, w: 190, h: 204 },
    { x: 385, y: 630, w: 190, h: 204 },
    { x: 577, y: 626, w: 190, h: 204 },
  ],
  feeding: [
    { x: 1, y: 1041, w: 190, h: 206 },
    { x: 193, y: 1049, w: 190, h: 190 },
    { x: 385, y: 1060, w: 190, h: 170 },
  ],
  learning: [
    { x: 1, y: 423, w: 190, h: 194 },
    { x: 193, y: 428, w: 190, h: 184 },
    { x: 385, y: 424, w: 190, h: 194 },
    { x: 577, y: 424, w: 190, h: 194 },
    { x: 769, y: 424, w: 190, h: 194 },
    { x: 961, y: 428, w: 190, h: 184 },
  ],
  sleeping: [
    { x: 577, y: 1081, w: 190, h: 126 },
    { x: 769, y: 1087, w: 190, h: 116 },
    { x: 577, y: 1081, w: 190, h: 126 },
  ],
}

/* ============================================================
   PetSprite · HappyDog 精灵图动画播放器
   按状态播放少量真实裁切帧，避免整张表均匀切格导致相邻帧露出。
   ============================================================ */
export function PetSprite({
  mood,
  size = 120,
  paused = false,
  variant,
}: {
  mood: PetMood
  size?: number
  paused?: boolean
  variant?: 'dog' | 'fox'
}) {
  const anim = petAnimations.find((a) => a.mood === mood) ?? petAnimations[0]
  const frames = framesByMood[mood] ?? framesByMood.idle
  const [frame, setFrame] = useState(0)
  const raf = useRef<number | null>(null)
  const frameRef = useRef(0)
  // 未显式指定 variant 时按主题自动切换：notion 用银白月狐，其它用小狗
  const [theme, setTheme] = useState<string>(() => document.body.dataset.theme ?? 'cute')
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(document.body.dataset.theme ?? 'cute'))
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  const useFox = variant === 'fox' || (variant === undefined && theme === 'notion')
  const src = useFox ? '/pet/yinyue-yaohu.webp' : petSheet.src

  useEffect(() => {
    if (paused) return
    frameRef.current = 0
    let last = performance.now()
    const interval = 1000 / petSheet.fps
    const tick = (now: number) => {
      if (now - last >= interval) {
        frameRef.current = (frameRef.current + 1) % frames.length
        setFrame(frameRef.current)
        last = now
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [frames.length, paused, anim.row])

  // 动画行切换时回到第 0 帧：通过 effect 内的 setTimeout 异步设置，规避同步 setState
  useEffect(() => {
    frameRef.current = 0
    const t = setTimeout(() => setFrame(0), 0)
    return () => clearTimeout(t)
  }, [anim.row])

  const current = frames[frame % frames.length]
  const scale = size / current.w
  const displayH = current.h * scale
  const sheetW = 1536 * scale
  const sheetH = 1872 * scale
  const bgX = -current.x * scale
  const bgY = -current.y * scale

  return (
    <div
      className="pet-sprite"
      style={{
        width: size,
        height: displayH,
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${sheetW}px ${sheetH}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        imageRendering: 'pixelated',
      }}
      role="img"
      aria-label={`EvoPi 当前状态：${anim.label}`}
    />
  )
}

import { useEffect, useRef, useState } from 'react'
import { petAnimations, petSheet, type PetMood } from '../data'

/* ============================================================
   PetSprite · HappyDog 精灵图动画播放器
   通过 background-position 切换帧，对应精灵图某一行（一个动画）
   ============================================================ */
export function PetSprite({
  mood,
  size = 120,
  paused = false,
}: {
  mood: PetMood
  size?: number
  paused?: boolean
}) {
  const anim = petAnimations.find((a) => a.mood === mood) ?? petAnimations[0]
  const [frame, setFrame] = useState(0)
  const raf = useRef<number | null>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    if (paused) return
    frameRef.current = 0
    let last = performance.now()
    const interval = 1000 / petSheet.fps
    const tick = (now: number) => {
      if (now - last >= interval) {
        frameRef.current = (frameRef.current + 1) % anim.frames
        setFrame(frameRef.current)
        last = now
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [anim.frames, paused, anim.row])

  // 动画行切换时回到第 0 帧：通过 effect 内的 setTimeout 异步设置，规避同步 setState
  useEffect(() => {
    frameRef.current = 0
    const t = setTimeout(() => setFrame(0), 0)
    return () => clearTimeout(t)
  }, [anim.row])

  // 精灵图：每帧 frameW×frameH，第 anim.row 行第 frame 列
  const bgX = -frame * petSheet.frameW
  const bgY = -anim.row * petSheet.frameH

  return (
    <div
      className="pet-sprite"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${petSheet.src})`,
        backgroundRepeat: 'no-repeat',
        // 用整数缩放避免精灵图半像素错位
        backgroundSize: `${petSheet.frameW * petSheet.cols}px ${petSheet.frameH * 6}px`,
        backgroundPosition: `${(bgX * size) / petSheet.frameW}px ${(bgY * size) / petSheet.frameH}px`,
        imageRendering: 'auto',
      }}
      role="img"
      aria-label={`EvoPi 当前状态：${anim.label}`}
    />
  )
}

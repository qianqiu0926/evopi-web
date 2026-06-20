import { useEffect } from 'react'

/* ============================================================
   IconThemeSwap · 像素图标切换（仅 notion 主题）
   - notion 主题下，把所有 /cute-line-icons/X.png 换成 /pixel-icons/X.png
   - 切回 cute/glass 时还原
   - 用 data 原始路径记录，避免重复改写
   ============================================================ */
const CUTE = '/cute-line-icons/'
const PIXEL = '/pixel-icons/'

export function IconThemeSwap() {
  useEffect(() => {
    const apply = (isNotion: boolean) => {
      const imgs = document.querySelectorAll<HTMLImageElement>('img.cute-icon, .cute-icon img, img[src*="cute-line-icons"]')
      imgs.forEach((img) => {
        // 记录原始路径
        if (!img.dataset.origSrc) img.dataset.origSrc = img.getAttribute('src') ?? ''
        const orig = img.dataset.origSrc
        if (isNotion) {
          if (orig.includes(CUTE)) {
            img.setAttribute('src', orig.replace(CUTE, PIXEL))
          }
        } else {
          if (orig.includes(PIXEL)) {
            img.setAttribute('src', orig.replace(PIXEL, CUTE))
          } else {
            img.setAttribute('src', orig)
          }
        }
      })
    }

    const sync = () => apply(document.body.dataset.theme === 'notion')
    sync()

    const obs = new MutationObserver(() => sync())
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'], childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])

  return null
}

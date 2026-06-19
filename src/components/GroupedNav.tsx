import { useState } from 'react'
import { navGroups, type NavGroup } from '../data'

/* ============================================================
   GroupedNav · 分组导航 + 分组可收起
   - 三个功能模块：日常工作 / 成长与对话 / 系统
   - 每组可独立折叠（chevron 切换）
   - 整个控制台也可被父级收起（父控制 collapsed）
   ============================================================ */
export function GroupedNav({
  active,
  collapsed,
  onSelect,
}: {
  active: string
  collapsed: boolean
  onSelect: (key: string) => void
}) {
  // 每个分组独立折叠状态，默认展开
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navGroups.map((g) => [g.id, true])),
  )

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  return (
    <nav className="nav-list grouped-nav" aria-label="主导航">
      {navGroups.map((g) => (
        <NavGroupItem
          key={g.id}
          group={g}
          open={open[g.id] && !collapsed}
          collapsed={collapsed}
          active={active}
          onToggle={() => toggle(g.id)}
          onSelect={onSelect}
        />
      ))}
    </nav>
  )
}

function NavGroupItem({
  group,
  open,
  collapsed,
  active,
  onToggle,
  onSelect,
}: {
  group: NavGroup
  open: boolean
  collapsed: boolean
  active: string
  onToggle: () => void
  onSelect: (key: string) => void
}) {
  return (
    <div className="nav-group">
      {!collapsed && (
        <button className="nav-group-head" onClick={onToggle} aria-expanded={open}>
          <span>{group.label}</span>
          <span className={`chev ${open ? 'open' : ''}`}>▾</span>
        </button>
      )}
      <div className={`nav-group-items ${open ? '' : 'folded'}`}>
        {group.items.map((item) => (
          <button
            key={item.key}
            className={active === item.key ? 'nav-button active' : 'nav-button'}
            onClick={() => onSelect(item.key)}
            aria-current={active === item.key ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
          >
            <img className="cute-icon" src={`/cute-line-icons/${item.icon}.png`} alt="" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

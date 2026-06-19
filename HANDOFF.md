# EvoPi 前端优化 · 线程交接提示词

> 把下面整段复制到新线程作为第一条消息即可。

---

你现在接手的是 EvoPi 前端优化任务。项目在本机，已搭建完成且能正常 build/run，但有未完成的需求需要继续。

## 工作区根目录
/Users/sugeladi/Documents/进化酒馆

## 前端项目目录
/Users/sugeladi/Documents/进化酒馆/evopi-web

## 本地预览地址
http://127.0.0.1:5173/

如果 dev server 没开，进入前端目录运行：
cd /Users/sugeladi/Documents/进化酒馆/evopi-web
npm install
npm run dev -- --host 127.0.0.1

## 技术栈
Vite + React 19 + TypeScript（严格模式）+ 纯 CSS（无 UI 框架）。
三套主题通过 body[data-theme] 切换：cute（默认暖白手绘线条）/ notion（极简文档）/ glass（深色玻璃拟态）。
图标全部来自本地 PNG：/public/cute-line-icons/（39 个）。
宠物素材：/public/pet/happydog.webp（精灵图，1536×1872，6行×6列，每帧256×312）+ happydog.json。

## 验证方式
cd /Users/sugeladi/Documents/进化酒馆/evopi-web
npm run lint   （注意：当前有 1 个 lint error，见下方"待办"）
npm run build
视觉验收可用 playwright（已装，chromium 在 ~/Library/Caches/ms-playwright/），桌面 1440x960，移动 390x844。

## 必须先读的文件（按顺序）
1. /Users/sugeladi/Documents/进化酒馆/evopi-web/src/App.tsx  （主入口，所有页面 + AppShell 在这里）
2. /Users/sugeladi/Documents/进化酒馆/evopi-web/src/data.ts  （所有数据层，导出极多，务必先读）
3. /Users/sugeladi/Documents/进化酒馆/evopi-web/src/App.css （所有样式，约 1900 行）
4. /Users/sugeladi/Documents/进化酒馆/evopi-web/src/index.css（主题令牌 + keyframes）
5. /Users/sugeladi/Documents/进化酒馆/evopi-web/src/components/  下 7 个组件：
   - GroupedNav.tsx（分组导航+收起）
   - PiCorePanel.tsx（右侧宠物面板+认领+系统外接）
   - PetSprite.tsx（精灵图动画播放器）
   - InteractiveBg.tsx（可交互背景 canvas）
   - AuthModal.tsx（登录注册弹窗，邮箱验证码 mock）
   - Onboarding.tsx（新用户预配置问卷）
   - Integrations.tsx（系统外接：微信/飞书/邮件）
   - EvolutionMindMap.tsx（进化思维导图画布）

## 当前状态（已完成的功能，不要重做）
- 7 个中文页面通过 App.tsx 内部 state 真实切换：今日工作台/目标舱/记忆库/PiRoom/技能中心/进化日志/隐私权限
- 左侧控制台已分组（日常工作/成长与对话/系统）+ 可分组折叠 + 整体收起
- 右侧 PiCore 已用 HappyDog 精灵图作化身，5 种心情（待机/开心/待喂/整理/休眠），可认领命名、抚摸、休息
- 可交互背景（鼠标移动粒子汇聚）
- 登录注册弹窗（邮箱验证码，前端 mock，未真实发信）
- 新用户 onboarding 问卷（算法厌恶/信息过载/信任/协作），完成后才能领 Pi 伙伴
- 系统外接入口（微信/飞书/邮件跳转+快捷键回+开代理）
- 进化日志已重做成思维导图画布（中心 PiCore + 4 分支可展开）+ 共进化循环 + 用户进化记录
- 所有页面标题已改成 Notion 风（短名词+一行说明）
- 三套主题切换正常

## ⚠️ 待办（本次线程要做的事）

### 待办 0：先修复 1 个 lint error（阻塞 build 验收）
npm run lint 报错：某组件 35:7 "This value cannot be modified. Modifying a variable defined outside a component or hook is not allowed."
大概率在 src/components/Integrations.tsx 第 35 行附近（onKey 闭包里修改外部变量，或类似问题）。
请先 npm run lint 看具体文件，改成用 ref 或 state，让 lint 通过。

### 待办 1：目标舱工作窗（GoalWorkspace）重设计 —— 这是主要工作
位置：src/App.tsx 里的 GoalWorkspace 组件（在 GoalsPage 下方）。
当前问题：工作窗里的"继续对话"对话框太小，且只有"继续上次"一个按钮能用，逻辑不对。

需要改成（用户原话要求）：
1a. 主入口改成「让 EvoPi 补一版」的小票流：
    - 点击后显示进度条，告诉用户进展到哪里
    - 进度条下方是"小票"，能看到完成了哪些任务
    - 数据已备好：src/data.ts 里 receiptTemplates（按目标名 key，每个含 ReceiptTask[]{title,done} 数组）
    - 逻辑：点"补一版"→ 进度条从 0 滚到对应 done 数量 → 逐条点亮小票任务

1b. 同时提供 PiRoom 风格的大对话（不要小对话框）：
    - 参考现有 RoomChat 组件（src/App.tsx 里的 room-chat-shell / chat-stream / asset-rail 那套结构）
    - 左边是对话流，右边不是资料库，而是**这个目标专属的模板/记忆库**
    - 数据已备好：src/data.ts 里 goalSnippets（按目标名 key，每个含 GoalSnippet[]{title,kind,preview}，kind 分 template/memory/style）
    - 用户点右侧模板/记忆可以直接插入到对话

1c. 对话上下文「整合成 Skill」需用户确认，与模板库联动：
    - 对话过程中积累的上下文（缓存），需要用户在工作台点确认
    - 确认后整合成一个 Skill，沉淀回该目标的模板库
    - 这是两部分的联动：工作窗对话 ↔ 模板库

### 待办 2：补充样式
src/App.css 需要为以下新组件补样式（部分可能已有，检查后补缺）：
- nav-auth-collapsed 状态（控制台收起后登录/注册按钮缩成图标按钮，类名 .nav-auth-icon-only）
- integrations 系统外接（.integrations / .integration-row / .integration-main / .integration-aux / .agent-toggle / .kbd / .integration-hint）
- onboarding 问卷页（.onboard / .onboard-card / .onboard-progress / .onboard-bar / .onboard-hello / .onboard-q / .onboard-options / .onboard-option / .onboard-nav）
- 工作窗新结构（补一版小票：.ws-receipt / .ws-progress / .ws-task；大对话复用 room-chat-* 类名；模板库 .ws-snippets / .ws-snippet）
这些类名在组件文件里已用，但 CSS 可能不全，build 不报错但会没样式，需要逐个对照补全。

## 产品背景（重要，影响设计判断）
EvoPi 是基于 EvoMap 的自进化个人助理，赛道 The Maze：个人助理与深度个性化。
核心：不是让用户手动管理，而是助理自动理解工作状态、整理任务与知识、推荐上下文，并记录自身进化。
产品方案明确说：PiCore"不要做成单纯宠物"，而是用状态展示成长。HappyDog 是 PiCore 的可视化身，不是普通宠物。
进化逻辑：用户进化 ⇄ Agent 进化，互相促进。每次用户点 Enter，Agent 记录处理内容 + 给改进建议。

## 用户硬性要求
1. 前端是真实产品界面，不是路演展示页。不要出现"黑客松""赛道""评分""Demo""相关度"这类词。
2. 界面中文为主。EvoPi/EvoMap/Gene/Capsule/PiRoom/PiCore/Pi 伙伴 可保留英文。
3. 导航栏中文，右侧状态栏中文。
4. 今日工作台是默认页面。
5. 左侧导航必须是真实页面切换，不要改回单页滚动。
6. 三套主题切换要流畅，风格差异要明显。
7. 移动端可用，导航可横滚或底部导航。

## EvoMap 相关（重要边界）
本轮不接 EvoMap。EVOMAP.md 已写接入边界。不要擅自注册、发布、fetch、心跳或保存 EvoMap 凭据。
真实 EvoMap 操作需要用户在当前线程明确授权。

## 不要动的文件
- /Users/sugeladi/Documents/进化酒馆/赛道二_The_Maze_自进化个人助理产品想法文档.docx
- /Users/sugeladi/Documents/进化酒馆/EvoPi_The_Maze_自进化个人助理产品方案_优化版.docx
- /Users/sugeladi/Documents/进化酒馆/evopi_pigenome_flow.png
- /Users/sugeladi/Documents/进化酒馆/evopi-web/EVOMAP.md

## 可修改的主要文件
- src/App.tsx（主逻辑）
- src/App.css（样式）
- src/data.ts（数据，大部分新数据已备好可直接用）
- src/index.css（主题令牌）
- src/components/*（组件）
- public/cute-line-icons/*（如需新图标，用 cute-line 技能脚本从 ~/.codex/skills/cute-line-website 复制）

## 建议开工顺序
1. npm run dev 起 server，浏览器看一遍现状
2. 读 data.ts 全文（数据都在，直接用）
3. 修 lint error（待办0）
4. 做 GoalWorkspace 重设计（待办1，核心）
5. 补 CSS（待办2）
6. npm run lint && npm run build 验收
7. playwright 截图桌面+移动验收

现在请先读上述文件了解现状，然后从修 lint error 开始。

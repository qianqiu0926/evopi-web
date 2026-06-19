/* ============================================================
   EvoPi · 产品数据层
   - 启动页问候 / 快捷入口
   - 工作台（Notion 风，精简）
   - 目标舱 / 记忆库 / 技能中心 / 进化日志 / 隐私设置
   - PiRoom：人物导入 + 对话 + 资产资料库
   UI 全中文，仅 EvoPi/EvoMap/Gene/Capsule/PiRoom/PiCore 专有名保留英文
   ============================================================ */

export type Depth = 0 | 1 | 2 | 3 | 4

/* —— 页面元信息（Notion 风标题：短名词 + 一行说明） —— */
export type PageMeta = { title: string; desc?: string }

export const pageMeta: Record<string, PageMeta> = {
  today: { title: '今日工作台', desc: '今天 EvoPi 为你整理好的，等你来确认' },
  goals: { title: '目标舱', desc: '每个长期目标都是一个会进化的专属工作舱' },
  memory: { title: '记忆库', desc: 'EvoPi 整理的记忆，确认后才会保留' },
  room: { title: 'PiRoom', desc: '邀请不同视角进房间，一起把事想清楚' },
  skills: { title: '技能中心', desc: '安装、训练和管理你的专属技能' },
  evolution: { title: '进化日志', desc: 'EvoPi 如何从你的反馈里调整行为' },
  privacy: { title: '隐私权限', desc: '所有自动化都从可控权限开始' },
}

/* —— 启动页 —— */
export const greeting = {
  hello: '晚上好',
  name: '',
  sub: 'EvoPi 已为你整理好今天，想从哪件事开始？',
}

export const quickStarts = [
  { icon: 'soft-chat-bubble' as const, title: '继续和谁聊聊', desc: '上次和张雪峰的对话还没结束', tag: 'PiRoom' },
  { icon: 'soft-goal-flag' as const, title: '推进职业成长', desc: '下一步：补齐季度成果素材', tag: '目标舱' },
  { icon: 'soft-database-stack' as const, title: '看看今天整理了什么', desc: '18 条新记忆，3 项待你确认', tag: '记忆库' },
  { icon: 'soft-sparkle-edit' as const, title: '开始一件新事', desc: '告诉 EvoPi 你接下来想做什么', tag: '输入' },
]

/* —— 工作台快捷区（精简，仿 Notion） —— */
export const todayFocus = {
  next: '补齐职业成长的季度成果素材',
  deadline: '今晚 20:00 前',
}

export const recentMemories = [
  { title: '产品评审会议纪要已拆分', meta: '3 条结论 · 5 条待办', time: '09:20', tone: 'mint' as const },
  { title: '你偏好「先结论后步骤」的输出格式', meta: '已从对话中学习', time: '昨天', tone: 'blue' as const },
  { title: '录音转写已完成，待你确认', meta: '14 分钟 · 6 个关键点', time: '昨天', tone: 'yellow' as const },
]

export const pendingCount = 3

/* —— 目标舱 —— */
export type Goal = {
  name: string
  icon: string
  progress: number
  // 详细的文字状态：描述当前工作台进度 + 助理自动化程度，而不是裸数值/关键词
  status: string
  next: string
  memory: string
  milestone: string
  review: string
  related: string[]
  // 宠物生长值（替代原"关联技能"）
  growthXp: number
  growthLevel: number
  growthLabel: string
  // 专属工作窗口触发节点：用户每次进来点这里开启一个专属工作任务
  workspace: {
    icon: string
    type: string // 工作窗口类型，如 思维导图 / 教案 / 访谈
    title: string // 工作窗口名称
    hint: string // 一句话说明这个窗口能做什么
    lastOpen: string // 上次进入
  }
}

export const goals: Goal[] = [
  {
    name: '职业成长',
    icon: 'soft-goal-flag',
    progress: 68,
    status: '正在整理本季度的 4 个重点项目成果，助理已自动归纳出 3 条汇报亮点，等你确认后写入述职材料。',
    next: '补齐本季度成果素材，整理汇报亮点',
    memory: '34 条',
    milestone: '本季度复盘',
    review: '每周日 21:00',
    related: ['上次述职反馈', '能力差距清单'],
    growthXp: 340,
    growthLevel: 3,
    growthLabel: '稳步成长',
    workspace: {
      icon: 'soft-sparkle-edit',
      type: '述职工作台',
      title: '汇报材料整理',
      hint: '一键调出成果素材、亮点草稿和历史反馈',
      lastOpen: '昨天 21:14',
    },
  },
  {
    name: '课程准备',
    icon: 'soft-book-open',
    progress: 42,
    status: '第二讲的课堂活动初稿已生成，助理正对照学生水平标注需要补充的互动环节，教案进度过半。',
    next: '生成第二讲的课堂活动与作业',
    memory: '18 条',
    milestone: '第二讲上线',
    review: '每讲结束后',
    related: ['学生水平', '教学目标'],
    growthXp: 210,
    growthLevel: 2,
    growthLabel: '渐入状态',
    workspace: {
      icon: 'soft-notebook-lines',
      type: '教案工作台',
      title: '第二讲教案',
      hint: '教学目标、课堂活动、作业和反馈在一起推进',
      lastOpen: '今天 10:02',
    },
  },
  {
    name: '创业计划',
    icon: 'soft-sparkle-edit',
    progress: 27,
    status: '用户访谈问题清单已就绪，助理在等待你确认访谈对象范围；定价假设与竞品观察仍在收集中。',
    next: '整理用户访谈问题清单',
    memory: '21 条',
    milestone: '完成 10 位访谈',
    review: '每两周',
    related: ['竞品观察', '定价假设'],
    growthXp: 135,
    growthLevel: 2,
    growthLabel: '起步阶段',
    workspace: {
      icon: 'soft-idea-bulb',
      type: '访谈工作台',
      title: '用户访谈',
      hint: '问题清单、访谈记录和洞察归纳集中管理',
      lastOpen: '3 天前',
    },
  },
]

/* —— 记忆库 —— */
export const memoryCategories = ['全部', '核心', '情景', '语义', '程序', '项目', '技能']

export const memories = [
  { title: '上周沟通中确认的输出偏好：先结论后步骤', source: '对话记录', time: '今天 09:20', state: '已确认', cat: '核心' },
  { title: '产品讨论里关于定价的关键决策', source: '会议纪要', time: '昨天 18:10', state: '待合并', cat: '情景' },
  { title: '常用的方案结构模板（三段式）', source: '文件整理', time: '周二', state: '可复用', cat: '程序' },
  { title: '职业成长目标的能力差距清单', source: '目标舱', time: '周一', state: '已确认', cat: '项目' },
  { title: '不希望自动保存的私人片段', source: '手动标记', time: '周一', state: '敏感', cat: '核心' },
]

/* —— 技能中心 —— */
export const installedSkills = [
  { name: '会议纪要', icon: 'soft-document-page' as const, trigger: '收到录音或会议文本', scope: '日历、已授权文件', status: '已启用' },
  { name: '思维导图', icon: 'soft-sparkle-edit' as const, trigger: '要求梳理结构时', scope: '当前目标与选中记忆', status: '已启用' },
  { name: '教案生成', icon: 'soft-book-open' as const, trigger: '目标舱为课程准备时', scope: '教材、历史教案', status: '已启用' },
  { name: '资料研究', icon: 'soft-notebook-lines' as const, trigger: '需要追踪公开资料时', scope: '白名单来源', status: '试用中' },
]

export const storeSkills = [
  { name: '会后待办追踪', icon: 'soft-calendar-reminder' as const, trigger: '会议结束后', scope: '提醒事项、日历', status: '推荐' },
  { name: '邮件摘要', icon: 'soft-log-lines' as const, trigger: '收到长邮件时', scope: '邮件（白名单）', status: '推荐' },
  { name: '数据图表解读', icon: 'soft-target-bullseye' as const, trigger: '打开表格时', scope: '已授权文件', status: '浏览' },
]

/* —— 进化日志 —— */
export const evolutionLogs = [
  { label: '信号', en: 'Signal', icon: 'soft-search-spark' as const, text: '你连续两次反馈「方案太长，想先看结论」，系统识别为写作偏好信号。' },
  { label: '行为基因', en: 'Gene', icon: 'soft-sparkle-edit' as const, text: '生成 gene_pitch_concise：先结论、再步骤、最后补来源。' },
  { label: '经验胶囊', en: 'Capsule', icon: 'soft-success-check' as const, text: '记录一次成功执行：触发、策略、输出、你的采纳，置信度 0.82。' },
  { label: '验证', en: 'ValidationReport', icon: 'soft-shield-check' as const, text: '只影响方案类场景；论文写作仍用详细版，未全局启用。' },
]

/* ============================================================
   进化日志 · 思维导图画布数据
   中心核 = PiCore，向 4 个方向辐射 4 条进化线
   每个分支有可展开子节点
   ============================================================ */
export type EvNode = { title: string; meta?: string; icon?: string }

export type EvBranch = {
  id: string
  label: string
  color: 'pink' | 'blue' | 'yellow' | 'mint'
  icon: string
  desc: string
  children: EvNode[]
}

// 四条进化线
export const evolutionBranches: EvBranch[] = [
  {
    id: 'knowledge',
    label: 'Agent 学了什么',
    color: 'blue',
    icon: 'soft-book-open',
    desc: 'EvoPi 最近研究的开源项目、AI 资料和它自己配置的 Skill',
    children: [
      { title: '阅读了 langchain-ai/langgraph', meta: '开源项目 · 用于状态机式 Agent', icon: 'soft-notebook-lines' },
      { title: '关注了「ReAct 范式」相关 7 篇论文', meta: 'AI 日志 · 本周新增', icon: 'soft-document-page' },
      { title: '自己配置了 Skill：会后待办追踪', meta: '本地技能 · 已启用', icon: 'soft-settings-gear' },
      { title: '研究了你的领域 RAG 实践仓库', meta: '开源项目 · fork 2', icon: 'soft-notebook-lines' },
      { title: '配置了 Skill：邮件摘要（白名单）', meta: '本地技能 · 试用中', icon: 'soft-settings-gear' },
    ],
  },
  {
    id: 'automation',
    label: '自动化处理',
    color: 'mint',
    icon: 'soft-refresh-loop',
    desc: 'EvoPi 自动跑通的流程，以及它们的成功率',
    children: [
      { title: '会议录音 → 拆结论与待办', meta: '本周 6 次 · 成功率 92%', icon: 'soft-microphone-voice' },
      { title: '长邮件 → 三段式摘要', meta: '本周 14 封 · 已确认 11', icon: 'soft-log-lines' },
      { title: '空闲时段深度整理记忆', meta: '每天 1 次 · 归纳 3 条习惯', icon: 'soft-database-stack' },
      { title: '日历事项提前提醒', meta: '本周 9 次 · 全部采纳', icon: 'soft-calendar-reminder' },
    ],
  },
  {
    id: 'knowledge2',
    label: '自动化整理的资料',
    color: 'yellow',
    icon: 'soft-folder-tab',
    desc: 'EvoPi 自动归档、打标签的可复用资料',
    children: [
      { title: '产品评审会议纪要（已拆分）', meta: '3 结论 · 5 待办 · 归入「职业成长」', icon: 'soft-document-page' },
      { title: '用户访谈记录合集', meta: '21 条 · 归入「创业计划」', icon: 'soft-database-stack' },
      { title: '竞品观察与定价假设', meta: '2 份 · 归入「创业计划」', icon: 'soft-note-sticky' },
      { title: '论文笔记三篇合并稿', meta: '49 条 · 归入「研究项目」', icon: 'soft-notebook-lines' },
    ],
  },
  {
    id: 'behavior',
    label: '行为基因变化',
    color: 'pink',
    icon: 'soft-sparkle-edit',
    desc: '从你的反馈里沉淀、增强或验证的行为基因（Gene）',
    children: [
      { title: 'gene_pitch_concise', meta: '增强 · 先结论后步骤', icon: 'soft-success-check' },
      { title: 'gene_meeting_cleanup', meta: '新增 · 会后待办追踪', icon: 'soft-success-check' },
      { title: 'gene_source_cite', meta: '验证 · 论文场景未启用', icon: 'soft-shield-check' },
    ],
  },
]

/* —— 共进化循环：用户进化 ⇄ Agent进化，互相促进 —— */
export const coEvolutionLoop = [
  {
    side: 'user',
    title: '用户进化',
    icon: 'soft-role-users',
    desc: '每一次你点 Enter，EvoPi 记录你正在处理的内容，并给出它认为你可以改进的小建议。',
  },
  {
    side: 'agent',
    title: 'Agent 进化',
    icon: 'soft-sparkle-twinkle',
    desc: '你的采纳、纠正、忽略成为信号，蒸馏成 Gene 与 Capsule，让 Agent 更懂你。',
  },
]

/* —— 用户进化记录：每次 Enter 的快照 + Agent 给用户的改进建议 —— */
export type UserEvoEntry = {
  time: string
  task: string // 用户当时点 Enter 处理的内容
  recorded: string // Agent 帮用户记录/归纳的内容
  suggestion: string // Agent 认为用户可以改进的小建议
}

export const userEvolutionLog: UserEvoEntry[] = [
  {
    time: '今天 11:08',
    task: '写季度述职草稿',
    recorded: '你本次聚焦在 3 个项目的成果量化上，习惯先写背景再补数据。',
    suggestion: '可以尝试先放一句结论，再给数据支撑——评审会更易抓住重点。',
  },
  {
    time: '今天 09:20',
    task: '整理产品评审录音',
    recorded: '你处理了 14 分钟录音，确认了 3 条结论、5 条待办。',
    suggestion: '会后待办容易遗漏，建议开启「会后追踪」让它自动跟进。',
  },
  {
    time: '昨天 21:14',
    task: '准备第二讲教案',
    recorded: '你按教学目标→课堂活动→作业的顺序推进，引用了 2 份历史反馈。',
    suggestion: '学生水平差异较大，可补充一个分层任务作为备选。',
  },
  {
    time: '昨天 16:30',
    task: '梳理用户访谈问题',
    recorded: '你围绕定价假设整理了 8 个问题，标注了优先级。',
    suggestion: '「换方向动机」这类问题较敏感，可放在建立信任后再问。',
  },
]

/* —— 隐私 / 设置（介入深度下沉到这里） —— */
export const collaborationLevels: Array<{ code: string; label: string; desc: string }> = [
  { code: 'L0', label: '手动', desc: '只在你说的时候才工作' },
  { code: 'L1', label: '推荐', desc: '给建议，你点击后才采用' },
  { code: 'L2', label: '协作', desc: '预览整理结果，等你确认' },
  { code: 'L3', label: '代理', desc: '低风险任务可自动执行' },
  { code: 'L4', label: '自进化', desc: '归纳习惯，主动建议升级' },
]

export const privacyRows: Array<[string, string, string, boolean]> = [
  ['屏幕状态读取', '开启', '只在授权应用中识别工作状态', true],
  ['文件读取范围', '已限制', '仅桌面与项目文件夹', true],
  ['日历与提醒事项', '开启', '写入前需要你确认', true],
  ['敏感应用排除', '已设置', '聊天、支付、私人相册', true],
  ['自动执行权限', '低风险', '仅整理与提醒，写入需确认', false],
  ['发布前脱敏', '开启', '只发布策略，不发布私密内容', true],
]

/* ============================================================
   PiRoom：人物导入 + 对话 + 资产资料库
   ============================================================ */
export type RoomPerson = {
  id: string
  name: string
  type: 'preset' | 'custom'
  desc: string
  basis: string // 生成的资料依据
  avatar: string // 图标 slug
  online?: boolean
}

export const presetPersons: RoomPerson[] = [
  { id: 'zhangxuefeng', name: '张雪峰', type: 'preset', desc: '考研与专业选择视角', basis: '公开演讲、访谈、直播片段', avatar: 'soft-role-users', online: true },
  { id: 'jobs', name: '产品审稿人（乔布斯式）', type: 'preset', desc: '极致用户视角的产品审视', basis: '公开发布会、传记访谈', avatar: 'soft-sparkle-edit', online: false },
  { id: 'investor', name: '投资人视角', type: 'preset', desc: '从商业模式和增长提问', basis: '公开行业分析与访谈', avatar: 'soft-target-bullseye', online: false },
]

/* —— 资产资料库（可勾选加入对话的文件） —— */
export type Asset = {
  id: string
  name: string
  kind: 'doc' | 'note' | 'memory' | 'image' | 'audio'
  meta: string
  source: string
}

export const assetLibrary: Asset[] = [
  { id: 'a1', name: '产品评审会议纪要.docx', kind: 'doc', meta: '今天 09:20', source: '记忆库' },
  { id: 'a2', name: '职业成长目标与能力差距', kind: 'note', meta: '本周', source: '目标舱' },
  { id: 'a3', name: '用户访谈记录合集', kind: 'doc', meta: '21 条', source: '创业计划' },
  { id: 'a4', name: '上次和张雪峰的对话', kind: 'memory', meta: '昨天', source: 'PiRoom' },
  { id: 'a5', name: '定价假设与竞品分析', kind: 'note', meta: '上周', source: '创业计划' },
  { id: 'a6', name: '录音·产品讨论.mp3', kind: 'audio', meta: '14 分钟', source: '文件' },
  { id: 'a7', name: '论文笔记三篇', kind: 'doc', meta: '49 条', source: '研究项目' },
  { id: 'a8', name: '课堂反馈截图.png', kind: 'image', meta: '上周', source: '课程准备' },
]

/* —— 对话消息（mock，展示真实对话形态） —— */
export type ChatMsg = {
  from: 'me' | 'them'
  text: string
  time: string
  attached?: string[] // 引用的资产名
}

export const sampleChat: Record<string, ChatMsg[]> = {
  zhangxuefeng: [
    { from: 'me', text: '我目前在一家互联网公司做产品，但又想考研换个方向，想听听你的看法。', time: '14:02', attached: ['职业成长目标与能力差距'] },
    { from: 'them', text: '先别急着换方向。我问你三个问题：你现在做产品的核心成就感来自哪？换方向是为了逃避现在的困境，还是真有更想做的事？你愿意为它付出多大的成本（时间、收入、机会）？', time: '14:03' },
    { from: 'me', text: '成就感来自把一个模糊需求做成清晰产品。换方向主要是对现在的业务方向不看好，不是逃避。成本上我可以接受两到三年的收入下降。', time: '14:05' },
    { from: 'them', text: '那思路就清楚了。你不是要逃离产品，你是不看好当前赛道。这种情况下，比起「考研换方向」，更值得想的是「换到一个你看好的赛道里继续做产品」。考研是手段不是目的，别把手段当目标。', time: '14:06' },
  ],
}

/* —— 右侧 PiCore 状态 —— */
export const piCoreState: Array<{ label: string; value: string }> = [
  { label: '今日已整理记忆', value: '18 条' },
  { label: '待确认内容', value: '3 项' },
  { label: '正在学习的习惯', value: '偏好简洁、先给结论' },
  { label: '下次可升级能力', value: '会后待办自动整理' },
]

/* ============================================================
   导航分组（左侧控制台按功能模块聚合，可分组收起）
   ============================================================ */
export type NavGroup = {
  id: string
  label: string
  items: Array<{ key: string; label: string; icon: string }>
}

export const navGroups: NavGroup[] = [
  {
    id: 'work',
    label: '日常工作',
    items: [
      { key: 'today', label: '今日工作台', icon: 'soft-dashboard-tiles' },
      { key: 'goals', label: '目标舱', icon: 'soft-goal-flag' },
      { key: 'memory', label: '记忆库', icon: 'soft-database-stack' },
    ],
  },
  {
    id: 'grow',
    label: '成长与对话',
    items: [
      { key: 'room', label: 'PiRoom', icon: 'soft-chat-bubble' },
      { key: 'skills', label: '技能中心', icon: 'soft-settings-gear' },
      { key: 'evolution', label: '进化日志', icon: 'soft-log-lines' },
    ],
  },
  {
    id: 'system',
    label: '系统',
    items: [
      { key: 'privacy', label: '隐私权限', icon: 'soft-privacy-eye' },
    ],
  },
]

/* ============================================================
   PiCore 生命核 · 以 HappyDog 为可视化身（不冒充普通宠物）
   状态按产品方案：学习进度 / 今日消化 / 待喂反馈 / 权限升级
   精灵图：6 行 × 6 列，每帧 256×312，每行一个动画序列
   ============================================================ */
export type PetMood =
  | 'idle' // 待机（呼吸）
  | 'happy' // 开心（学习被采纳 / 进化完成）
  | 'feeding' // 待喂反馈（有待确认内容）
  | 'learning' // 整理中（空闲深度归纳）
  | 'sleeping' // 休眠（已暂停）

export type PetAnim = {
  mood: PetMood
  label: string // 中文状态名
  desc: string // 一句话说明，对应产品方案的 PiCore 状态语义
  row: number // 对应精灵图第几行（0-5）
  frames: number // 该行有效帧数
}

// 每行有效帧数来自精灵图实测（行2=4帧, 行4/5=5帧, 其余6帧）
export const petAnimations: PetAnim[] = [
  { mood: 'idle', label: '待机', desc: 'EvoPi 正在安静观察你的工作状态', row: 0, frames: 6 },
  { mood: 'happy', label: '开心', desc: '你采纳了它的一条建议，它在记下这次成功', row: 1, frames: 6 },
  { mood: 'feeding', label: '等待喂反馈', desc: '有 3 项整理结果等你确认，它在等你点头', row: 2, frames: 4 },
  { mood: 'learning', label: '整理中', desc: '空闲时段，正在归纳习惯并提炼行为基因', row: 3, frames: 6 },
  { mood: 'sleeping', label: '休眠', desc: 'EvoPi 已暂停，不会做任何自动操作', row: 4, frames: 5 },
]

// 精灵图帧参数
export const petSheet = {
  src: '/pet/happydog.webp',
  frameW: 256,
  frameH: 312,
  cols: 6,
  fps: 8,
}

// 可领养的宠物候选（同一套素材，不同昵称/配色意向）
export const adoptablePets = [
  { id: 'happydog', name: '小奶狗', avatar: 'soft-favorite-collection', desc: '温顺黏人，喜欢在你专注时安静陪伴' },
]

// PiCore 三个模块（产品方案：最多 3 个 Pi 模块）
export const piModules = [
  { name: '今日消化', value: '18 条记忆', icon: 'soft-database-stack' as const },
  { name: '待喂反馈', value: '3 项待确认', icon: 'soft-warning-triangle' as const },
  { name: '权限升级', value: '会后待办追踪', icon: 'soft-unlock-next' as const },
]

/* ============================================================
   会话与登录注册（前端 mock，不接入真实后端）
   验证码仅做格式校验，不真实发送邮箱（无后端）
   ============================================================ */
export type AuthUser = {
  email: string
  name: string
  loggedInAt: number
}

// 模拟验证码：真实场景应由后端发送到邮箱；这里前端生成一个 6 位码并在 toast 提示
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export const codeTTL = 5 * 60 * 1000 // 5 分钟有效

/* ============================================================
   目标工作窗：目标专属模板/记忆库（对话右侧栏，可点击插入）
   这是用户确认后才沉淀的"缓存上下文"，最终可整合成 Skill
   ============================================================ */
export type GoalSnippet = {
  id: string
  title: string
  kind: 'template' | 'memory' | 'style'
  preview: string
}

export const goalSnippets: Record<string, GoalSnippet[]> = {
  职业成长: [
    { id: 't1', title: '述职三段式模板', kind: 'template', preview: '成果结论 → 关键数据 → 下一步计划' },
    { id: 't2', title: '量化表达风格', kind: 'style', preview: '每个成果配一个数字 + 对比基线' },
    { id: 't3', title: '上次述职反馈', kind: 'memory', preview: '评委：结论要前置，数据要可追溯' },
    { id: 't4', title: '能力差距清单', kind: 'memory', preview: '3 项待补：数据叙事、向上沟通…' },
  ],
  课程准备: [
    { id: 'c1', title: '教案结构模板', kind: 'template', preview: '教学目标 → 课堂活动 → 作业 → 反馈' },
    { id: 'c2', title: '分层任务模板', kind: 'template', preview: '基础 / 进阶 / 挑战 三档' },
    { id: 'c3', title: '学生水平记录', kind: 'memory', preview: '差异较大，需备分层任务' },
    { id: 'c4', title: '历史课堂反馈', kind: 'memory', preview: '互动环节最受欢迎' },
  ],
  创业计划: [
    { id: 's1', title: '访谈问题模板', kind: 'template', preview: '背景 → 痛点 → 付费意愿 → 替代方案' },
    { id: 's2', title: '商业分析框架', kind: 'template', preview: '问题 → 方案 → 市场 → 模式 → 增长' },
    { id: 's3', title: '定价假设', kind: 'memory', preview: '分层定价 + 年付折扣' },
    { id: 's4', title: '竞品观察', kind: 'memory', preview: '3 家对标，定价区间 X–Y' },
  ],
}

// 「补一版」小票：EvoPi 自动执行的任务清单 + 进度
export type ReceiptTask = { title: string; done: boolean }
export const receiptTemplates: Record<string, ReceiptTask[]> = {
  职业成长: [
    { title: '调取本季度 4 个项目成果素材', done: true },
    { title: '归纳 3 条汇报亮点', done: true },
    { title: '对照能力差距清单补缺口', done: true },
    { title: '生成述职草稿初版', done: false },
  ],
  课程准备: [
    { title: '调出教学目标与学生水平', done: true },
    { title: '生成第二讲课堂活动', done: true },
    { title: '补一份分层任务作为备选', done: false },
    { title: '生成课后作业', done: false },
  ],
  创业计划: [
    { title: '调出已访谈记录', done: true },
    { title: '补充 2 个访谈问题', done: true },
    { title: '标注敏感问题顺序', done: false },
    { title: '生成访谈话术初版', done: false },
  ],
}

/* ============================================================
   系统外接（Pi 伙伴下方）：微信 / 飞书等转接入口
   - 跳转到对应应用继续工作
   - 快捷键回到 EvoPi
   - 可开代理让 Agent 去对应应用工作
   ============================================================ */
export type Integration = {
  id: string
  name: string
  icon: string
  desc: string
  url: string // 跳转地址（演示用占位）
  shortcut: string // 回到 EvoPi 的快捷键
  agentSupported: boolean
}

export const integrations: Integration[] = [
  {
    id: 'wechat',
    name: '微信',
    icon: 'soft-chat-bubble',
    desc: '跳转到微信继续沟通，或让 Agent 代为跟进',
    url: 'weixin://',
    shortcut: '⌘ ⇧ W',
    agentSupported: true,
  },
  {
    id: 'feishu',
    name: '飞书',
    icon: 'soft-folder-tab',
    desc: '跳转到飞书文档与会议，快捷键回来',
    url: 'feishu://',
    shortcut: '⌘ ⇧ F',
    agentSupported: true,
  },
  {
    id: 'email',
    name: '邮件',
    icon: 'soft-send-plane',
    desc: '跳转到邮件客户端，可让 Agent 代发草稿',
    url: 'mailto:',
    shortcut: '⌘ ⇧ E',
    agentSupported: false,
  },
]

/* ============================================================
   新用户预配置（onboarding）：算法厌恶 + 信息过载相关
   注册后必须完成，才能领 Pi 伙伴
   ============================================================ */
export type OnboardQuestion = {
  id: string
  dimension: '算法厌恶' | '信息过载' | '信任' | '协作'
  title: string
  desc: string
  options: Array<{ label: string; value: number; hint: string }> // value 影响初始介入深度
}

export const onboardingQuestions: OnboardQuestion[] = [
  {
    id: 'q1',
    dimension: '算法厌恶',
    title: '当助手主动帮你整理或改动内容时，你更希望它？',
    desc: '这决定了 EvoPi 默认有多主动，之后随时能调。',
    options: [
      { label: '只在我要求时才动手', value: 0, hint: '最克制，零打扰' },
      { label: '给建议，我点确认才采用', value: 1, hint: '推荐档，平衡' },
      { label: '低风险的事可以直接做完给我看', value: 3, hint: '更主动' },
    ],
  },
  {
    id: 'q2',
    dimension: '信息过载',
    title: '一天里你需要处理的信息量，你觉得？',
    desc: 'EvoPi 会据此控制它推给你的整理结果数量。',
    options: [
      { label: '经常过载，希望先给最关键的', value: 3, hint: '强化降噪' },
      { label: '有时多，关键和细节都想要', value: 2, hint: '适度' },
      { label: '还好，我能自己把握', value: 1, hint: '少干预' },
    ],
  },
  {
    id: 'q3',
    dimension: '信任',
    title: '你希望 EvoPi 在多大范围内主动工作？',
    desc: '涉及隐私的边界，宁紧勿松，可随时收紧。',
    options: [
      { label: '只读公开资料和我授权的文件', value: 0, hint: '最小范围' },
      { label: '可以读我的日历和提醒事项', value: 1, hint: '加入日程' },
      { label: '可以读我授权的应用状态', value: 2, hint: '更完整' },
    ],
  },
  {
    id: 'q4',
    dimension: '协作',
    title: '你更习惯怎么和助手配合？',
    desc: '这影响它给你的是结论先行，还是过程先行。',
    options: [
      { label: '先给我结论，细节我需要再展开', value: 3, hint: '结论优先' },
      { label: '给步骤，我跟着走', value: 2, hint: '步骤优先' },
      { label: '先解释清楚再操作', value: 1, hint: '解释优先' },
    ],
  },
]


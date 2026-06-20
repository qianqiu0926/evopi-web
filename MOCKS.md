# EvoPi Mock 清单

本文记录当前前端中尚未对接真实服务、仅用本地状态或静态数据模拟的部分。后续接后端、Agent 或 EvoMap 时可按此清单逐项替换。

## 统计

当前共有 12 类 mock / 未接真实服务能力：

| 序号 | 模块 | 当前状态 | 主要位置 | 后续需要对接 |
| --- | --- | --- | --- | --- |
| 1 | 全局产品数据 | 页面内容、目标、记忆、技能、人物、进化日志均来自静态数组 | `src/data.ts` | 后端数据 API、用户账号数据 |
| 2 | 登录注册 | 邮箱验证码由前端生成并显示；任意 6 位数字可通过 | `src/components/AuthModal.tsx` | 账号系统、邮件验证码、会话存储 |
| 3 | 新用户 onboarding | 答案只存在当前 React state，刷新后丢失 | `src/components/Onboarding.tsx`, `src/App.tsx` | 用户画像保存、协作深度配置接口 |
| 4 | 今日工作台输入 | 输入框、语音、发送、开始推进、换一件未触发真实任务 | `src/App.tsx` | Agent 任务创建、语音输入、日程/提醒接口 |
| 5 | 目标舱小票流 | `让 EvoPi 补一版` 只按 `receiptTemplates` 点亮任务 | `src/App.tsx`, `src/data.ts` | 后台任务进度、真实产物、失败/重试状态 |
| 6 | 目标舱大对话 | 回复由前端固定文本和 `setTimeout` 模拟 | `src/App.tsx` | 对话 API、目标上下文检索、流式回复 |
| 7 | Skill 沉淀 | `确认成 Skill` 只写入当前页面 state，刷新后消失 | `src/App.tsx` | Skill 创建、版本管理、模板库持久化 |
| 8 | 记忆库操作 | 搜索仅本地过滤；确认、合并、忽略按钮未写入真实状态 | `src/App.tsx`, `src/data.ts` | 记忆 CRUD、合并流程、敏感标记 |
| 9 | PiRoom 对话 | 预设人物、资料库和回复均为静态模拟 | `src/App.tsx`, `src/data.ts` | 人物资料生成、文件上传、RAG、对话服务 |
| 10 | 技能中心 | 安装、管理按钮未执行真实安装或配置 | `src/App.tsx`, `src/data.ts` | Skill 商店、安装状态、权限配置 |
| 11 | PiCore 与系统外接 | 认领、命名、暂停只在本地 state；微信/飞书/邮件代理只是提示或协议跳转 | `src/components/PiCorePanel.tsx`, `src/components/Integrations.tsx` | 用户偏好持久化、真实应用集成、代理执行授权 |
| 12 | 隐私权限与 EvoMap | 权限开关和进化链路是静态展示；未连接 EvoMap | `src/App.tsx`, `src/data.ts`, `EVOMAP.md` | 权限系统、审计日志、EvoMap 注册/发布流程 |

## 接入边界

- 本轮不执行 `npm run evomap:register`。
- 不保存或修改 `~/.evomap` 凭据。
- 真实 EvoMap 注册、发布、fetch、heartbeat 需要用户在当前线程明确授权。


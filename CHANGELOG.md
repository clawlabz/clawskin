# ClawSkin Changelog

## [0.2.0] - 2026-03-01

### 重大更新：3/4 RPG 视角 + 移动系统重构 + 独立宠物系统

本次更新解决三个核心问题：角色被家具遮挡、移动不自然、宠物与角色绑定。

---

### 新增

- **独立宠物系统** (`js/pets/Pet.js`, `js/pets/PetManager.js`)
  - 宠物不再绑定 Agent，拥有独立的 AI 行为循环
  - 5 种宠物类型：猫 (walk)、狗 (walk)、机器人 (walk)、鸟 (fly)、仓鼠 (crawl)
  - 宠物自主移动：随机漫步、找 Agent 蹭腿、找其他宠物互动、原地睡觉
  - 鸟类飞行正弦波浮动 + 翅膀扇动动画
  - 仓鼠偶发高速冲刺行为
  - 宠物配置 localStorage 持久化，默认初始化猫 + 狗
  - 支持动态增删任意数量的宠物

- **POI 漫游系统** (`AgentSlot.js`)
  - Agent 空闲时 25% 概率前往 POI（水机、书架、窗户、植物）
  - 15% 概率走向同事工位进行社交互动
  - 到达 POI 后显示表情气泡（☕ 🌤️ 📖 👋 🌿）
  - 漫游范围扩大至全画面区域

- **新宠物精灵** (`SpriteGenerator.js`)
  - `_drawBird()`: 蓝色身体、橙色喙/爪、2 帧翅膀扇动动画
  - `_drawHamster()`: 小麦色、粉色鼓腮、圆耳朵、2 帧尾巴摆动

### 改进

- **3/4 俯视视角** — 采用经典 RPG 视角（类 Stardew Valley / Pokemon）
  - 角色站在桌子后方（Y 值更小 = 画面偏上 = 视觉偏远）
  - 桌子在角色前方（Y 值更大 = 画面偏下 = 视觉偏近）
  - 角色上半身完全可见，不再被家具遮挡

- **家具精灵重绘** (`SpriteGenerator.js`)
  - 桌子：3/4 视角可见桌面顶部 + 正面，木纹细节，48×20px
  - 显示器 → 笔记本电脑：键盘底座 + 倾斜屏幕，Apple 风格 logo，20×16px
  - 椅子：可见椅座坐垫 + 椅背 + 脚轮，16×18px

- **三阶段渲染管线** (`ClawSkinApp.js`)
  - Phase 1: 渲染所有椅子（永远可见）
  - Phase 2: 按 Y 坐标排序渲染角色（深度排序）
  - Phase 3: 渲染所有桌面 + 笔记本 + 咖啡杯（永远可见）
  - Phase 4: 渲染独立宠物

- **平滑移动** (`AgentSlot.js`)
  - 所有移动使用线性插值 (lerp)，告别瞬移/闪现
  - 返回工位也是平滑行走，不再直接 teleport
  - 移动速度提升：0.06~0.08（原 0.04~0.06）
  - 行走时带自然的正弦波摇晃效果

### 修复

- 修复 Agent 漫游时桌子/椅子消失的问题 — 家具现在永远渲染
- 修复宠物跟随 Agent 一起瞬移的问题 — 宠物已完全解耦
- 修复 Agent 漫游后闪现回工位的问题 — 改为平滑走回
- 修复多 Agent 场景中角色遮挡关系错误 — 引入 Y-sort 深度排序

### 文件变更

| 文件 | 类型 | 说明 |
|------|------|------|
| `js/sprites/SpriteGenerator.js` | 修改 | 重绘家具精灵 (3/4 视角)，新增鸟/仓鼠精灵 |
| `js/scenes/OfficeScene.js` | 修改 | 工位坐标重新计算，renderDesk 渲染顺序调整 |
| `js/app/ClawSkinApp.js` | 修改 | 三阶段渲染管线，集成 PetManager，Agent 社交引用 |
| `js/app/AgentSlot.js` | 重写 | lerp 平滑移动，POI 漫游系统，社交行为 |
| `js/character/CharacterSprite.js` | 修改 | 移除宠物渲染代码 |
| `js/pets/Pet.js` | **新建** | 独立宠物实体类 |
| `js/pets/PetManager.js` | **新建** | 宠物集合管理器 |
| `app.html` | 修改 | 添加 Pet/PetManager script 标签 |
| `index.html` | 修改 | 添加 Pet/PetManager script 标签 |
| `app.html` | 修改 | 添加 Pet/PetManager script 标签 |

---

## [0.1.0] - 2026-02-28

### 初始版本

- 纯 Canvas 2D 渲染，零外部依赖
- 32×32 像素角色程序化生成（16 帧动画）
- 5 种肤色、7 种发色、5 种发型、5 种服装类型
- 4 种配饰：眼镜、帽子、耳机、鸭舌帽
- 3 种宠物：猫、狗、机器人
- 3 个场景：办公室、黑客地下室、咖啡馆
- 8 种状态动画：idle、typing、thinking、executing、browsing、error、sleeping、waving
- 对话气泡系统
- 捏脸编辑器 UI
- Demo 模式（模拟状态切换）
- 多 Agent 支持（工位自动布局）
- Gateway WebSocket 连接（OpenClaw 协议）
- 点击 Agent 打开编辑器
- localStorage 配置持久化
- 嵌入式 iframe 页面

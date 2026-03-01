# ClawSkin 技术架构

## 产品定位
像素 Agent 皮肤引擎 —— 给 AI 助手一张脸、一间办公室、一段日常。

## 技术栈

| 层面 | 技术 | 说明 |
|------|------|------|
| 渲染引擎 | Phaser 3.80 (CDN) | 成熟2D像素游戏引擎，支持动画/粒子/物理 |
| 前端框架 | 原生 JS + Phaser | 保持轻量，嵌入式组件不需要Vue |
| 角色系统 | Sprite Sheet (PNG) | 32x32像素，8方向 + 状态动画 |
| 场景系统 | Tiled Map Editor → JSON | 瓦片地图，可扩展 |
| 状态同步 | WebSocket / SSE | 连接 OpenClaw Gateway 获取 Agent 状态 |
| 配置存储 | localStorage + JSON 文件 | 角色配置、场景偏好 |
| 部署 | 静态文件 (Vercel/Cloudflare Pages) | 零后端，纯前端 |

## 目录结构

```
clawSkin/
├── public/
│   ├── index.html          # 主页面（展示 + 捏脸 + 场景选择）
│   ├── assets/
│   │   ├── sprites/        # 角色 sprite sheets
│   │   │   ├── base/       # 基础身体（不同肤色）
│   │   │   ├── hair/       # 发型图层
│   │   │   ├── outfit/     # 服装图层
│   │   │   ├── accessory/  # 配饰图层（眼镜/帽子/耳机）
│   │   │   └── pet/        # 宠物伴侣
│   │   ├── tiles/          # 场景瓦片素材
│   │   ├── scenes/         # 预设场景 JSON (from Tiled)
│   │   └── effects/        # 粒子效果（雨/雪/星星/代码雨）
│   ├── js/
│   │   ├── game.js         # Phaser Game 主入口
│   │   ├── scenes/
│   │   │   ├── OfficeScene.js      # 像素办公室
│   │   │   ├── HackerScene.js      # 黑客地下室
│   │   │   ├── StudyScene.js       # 温馨书房
│   │   │   ├── SpaceScene.js       # 太空站
│   │   │   ├── CafeScene.js        # 咖啡馆
│   │   │   ├── ZenScene.js         # 日式禅室
│   │   │   ├── LabScene.js         # 实验室
│   │   │   └── CityScene.js        # 像素城市
│   │   ├── character/
│   │   │   ├── CharacterBuilder.js # 捏脸系统
│   │   │   ├── CharacterSprite.js  # 角色精灵渲染
│   │   │   └── AnimationManager.js # 动画状态机
│   │   ├── state/
│   │   │   ├── AgentStateSync.js   # OpenClaw 状态同步
│   │   │   └── BubbleManager.js    # 对话气泡管理
│   │   └── ui/
│   │       ├── CharacterEditor.js  # 捏脸 UI
│   │       └── ScenePicker.js      # 场景选择器
│   └── css/
│       └── style.css
├── docs/
│   ├── ARCHITECTURE.md     # 本文件
│   └── PROGRESS.md         # 进度记录
└── scripts/
    └── generate-sprites.js # 精灵图生成工具
```

## 核心模块设计

### 1. 角色系统 (Character System)

**图层合成**: 角色由多个图层叠加渲染
```
Layer 5: 配饰 (accessory) — 眼镜/帽子/耳机
Layer 4: 发型 (hair)
Layer 3: 服装 (outfit) — 格子衫/西装/实验服
Layer 2: 表情 (expression) — 开心/思考/困惑/困倦
Layer 1: 身体 (body) — 基础像素人形 + 肤色
Layer 0: 阴影 (shadow)
```

**角色配置 JSON**:
```json
{
  "id": "agent-001",
  "name": "二狗",
  "body": { "type": "default", "skin": "#FFD5C2" },
  "hair": { "type": "short_messy", "color": "#333333" },
  "outfit": { "type": "hoodie", "color": "#4A90D9" },
  "accessory": { "type": "round_glasses" },
  "pet": { "type": "pixel_cat", "color": "#FF9900" },
  "expression": "happy"
}
```

### 2. 状态联动 (Agent State Sync)

| OpenClaw Agent 状态 | 像素角色行为 | 动画 |
|---------------------|-------------|------|
| idle | 坐椅子喝咖啡/发呆/摸猫 | idle_sit, idle_coffee, idle_pet |
| thinking | 头上思考气泡 "..." | think_bubble |
| writing | 快速打字,屏幕闪烁 | typing_fast |
| executing | 走到服务器机柜操作 | walk_to_server, operate |
| browsing | 盯屏幕,偶尔点击 | browse_scroll |
| error | 头上❌,沮丧表情 | error_shake |
| heartbeat | 向窗外挥手 | wave |
| sleeping | 趴桌子睡觉💤 | sleep_zzz |

**同步协议**: 通过 SSE 或 WebSocket 连接 OpenClaw Gateway
```
GET /api/agent/{id}/status → { state: "writing", message: "处理邮件...", since: timestamp }
WS  /ws/agent/{id}/events → { type: "state_change", state: "thinking", data: {...} }
```

### 3. 场景系统 (Scene System)

每个场景 = Phaser Scene 子类:
- 背景层 (tilemap)
- 家具/物品层 (interactive objects)
- 角色层 (character sprite)
- 气泡/UI层 (dialogue bubbles, status icons)
- 粒子层 (ambient effects: rain, snow, stars, code rain)

## MVP 范围 (Phase 1)

1. ✅ Phaser 3 引擎初始化 + 基础渲染管线
2. ✅ 3 个场景: 办公室、黑客地下室、咖啡馆
3. ✅ 基础角色: 3种体型 × 5种发型 × 5种服装 × 3种配饰
4. ✅ 8种状态动画 (idle/thinking/typing/executing/browsing/error/wave/sleep)
5. ✅ 对话气泡系统 (打字机效果)
6. ✅ 模拟状态切换 (Demo模式，无需真实OpenClaw连接)
7. ✅ 捏脸 UI (HTML overlay)
8. ✅ 主页: 产品展示 + Demo

---
*Created: 2026-02-28*

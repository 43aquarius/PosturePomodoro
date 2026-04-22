# 姿态番茄钟 (PosturePomodoro)

> AI 姿态识别番茄钟 - 让专注更健康

***人工智能概论大作业😌***
一个结合了番茄工作法和AI姿态识别的智能时间管理工具。通过摄像头实时监测您的坐姿和手势，帮助您在保持专注的同时维护良好的身体健康。

## ✨ 功能特性

### 🍅 番茄工作法
- 标准的25分钟工作 + 5分钟休息模式
- 可自定义工作和休息时长
- 自动开始休息功能
- 每4个番茄后自动长休息（15分钟）
- 完成番茄数统计和工作时长记录

### 🤖 AI姿态识别
- **实时坐姿评分**：基于MediaPipe的33个身体关键点进行姿态分析
- **坐姿评分系统**：0-100分实时评分，帮助您了解当前坐姿质量
- **疲劳检测**：自动识别身体疲劳状态，及时提醒休息
- **姿态问题诊断**：识别驼背、头部前倾、肩膀不平衡等常见问题

### 👋 手势控制
支持8种手势控制番茄钟，让操作更加便捷：

| 手势 | 功能 | 说明 |
|------|------|------|
| ✊ 握拳 | 开始 | 开始新的番茄钟 |
| ✋ 开掌 | 暂停 | 暂停当前计时 |
| 👍 大拇指 | 完成 | 完成当前番茄 |
| 👎 大拇指向下 | 放弃 | 重置当前会话 |
| ✌️ 剪刀手 | 跳过休息 | 跳过休息时间 |
| 👆 单食指 | 专注模式 | 进入专注模式 |
| 🙋 举手 | 强制休息 | 强制开始休息 |
| 🤙 打Call | 鼓励 | 获得鼓励信息 |

### 📊 数据统计与报告
- **今日统计**：完成的番茄数、工作时长、坐姿均分
- **本周趋势**：最近7天的番茄完成情况
- **姿态分析**：最佳坐姿时间、需要改进时间
- **历史记录**：所有番茄和姿态日志的本地存储

### 🏥 健康提醒
- **休息提醒**：定时提醒用户休息
- **坐姿提醒**：当坐姿评分过低时提醒调整
- **疲劳提醒**：检测到疲劳状态时建议休息
- **休息验证**：确保休息时间得到充分利用

### 🎨 界面设计
- 现代化的UI设计，支持深色/浅色主题切换
- 响应式布局，适配不同屏幕尺寸
- 流畅的动画效果和交互体验
- PWA支持，可安装到桌面

## 🚀 快速开始

### 环境要求
- Node.js 14+
- 现代浏览器（Chrome、Edge、Firefox等）
- 摄像头设备

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/43aquarius/PosturePomodoro.git
cd PosturePomodoro/pomodoro
```

2. **安装依赖**
```bash
npm install
```

3. **启动服务器**
```bash
node server.js
```

4. **访问应用**
打开浏览器访问 `http://localhost:3721`

### 使用说明

1. **开启摄像头**：点击页面上的"开启摄像头"按钮，允许浏览器访问摄像头
2. **开始番茄钟**：使用手势（握拳）或点击开始按钮
3. **调整坐姿**：根据实时评分调整您的坐姿
4. **查看报告**：点击报告按钮查看详细的统计数据

## 🏗️ 项目结构

```
pomodoro/
├── src/
│   ├── core/                    # 核心逻辑
│   │   ├── EventBus.js          # 事件总线
│   │   ├── PomodoroTimer.js     # 番茄钟核心
│   │   └── StateMachine.js      # 状态机
│   ├── detection/               # 检测模块
│   │   ├── GestureRecognizer.js # 手势识别
│   │   ├── PostureAnalyzer.js   # 姿态分析
│   │   └── PresenceChecker.js  # 存在检测
│   ├── health/                  # 健康管理
│   │   ├── RemindScheduler.js   # 提醒调度
│   │   └── RestValidator.js    # 休息验证
│   ├── storage/                 # 数据存储
│   │   ├── Database.js          # IndexedDB封装
│   │   └── StatsPersister.js   # 统计持久化
│   ├── ui/                      # 用户界面
│   │   ├── PosturePanel.js     # 姿态面板
│   │   ├── RestGuide.js        # 休息指导
│   │   ├── SkeletonCanvas.js    # 骨架画布
│   │   ├── TimerDisplay.js     # 计时器显示
│   │   └── ToastNotifier.js    # 消息通知
│   ├── utils/                   # 工具函数
│   │   ├── AudioPlayer.js       # 音频播放
│   │   ├── Geometry.js         # 几何计算
│   │   └── Throttle.js        # 节流函数
│   └── app.js                  # 应用入口
├── other/                      # 其他应用
│   ├── AirPaddleBreak.html     # 空气划船休息游戏
│   └── GestureRhythmMaster.html # 手势节奏大师
├── index.html                  # 主页面
├── manifest.json               # PWA配置
├── server.js                  # 开发服务器
└── sw.js                     # Service Worker
```

## 🔧 技术栈

- **前端框架**：原生JavaScript (ES6+)
- **AI/ML**：MediaPipe Pose (人体姿态检测)
- **数据存储**：IndexedDB
- **状态管理**：自定义事件总线 + 状态机
- **UI渲染**：原生DOM操作 + Canvas
- **PWA**：Service Worker + Web App Manifest
- **开发服务器**：Node.js HTTP Server

## 🎯 核心功能实现

### 姿态检测算法
基于MediaPipe的33个身体关键点，计算以下指标：
- 头部角度：检测头部前倾
- 肩膀角度：检测肩膀不平衡
- 脊柱角度：检测驼背
- 身体倾斜：检测侧身坐姿

### 手势识别算法
通过分析手部21个关键点的相对位置，识别以下手势：
- 手指伸展状态
- 大拇指方向
- 手指组合模式
- 手腕位置

### 状态机设计
```
IDLE → WORK → REST → IDLE
  ↓       ↓       ↓
PAUSE   PAUSE   PAUSE
```

## 📱 PWA支持

本项目支持PWA（Progressive Web App），可以安装到桌面：
- 离线工作能力
- 桌面图标
- 全屏体验
- 自动更新

## 🔒 隐私说明

- 所有数据存储在本地浏览器中
- 不会上传任何摄像头数据到服务器
- 姿态和手势识别完全在本地进行
- 统计数据仅保存在您的设备上

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

## 🙏 致谢

- [MediaPipe](https://google.github.io/mediapipe/) - 提供强大的人体姿态检测能力
- [番茄工作法](https://en.wikipedia.org/wiki/Pomodoro_Technique) - 高效的时间管理方法

## 📮 联系方式

- GitHub: [43aquarius/PosturePomodoro](https://github.com/43aquarius/PosturePomodoro)
- 问题反馈: [GitHub Issues](https://github.com/43aquarius/PosturePomodoro/issues)

---

**让专注更健康，从姿态番茄钟开始！** 🍅✨
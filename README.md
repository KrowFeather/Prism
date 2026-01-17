# Prism - 智能选课系统

一个基于 Electron + Vue 3 + Python Flask 的桌面选课应用，支持自动登录、课程搜索、选课退课、轮询抢课等功能。

## ✨ 功能特性

### 🔐 账户管理
- 自动登录（OCR 验证码识别）
- 账户保存，快速登录
- 多账户管理

### 📚 课程管理
- 动态课程类型 Tab（根据批次自动显示）
- 课程搜索（支持课程名称、教师、课程编号等）
- 课程列表展示（容量、已选、状态等）
- 实时课程状态更新

### 🎯 选课功能
- 一键选课
- 课程退选
- 抢课列表管理
- **后端轮询抢课**（持续尝试选课，直到成功）

### 📊 实时监控
- 终端式日志面板
- 实时显示抢课进度
- 每次轮询结果展示
- 任务状态监控

### ⚙️ 系统设置
- API 地址配置
- 连接状态监控
- 自动重连机制

## 🛠️ 技术栈

### 前端
- **Electron** - 桌面应用框架
- **Vue 3** - 前端框架
- **TypeScript** - 类型安全
- **Element Plus** - UI 组件库
- **Vue Router** - 路由管理
- **Axios** - HTTP 客户端

### 后端
- **Python 3** - 后端语言
- **Flask** - Web 框架
- **ddddocr** - OCR 验证码识别
- **requests** - HTTP 请求库

## 📦 项目结构

```
Prism/
├── electron/              # Electron 主进程
│   ├── main.js           # 主进程入口
│   └── preload.js        # 预加载脚本
├── src/                   # 前端源码
│   ├── views/            # 页面组件
│   │   ├── Login.vue     # 登录页面
│   │   ├── SelectClass.vue # 选课页面
│   │   ├── Browse.vue    # 抢课列表页面
│   │   └── Settings.vue  # 设置页面
│   ├── composables/      # 组合式函数
│   │   ├── useAccounts.ts
│   │   ├── useConnectionStatus.ts
│   │   └── useCourseQueue.ts
│   ├── router/           # 路由配置
│   └── App.vue           # 根组件
├── Hexagon-spyder/       # Python 后端
│   ├── main.py           # Flask 应用
│   ├── service.py        # 业务逻辑
│   └── const.py          # 常量配置
└── package.json          # 前端依赖配置
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 16.0.0
- **Python** >= 3.8
- **Conda** (用于管理 Python 环境，需要 "Deeplearning" 环境)

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd Prism
```

#### 2. 安装前端依赖

```bash
# 使用 pnpm (推荐) 或 npm
pnpm install
# 或
npm install
```

#### 3. 安装后端依赖

```bash
cd ../Hexagon-spyder

# 激活 Conda 环境
conda activate Deeplearning

# 安装 Python 依赖
pip install flask flask-cors requests ddddocr yagmail
```

#### 4. 启动后端服务

```bash
# 在 Hexagon-spyder 目录下
python main.py
```

后端服务默认运行在 `http://localhost:5000`

#### 5. 启动前端应用

```bash
# 在项目根目录
pnpm dev
# 或
npm run dev
```

#### 6. 启动 Electron 应用

```bash
# 新开一个终端
pnpm start
# 或
npm start
```

## 📖 使用说明

### 登录

1. 输入学号和密码
2. 系统自动识别验证码并登录
3. 选择选课批次（必选）
4. 登录成功后自动保存账户信息

### 选课

1. 在"开始选课"页面选择课程类型 Tab
2. 使用搜索框搜索课程
3. 点击"选课"按钮进行选课
4. 已选课程可以点击"退课"按钮退选

### 抢课

1. 在课程列表中找到已满的课程
2. 点击"加入抢课列表"按钮
3. 在"抢课列表"页面点击"启动抢课"
4. 系统会在后端持续轮询尝试选课
5. 右侧终端面板实时显示抢课进度

### 设置

- 在设置页面可以配置后端 API 地址
- 查看连接状态
- 管理保存的账户

## 🔧 配置说明

### 后端配置

后端服务默认运行在 `http://localhost:5000`，可在 `main.py` 中修改：

```python
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### 前端配置

前端 API 地址可在设置页面配置，或通过 `localStorage` 设置：

```javascript
localStorage.setItem('apiUrl', 'http://localhost:5000')
```

### Conda 环境

确保使用 "Deeplearning" Conda 环境，系统会自动查找该环境中的 Python 解释器。

## 📡 API 接口

### 认证相关
- `POST /login` - 用户登录
- `POST /get-batches` - 获取选课批次列表
- `GET /get-sys-params` - 获取系统参数（课程类型名称）

### 课程相关
- `POST /get-courses` - 获取课程列表
- `POST /select-class` - 选课
- `POST /drop-class` - 退课

### 抢课相关
- `POST /start-grab-course` - 启动轮询抢课
- `POST /stop-grab-course` - 停止抢课任务
- `GET /grab-course-status` - 获取抢课任务状态

## 🎨 界面预览

- **登录页面**：账户卡片快速登录，批次选择
- **选课页面**：课程类型 Tab，搜索功能，课程列表
- **抢课列表**：任务管理，实时日志监控
- **设置页面**：系统配置，连接状态

## ⚠️ 注意事项

1. **验证码识别**：使用 OCR 自动识别，准确率较高但可能偶尔失败
2. **轮询抢课**：后端每 2 秒尝试一次选课，请合理使用
3. **会话管理**：登录后会话信息保存在后端，Token 过期会自动重新登录
4. **账户安全**：账户信息保存在本地 `localStorage`，请妥善保管

## 🐛 问题排查

### 后端无法启动
- 检查 Python 环境是否正确
- 确认所有依赖已安装
- 检查端口 5000 是否被占用

### 前端无法连接后端
- 确认后端服务已启动
- 检查 API 地址配置是否正确
- 查看浏览器控制台错误信息

### 登录失败
- 检查学号和密码是否正确
- 确认网络连接正常
- 查看后端日志了解详细错误

## 📝 开发计划

- [ ] 支持多批次同时抢课
- [ ] 添加课程筛选功能
- [ ] 优化抢课策略
- [ ] 添加邮件通知功能
- [ ] 支持课程表导出

## 📄 许可证

MIT License

## 👤 作者

KrowFeather

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**⚠️ 免责声明**：本工具仅供学习交流使用，请遵守学校相关规定，合理使用选课系统。

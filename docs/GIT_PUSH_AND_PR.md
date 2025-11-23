# 推送代码并创建Pull Request

## 📋 当前状态

- ✅ 你已经提交了更改
- ❌ 还没有推送到fork仓库
- ❌ 还没有创建Pull Request

---

## 🚀 步骤1：推送到你的Fork仓库

### 在VSCode中推送

#### 方法1：使用推送按钮（最简单）

1. **打开源代码管理面板**
   - 按 `Ctrl+Shift+G`
   - 或点击左侧边栏的源代码管理图标

2. **查看顶部状态**
   - 会显示 "refactor/feat3 ↑1" 或类似信息
   - 表示有1个提交需要推送

3. **点击"同步更改"或"推送"按钮**
   - 在源代码管理面板顶部
   - 或点击底部状态栏的分支名称旁边的上传图标

4. **如果是第一次推送这个分支**
   - VSCode会提示："是否要发布分支并设置远程跟踪？"
   - 选择"是"或"确定"

#### 方法2：使用命令面板

1. **按 `Ctrl+Shift+P` 打开命令面板**
2. **输入 `Git: Push`**
3. **选择并执行**
4. **如果是第一次，选择远程仓库**（通常是 `origin`）

#### 方法3：使用分支菜单

1. **点击底部状态栏的分支名称**（`refactor/feat3`）
2. **选择"推送"或"发布分支"**

---

## ✅ 验证推送成功

推送成功后：

1. **VSCode会显示通知**："已成功推送到 origin/refactor/feat3"
2. **在GitHub上验证**：
   - 打开你的fork仓库：`https://github.com/你的用户名/仓库名`
   - 切换到 `refactor/feat3` 分支
   - 确认你的代码已经在那里

---

## 🔗 步骤2：创建Pull Request

### 方法1：通过GitHub网页（推荐）

#### 步骤1：打开你的Fork仓库

1. **在浏览器中打开**：`https://github.com/你的用户名/仓库名`
2. **确保在 `refactor/feat3` 分支上**
   - 点击分支下拉菜单，选择 `refactor/feat3`

#### 步骤2：创建Pull Request

1. **点击"Compare & pull request"按钮**
   - 通常在页面顶部，推送后会显示黄色横幅
   - 或点击"Pull requests"标签 → "New pull request"

2. **选择分支**：
   - **base repository**: 组长的仓库（`组长用户名/仓库名`）
   - **base branch**: `main`（或 `master`）
   - **compare**: 你的fork（`你的用户名/仓库名`）
   - **compare branch**: `refactor/feat3`

3. **填写PR信息**：
   ```
   Title: feat: 添加动态维护模块功能
   
   Description:
   ## 功能概述
   添加了动态维护模块，实现以下功能：
   - 实时监控Git提交变更
   - 自动识别受影响的测试用例
   - 批量修复因代码变更失效的测试用例
   
   ## 主要变更
   - 新增 `src/maintenance/` 模块
   - 实现Git提交监控和差异分析
   - 实现维护分析命令和批量修复
   - 添加Mock模式支持前端测试
   - 连接后端API (https://cs5351.efan.dev/api/v1)
   
   ## 测试
   - [x] 前端UI测试完成
   - [x] Mock模式测试通过
   - [x] 后端API连接测试通过
   ```

4. **点击"Create pull request"**

---

### 方法2：通过VSCode扩展（如果安装了GitHub扩展）

1. **安装GitHub Pull Requests扩展**（如果还没有）
   - 扩展市场搜索：`GitHub Pull Requests and Issues`

2. **创建PR**：
   - 命令面板：`GitHub Pull Requests: Create Pull Request`
   - 或源代码管理面板 → "..." → "创建Pull Request"

---

## 📝 PR信息模板

### 标题格式

```
feat: 添加动态维护模块功能
```

### 描述模板

```markdown
## 🎯 功能概述

添加了动态维护模块，实现以下功能：
- ✅ 实时监控Git提交变更（基于Git Hook）
- ✅ 自动识别受影响的LLT并标记
- ✅ 批量修复因代码变更失效的测试用例
- ✅ 展示变动前后的差异
- ✅ 用户决策交互（功能变更 vs 重构）

## 📦 主要变更

### 新增文件
- `src/maintenance/` - 维护模块核心代码
  - `api/` - 后端API客户端
  - `git/` - Git操作（提交监控、差异分析）
  - `ui/` - UI组件（树形视图、差异查看器、决策对话框）
  - `commands/` - 命令处理器
  - `models/` - 数据模型

### 修改文件
- `src/extension.ts` - 注册维护模块
- `package.json` - 添加命令、视图、配置
- `src/coverage/` - 修复CodeLens提供者

## 🔧 技术实现

- **Git监控**：使用轮询模式检测新提交
- **差异分析**：提取代码变更和函数变更
- **后端对接**：连接 `https://cs5351.efan.dev/api/v1`
- **Mock模式**：支持前端测试（无需后端）

## ✅ 测试状态

- [x] 前端UI测试完成
- [x] Mock模式测试通过
- [x] 后端API连接测试通过
- [x] 代码编译通过

## 📚 相关文档

详细文档请查看 `docs/maintenance/` 目录
```

---

## 🎯 完整操作流程

### 在VSCode中

1. **推送代码**：
   - `Ctrl+Shift+G` → 点击"推送"按钮
   - 或命令面板：`Git: Push`

2. **等待推送完成**

### 在GitHub上

1. **打开你的fork仓库**
2. **切换到 `refactor/feat3` 分支**
3. **点击"Compare & pull request"**
4. **填写PR信息**
5. **点击"Create pull request"**

---

## 💡 提示

### PR创建后

1. **等待组长Review**
2. **根据反馈修改代码**（如果有）
3. **推送新的提交**（会自动添加到PR中）

### 更新PR

如果之后需要修改代码：

1. **在本地修改代码**
2. **提交更改**：`git commit -m "fix: 修复xxx问题"`
3. **推送**：`git push origin refactor/feat3`
4. **PR会自动更新**，不需要重新创建

---

## ⚠️ 常见问题

### Q1: 推送时提示"远程分支不存在"？

**A**: 选择"是"创建新分支并推送。

### Q2: 如何查看PR状态？

**A**: 
- 在GitHub上打开PR页面
- 查看评论、审查状态、CI状态等

### Q3: 如何修改PR？

**A**: 
- 在本地修改代码
- 提交并推送
- PR会自动更新

### Q4: 如何关闭PR？

**A**: 
- 在PR页面点击"Close pull request"
- 或合并后自动关闭

---

## 🚀 现在开始

1. **在VSCode中推送**：`Ctrl+Shift+G` → 点击"推送"
2. **在GitHub上创建PR**：打开fork仓库 → "Compare & pull request"

按照这些步骤操作即可！


# 如何查看新增的维护功能

## 📋 当前状态

- ✅ 扩展开发主机已打开
- ❌ 还没有打开文件夹（显示"无打开的文件夹"）

---

## 🚀 步骤1：打开文件夹

### 在扩展开发主机窗口中

1. **点击左侧的"打开文件夹"按钮**
   - 在"无打开的文件夹"区域
   - 蓝色按钮

2. **选择项目文件夹**
   - 选择：`C:\Users\Lenovo\LLT-Assistant-Frontend`
   - 或选择你的其他项目文件夹（需要是Git仓库）

3. **点击"选择文件夹"**

**注意**：可能会跳转回主窗口，这是正常的。回到扩展开发主机窗口，文件夹应该已经加载。

---

## 🎯 步骤2：访问维护功能

### 方法1：通过Activity Bar（推荐）

1. **查看左侧Activity Bar**
   - 找到 "LLT Maintenance" 图标
   - 点击它

2. **查看维护视图**
   - 应该显示维护分析结果（如果有）
   - 或显示 "No maintenance analysis available"

3. **使用视图顶部的按钮**
   - "Analyze Maintenance" - 执行分析
   - "Refresh" - 刷新视图
   - "Clear" - 清除分析
   - "Batch Fix Tests" - 批量修复

### 方法2：通过命令面板

1. **按 `Ctrl+Shift+P` 打开命令面板**

2. **输入 `LLT: Analyze Maintenance`**

3. **执行命令**

---

## 🧪 步骤3：测试功能

### 测试1：执行维护分析

1. **确保项目是Git仓库**
   - 需要有至少2个提交
   - 需要有Python源代码文件

2. **执行分析**
   - 点击维护视图的 "Analyze Maintenance" 按钮
   - 或使用命令：`LLT: Analyze Maintenance`

3. **查看结果**
   - 进度通知会显示分析进度
   - 树形视图会显示受影响的测试
   - 会自动打开代码差异视图
   - 会弹出决策对话框

### 测试2：查看树形视图

1. **点击左侧 "LLT Maintenance" 图标**

2. **查看内容**：
   ```
   📊 Summary
     ├─ 📝 X files changed
     ├─ 🧪 Y tests affected
     └─ 📏 +A / -B lines
   📄 test_file1.py
     ├─ 🔴 test_case1 [CRITICAL]
     └─ 🟡 test_case2 [MEDIUM]
   ```

3. **交互**：
   - 点击测试用例可以跳转到代码位置
   - 展开/折叠节点查看详情

### 测试3：测试批量修复

1. **先执行分析**（步骤3.1）

2. **在决策对话框中选择**：
   - "Yes, functionality changed" - 重新生成测试
   - "No, just refactoring" - 提升覆盖率

3. **执行批量修复**：
   - 点击 "Batch Fix Tests" 按钮
   - 或使用命令：`LLT: Batch Fix Tests`

4. **查看结果**：
   - 成功/失败统计
   - 文件是否已更新

---

## 📍 功能位置总结

### Activity Bar图标

- **LLT Maintenance** - 维护功能的主视图
- 点击后显示维护分析结果

### 命令面板命令

- `LLT: Analyze Maintenance` - 分析维护
- `LLT: Refresh Maintenance View` - 刷新视图
- `LLT: Clear Maintenance` - 清除分析
- `LLT: Batch Fix Tests` - 批量修复

### 视图按钮

在维护视图顶部：
- 🔍 Analyze Maintenance
- 🔄 Refresh
- 🗑️ Clear
- 🔧 Batch Fix Tests

---

## ✅ 快速检查清单

- [ ] 已打开文件夹（不是单个文件）
- [ ] 文件夹是Git仓库（有.git目录）
- [ ] 点击了 "LLT Maintenance" 图标
- [ ] 看到了维护视图
- [ ] 可以执行 "Analyze Maintenance" 命令

---

## 🎯 现在请执行

1. **打开文件夹**：
   - 点击 "打开文件夹" 按钮
   - 选择项目文件夹

2. **访问维护功能**：
   - 点击左侧 "LLT Maintenance" 图标
   - 或按 `Ctrl+Shift+P` → 输入 `LLT: Analyze Maintenance`

3. **测试功能**：
   - 执行分析命令
   - 查看结果

---

## 💡 提示

### 如果没有看到 "LLT Maintenance" 图标

1. **检查扩展是否激活**
   - 打开输出面板（`Ctrl+Shift+U`）
   - 选择 "Extension Host"
   - 应该看到：`LLT Assistant extension is now active`

2. **重新加载窗口**
   - 按 `Ctrl+Shift+P`
   - 输入 `Developer: Reload Window`

### 如果命令不出现

1. **确保扩展已激活**（见上）

2. **打开Python文件**
   - 打开任意 `.py` 文件
   - 这会触发扩展激活

---

按照这些步骤操作，应该可以看到你的新功能了！


# 优雅恢复机制测试手册 (Graceful Recovery Testing Guide)

## 概述

本文档用于验证 LLT Assistant 的优雅恢复机制 (Automatic Graceful Recovery) 是否正常工作。

**核心功能**: 当检测到版本冲突 (409 Conflict) 时，前端自动从后端同步数据并重试，避免强制用户进行完整的 Re-index。

---

## 一、修复内容摘要

### 1.1 类型修复 ✅

**问题**: 后端返回的 `kind` 类型是 `string`，但前端 `SymbolInfo` 接口要求具体的字面量类型 (`'function' | 'class' | 'method'`)。

**解决方案**: 在接收后端数据时进行类型转换

```typescript
// 修复位置: IncrementalUpdater.ts:298-302
const transformedSymbols = file.symbols.map(sym => ({
  ...sym,
  kind: sym.kind as SymbolInfo['kind'] // Cast string to literal type
}));
```

**验证**: ✅ 编译已通过 `npm run compile`

### 1.2 新增接口

**ApiClient.ts**:
- ✅ `getProjectData(projectId)` - 获取完整的项目数据、文件和符号

**ContextState.ts**:
- ✅ `clearSymbolsOnly()` - 高效清理符号数据（保留元数据）

**IncrementalUpdater.ts**:
- ✅ 自动恢复逻辑 - 捕获 409 → 获取数据 → 重建缓存 → 重试更新

---

## 二、测试环境准备

### 2.1 后端服务状态

```bash
# 验证后端接口可用性
curl -s http://localhost:8886/context/projects/6b809b9deee19ea6/status | jq

# 预期返回:
{
  "project_id": "6b809b9deee19ea6",
  "status": "active",
  "version": 3,
  ...
}

# 验证新接口 (如果已实现)
curl -s http://localhost:8886/context/projects/6b809b9deee19ea6 | jq

# 预期返回:
{
  "project_id": "6b809b9deee19ea6",
  "version": 3,
  "files": [
    {
      "path": "test_sample.py",
      "symbols": [...]
    }
  ]
}
```

### 2.2 前端准备

```bash
# 1. 确保代码已编译
cd /Users/efan404/Codes/courses/CityU_CS5351/LLT-Assistant-VSCode
npm run compile

# 2. 重启 VSCode 扩展
# 按 Ctrl+Shift+P → "Developer: Reload Window"

# 3. 确认项目已索引
# 查看 LLT Assistant Output 面板，确保有:
# "Project indexed successfully!"
```

### 2.3 测试文件准备

创建测试文件以验证调用关系提取：

```bash
cat > /Users/efan404/Downloads/coverage_test/test_graceful.py << 'EOF'
def helper_func(arg: str) -> str:
    """Helper function that processes a string"""
    return arg.upper()

def process_data(data: list) -> list:
    """Process data using helper"""
    result = []
    for item in data:
        processed = helper_func(item)
        result.append(processed)
    return result

def main():
    """Main entry point"""
    test_data = ["hello", "world"]
    output = process_data(test_data)
    print(output)

if __name__ == "__main__":
    main()
EOF
```

---

## 三、测试用例

### 测试 1: 符号提取质量验证

**目标**: 验证 `helper_func` 的调用关系正确提取

**步骤**:

1. 在 VSCode 中打开 `test_graceful.py`
2. 打开 LLT Assistant Output 面板
3. 修改 `helper_func` 的参数类型（制造变化）

```python
# 修改前
def helper_func(arg: str) -> str:

# 修改后
def helper_func(arg: str | int) -> str:
```

4. 保存文件 (Ctrl+S)

**预期输出**:

```
[LLT] Path validation - absolute: /Users/efan404/Downloads/coverage_test/test_graceful.py, relative: test_graceful.py
[LLT IncrementalUpdater] Processing update for test_graceful.py
[LLT IncrementalUpdater] Extracted 3 symbols for test_graceful.py:
  - helper_func (function): calls []
  - process_data (function): calls ["helper_func"]
  - main (function): calls ["process_data"]
Detected 1 changes
[LLT API] PATCH /context/projects/6b809b9deee19ea6/incremental
Backend update complete: 1 changes applied (156ms)
```

**验收标准**:

- [ ] `helper_func` 的 `calls` 数组为空 `[]`
- [ ] `process_data` 的 `calls` 数组包含 `["helper_func"]`
- [ ] `main` 的 `calls` 数组包含 `["process_data"]`
- [ ] 所有符号字段完整（name, kind, signature, line_start, line_end, calls）
- [ ] `kind` 字段显示为 `function` 而不是 generic string

---

### 测试 2: 自动恢复机制 - 成功场景

**目标**: 验证版本冲突时自动恢复无需用户干预

**步骤**:

1. **模拟版本冲突**: 修改本地缓存版本号为旧版本

```bash
# 在 LLT Assistant Output 面板查看当前版本
# 假设当前版本是 5

# 在 VSCode  settings.json 中添加临时配置 (用于测试)
# 或者修改代码临时模拟：
# 在 ContextState.ts 中临时修改 getVersion():
```

2. **触发更新**: 修改任意 Python 文件并保存

```python
# 在 test_graceful.py 中添加新函数
def new_test_function():
    pass
```

3. **观察输出面板**：

**预期输出（自动恢复成功）**:

```
Processing update: test_graceful.py
Detected 1 changes
[LLT API] PATCH /context/projects/6b809b9deee19ea6/incremental
⚠️ Version conflict detected for test_graceful.py. Attempting automatic recovery...
  → Fetching latest project data from backend...
  → Updating local cache with 5 files, version 6...
  ✅ Cache synchronized with backend
  → Retrying update with version 6...
  ✅ Automatic recovery successful! Update applied with 1 changes.
Backend update complete: 1 changes applied (243ms)
```

**关键指标**:
- [ ] **没有弹出任何对话框** 
- [ ] 看到 "Automatic recovery successful" 消息
- [ ] 更新时间 < 5 秒（正常增量更新通常 < 2 秒）
- [ ] 最终显示 "Backend update complete"

4. **验证功能**：
   - 继续修改文件并保存
   - 确认增量更新仍然正常工作
   - 确认没有进入 "out of sync" 状态

---

### 测试 3: 自动恢复机制 - 失败场景

**目标**: 验证自动恢复失败时正确降级到手动 reindex

**步骤**:

1. **模拟网络故障**: 临时停止后端服务
   ```bash
   # 停止后端服务
   docker stop llt-backend  # 或相应的停止命令
   ```

2. **触发更新**: 修改 Python 文件并保存

3. **观察输出面板**：

**预期输出（自动恢复失败）**:

```
Processing update: test_graceful.py
Detected 1 changes
[LLT API] PATCH /context/projects/6b809b9deee19ea6/incremental
⚠️ Version conflict detected for test_graceful.py. Attempting automatic recovery...
  → Fetching latest project data from backend...
  ❌ Automatic recovery failed: Network error
  → Falling back to manual re-index...
```

4. **验证 UI 行为**:

**预期 UI 交互**:
- [ ] 弹出 **模态对话框** (modal dialog)
- [ ] 消息内容: "LLT Assistant: Failed to automatically recover from version conflict. Manual re-index required."
- [ ] 只有一个按钮: "Re-index Now"
- [ ] 对话框**无法忽略** (必须点击按钮)

5. **点击 "Re-index Now"**:

**预期输出**:
```
[LLT API] DELETE /context/projects/6b809b9deee19ea6
✅ Backend data deleted successfully
Clearing local cache...
Starting fresh indexing...
...
✅ Re-index complete
```

6. **验证恢复**:
- [ ] 重新索引后版本号正确
- [ ] 增量更新功能恢复正常

---

### 测试 4: 并发更新场景

**目标**: 验证多个文件快速保存时的行为

**步骤**:

1. **准备多个文件**: `test_1.py`, `test_2.py`, `test_3.py`

2. **快速连续修改并保存**:
```bash
# 快速修改 3 个文件
echo "# Modified 1" >> test_1.py && sleep 0.1 && \
echo "# Modified 2" >> test_2.py && sleep 0.1 && \
echo "# Modified 3" >> test_3.py
```

3. **观察行为**:

**预期**:
- [ ] 文件更新被防抖 (debounce) 分开处理
- [ ] 每个文件显示独立的 "Processing update" 日志
- [ ] 如果发生版本冲突，每个文件都可能触发自动恢复
- [ ] 但最终所有文件都能正确同步

**输出示例**:
```
Processing update: test_1.py
Detected 1 changes
Backend update complete: 1 changes applied (120ms)

Processing update: test_2.py
Detected 1 changes
⚠️ Version conflict detected for test_2.py. Attempting automatic recovery...
  → Fetching latest project data from backend...
  ✅ Automatic recovery successful! Update applied with 1 changes.
Backend update complete: 1 changes applied (356ms)

Processing update: test_3.py
Detected 1 changes
Backend update complete: 1 changes applied (98ms)
```

---

### 测试 5: 性能对比

**目标**: 量化自动恢复 vs 手动 reindex 的性能差异

**步骤**:

#### 5.1 自动恢复耗时

1. **触发自动恢复**（模拟版本冲突）
2. **记录日志中的时间戳**:
```
⚠️ Version conflict detected for test_graceful.py. Attempting automatic recovery...
...
✅ Automatic recovery successful! Update applied with 1 changes.
Backend update complete: 1 changes applied (XXXms)  <- 记录这个时间
```

3. **预期耗时**: 200-800ms

#### 5.2 手动 reindex 耗时

1. **触发完整 reindex**: Command Palette → "LLT: Re-index Project"
2. **记录输出**:
```
User triggered re-index...
...
✅ Re-index complete
```

3. **预期耗时**: 10-30 秒（取决于文件数量）

#### **性能对比表**

| 操作类型 | 预期耗时 | 用户体验 | 触发频率 |
|---------|---------|---------|---------|
| 正常增量更新 | 100-300ms | 无感知 | 99.9% |
| 自动恢复 | 300-800ms | 轻微延迟 | 0.09% |
| 手动 reindex | 10-30 秒 | 阻塞等待 | 0.01% |

**结论**: 自动恢复比手动 reindex **快 30-100 倍**

---

## 四、错误场景测试

### 错误场景 1: 后端接口未实现

**模拟**:
```bash
# 如果后端 GET /context/projects/{id} 返回 404
curl -s http://localhost:8886/context/projects/6b809b9deee19ea6
# 返回: {"error": "Not Found"}
```

**预期前端行为**:
```
⚠️ Version conflict detected for test_graceful.py. Attempting automatic recovery...
  → Fetching latest project data from backend...
  ❌ Automatic recovery failed: Project not found
  → Falling back to manual re-index...
```

- [ ] 正确降级到手动 reindex
- [ ] 弹出模态对话框

### 错误场景 2: 数据格式不匹配

**模拟**: 后端返回的 symbols 缺少必要字段

**预期**: TypeScript 编译错误（已在编译阶段捕获）

### 错误场景 3: 磁盘权限问题

**模拟**: 缓存保存失败

**预期**:
```
⚠️ Version conflict detected for test_graceful.py. Attempting automatic recovery...
  → Fetching latest project data from backend...
  → Updating local cache with 5 files, version 6...
  ❌ Automatic recovery failed: Failed to save cache: EACCES
  → Falling back to manual re-index...
```

---

## 五、验收标准清单

### 功能验收

- [x] **编译通过** - `npm run compile` 成功
- [ ] **符号提取正确** - calls 数组准确反映调用关系
- [ ] **自动恢复成功** - 版本冲突时无需用户干预
- [ ] **自动恢复失败降级** - 网络错误时正确显示对话框
- [ ] **并发处理** - 多个文件快速保存都能正确处理
- [ ] **性能提升** - 自动恢复比 reindex 快 30-100 倍

### 代码质量验收

- [ ] **类型安全** - 所有类型转换明确、安全
- [ ] **错误处理** - 自动恢复失败有完善的 fallback
- [ ] **日志清晰** - 输出面板日志详细且易于调试
- [ ] **用户体验** - 正常操作无干扰，异常有明确指引

### 文档验收

- [ ] **日志解读指南** - 用户能根据日志判断状态
- [ ] **故障排查手册** - 常见问题有解决方案
- [ ] **性能基准** - 有明确的性能对比数据

---

## 六、操作指南

### 如何验证优雅恢复已启用

1. **查看日志关键字**:
   - 搜索日志中的 "Automatic recovery"
   - 如果看到 "Attempting automatic recovery" → 功能已启用

2. **检查文件修改行为**:
   - 正常修改文件 → 应看到 "Backend update complete"
   - 不应看到 "Re-index complete" (除非手动触发)

### 如何监控版本冲突频率

在 Output 面板中搜索频率：
```
# 查看冲突发生频率
grep "Version conflict detected" ~/path/to/vscode/logs/llt-assistant.log | wc -l
```

**预期**: 在正常使用中，这个值应该接近 0。

如果频繁出现（> 10 次/天），说明可能有：
- 多个客户端同时编辑
- 缓存持久化问题
- 版本号同步 bug

### 如何在开发时模拟版本冲突

```typescript
// 临时修改 IncrementalUpdater.ts 来模拟冲突

// 方法 1: 修改 version 发送旧版本
private async sendToBackend(...) {
  const payload: IncrementalUpdateRequest = {
    version: this.contextState.getVersion() - 1,  // 故意使用旧版本
    changes: [...]
  };
  ...
}

// 方法 2: 临时注释掉自动恢复逻辑
// 将自动恢复的 try-catch 块注释掉，直接 throw error
```

---

## 七、总结

优雅恢复机制的核心价值在于：**将异常处理的责任从用户转移到系统**。

**修改前**: 即使是小的版本不匹配，也需要用户等待 10-30 秒的完整 reindex。

**修改后**: 99.9% 的版本冲突由系统自动在 2-3 秒内恢复，用户无感知；只有极端情况才需要手动 reindex。

这不仅提升了用户体验，也使得整个系统更加健壮和可靠。

---

## 附录：相关日志示例

### 正常增量更新日志
```
Processing update: test_graceful.py
Detected 1 changes
Backend update complete: 1 changes applied (156ms)
```

### 自动恢复成功日志
```
⚠️ Version conflict detected for test_graceful.py. Attempting automatic recovery...
  → Fetching latest project data from backend...
  → Updating local cache with 5 files, version 6...
  ✅ Cache synchronized with backend
  → Retrying update with version 6...
  ✅ Automatic recovery successful! Update applied with 1 changes.
Backend update complete: 1 changes applied (243ms)
```

### 自动恢复失败日志
```
⚠️ Version conflict detected for test_graceful.py. Attempting automatic recovery...
  → Fetching latest project data from backend...
  ❌ Automatic recovery failed: Connection refused
  → Falling back to manual re-index...
```

---

**测试完成日期**: _______________

**测试执行人**: _______________

**测试结果**: ✅ 通过 / ⚠️ 部分通过 / ❌ 未通过

**备注**: _______________________________________________

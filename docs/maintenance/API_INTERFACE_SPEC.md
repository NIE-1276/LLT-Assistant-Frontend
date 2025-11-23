# 后端API接口规范

## 📋 概述

维护模块需要后端实现以下4个接口：

- **Base URL**: `https://cs5351.efan.dev/api/v1`
- **Content-Type**: `application/json`
- **Timeout**: 60秒（健康检查为10秒）

---

## 🔌 接口列表

### 1. 健康检查

**端点**: `GET /health`

**描述**: 检查后端服务是否可用

**请求**:
```
GET https://cs5351.efan.dev/api/v1/health
```

**响应** (200 OK):
```json
{
  "status": "ok"
}
```
或
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

**错误响应**:
- `404 Not Found`: 端点不存在（前端会继续执行，不阻止）
- `500 Internal Server Error`: 服务器错误

---

### 2. 分析维护

**端点**: `POST /maintenance/analyze`

**描述**: 分析代码变更，识别受影响的测试用例

**请求**:
```
POST https://cs5351.efan.dev/api/v1/maintenance/analyze
Content-Type: application/json
```

**请求体**:
```json
{
  "commit_hash": "abc123def456...",
  "previous_commit_hash": "def456ghi789...",
  "changes": [
    {
      "file_path": "src/calculator.py",
      "old_content": "def add(a, b):\n    return a + b",
      "new_content": "def add(a, b):\n    if a < 0:\n        raise ValueError('a must be positive')\n    return a + b",
      "changed_functions": ["add"],
      "lines_added": 2,
      "lines_removed": 1
    },
    {
      "file_path": "src/utils.py",
      "old_content": "def multiply(x, y):\n    return x * y",
      "new_content": "def multiply(x, y):\n    return x * y\ndef divide(x, y):\n    return x / y",
      "changed_functions": ["multiply", "divide"],
      "lines_added": 2,
      "lines_removed": 0
    }
  ],
  "client_metadata": {
    "extension_version": "0.0.1",
    "vscode_version": "1.85.0",
    "platform": "win32",
    "workspace_hash": "C:\\User"
  }
}
```

**响应** (200 OK):
```json
{
  "context_id": "ctx-abc123def456",
  "affected_tests": [
    {
      "test_file": "tests/test_calculator.py",
      "test_name": "test_add",
      "impact_level": "high",
      "reason": "Function behavior changed: added validation",
      "requires_update": true,
      "line_number": 15,
      "source_file": "src/calculator.py",
      "source_function": "add"
    },
    {
      "test_file": "tests/test_calculator.py",
      "test_name": "test_add_negative",
      "impact_level": "critical",
      "reason": "New validation will cause test to fail",
      "requires_update": true,
      "line_number": 20,
      "source_file": "src/calculator.py",
      "source_function": "add"
    },
    {
      "test_file": "tests/test_utils.py",
      "test_name": "test_multiply",
      "impact_level": "low",
      "reason": "Function unchanged, but in same file",
      "requires_update": false,
      "line_number": 5,
      "source_file": "src/utils.py",
      "source_function": "multiply"
    }
  ],
  "change_summary": {
    "files_changed": 2,
    "functions_changed": ["add", "multiply", "divide"],
    "lines_added": 4,
    "lines_removed": 1,
    "change_type": "feature_addition"
  }
}
```

**字段说明**:

- `context_id`: 上下文ID，用于后续的批量修复操作
- `affected_tests`: 受影响的测试用例列表
  - `test_file`: 测试文件路径（相对于工作区根目录）
  - `test_name`: 测试函数名
  - `impact_level`: 影响级别 (`"critical"` | `"high"` | `"medium"` | `"low"`)
  - `reason`: 影响原因说明
  - `requires_update`: 是否需要更新
  - `line_number`: 测试用例所在行号（可选）
  - `source_file`: 源文件路径（可选，用于重新生成）
  - `source_function`: 源函数名（可选，用于重新生成）
- `change_summary`: 变更摘要
  - `change_type`: 变更类型 (`"feature_addition"` | `"refactor"` | `"bug_fix"` | `"breaking_change"`)

**错误响应**:
- `400 Bad Request`: 请求格式错误
- `500 Internal Server Error`: 服务器错误

---

### 3. 批量修复

**端点**: `POST /maintenance/batch-fix`

**描述**: 批量修复受影响的测试用例（重新生成或提升覆盖率）

**请求**:
```
POST https://cs5351.efan.dev/api/v1/maintenance/batch-fix
Content-Type: application/json
```

**请求体** (action: "regenerate"):
```json
{
  "action": "regenerate",
  "tests": [
    {
      "test_file": "tests/test_calculator.py",
      "test_name": "test_add",
      "test_class": "TestCalculator",
      "function_name": "add",
      "source_file": "src/calculator.py"
    },
    {
      "test_file": "tests/test_calculator.py",
      "test_name": "test_add_negative",
      "function_name": "add",
      "source_file": "src/calculator.py"
    }
  ],
  "user_description": "Added validation to ensure 'a' parameter is positive. If negative, raise ValueError.",
  "client_metadata": {
    "extension_version": "0.0.1",
    "vscode_version": "1.85.0",
    "platform": "win32",
    "workspace_hash": "C:\\User"
  }
}
```

**请求体** (action: "improve_coverage"):
```json
{
  "action": "improve_coverage",
  "tests": [
    {
      "test_file": "tests/test_utils.py",
      "test_name": "test_multiply",
      "function_name": "multiply",
      "source_file": "src/utils.py"
    }
  ],
  "client_metadata": {
    "extension_version": "0.0.1",
    "vscode_version": "1.85.0",
    "platform": "win32",
    "workspace_hash": "C:\\User"
  }
}
```

**响应** (200 OK):
```json
{
  "success": true,
  "processed_count": 2,
  "results": [
    {
      "test_file": "tests/test_calculator.py",
      "test_name": "test_add",
      "success": true,
      "new_code": "def test_add():\n    \"\"\"Test add function with positive numbers.\"\"\"\n    from calculator import add\n    \n    assert add(2, 3) == 5\n    assert add(0, 0) == 0\n    assert add(10, -5) == 5\n    \n    # Test validation\n    with pytest.raises(ValueError):\n        add(-1, 2)"
    },
    {
      "test_file": "tests/test_calculator.py",
      "test_name": "test_add_negative",
      "success": true,
      "new_code": "def test_add_negative():\n    \"\"\"Test add function with negative first parameter.\"\"\"\n    from calculator import add\n    \n    with pytest.raises(ValueError, match='a must be positive'):\n        add(-1, 2)\n    \n    with pytest.raises(ValueError):\n        add(-10, 5)"
    }
  ]
}
```

**字段说明**:

- `action`: 操作类型
  - `"regenerate"`: 重新生成测试（需要 `user_description`）
  - `"improve_coverage"`: 提升覆盖率（不需要 `user_description`）
- `tests`: 要修复的测试列表
  - `test_file`: 测试文件路径
  - `test_name`: 测试函数名
  - `test_class`: 测试类名（可选，如果测试在类中）
  - `function_name`: 源函数名
  - `source_file`: 源文件路径
- `user_description`: 功能描述（仅当 `action` 为 `"regenerate"` 时必需）
- `results`: 修复结果列表
  - `success`: 是否成功
  - `new_code`: 新的测试代码（成功时）
  - `error`: 错误信息（失败时）

**错误响应**:
- `400 Bad Request`: 请求格式错误（如缺少必需字段）
- `500 Internal Server Error`: 服务器错误

---

### 4. 获取代码差异

**端点**: `POST /maintenance/code-diff`

**描述**: 获取代码差异的详细信息（可选，前端也可以本地计算）

**请求**:
```
POST https://cs5351.efan.dev/api/v1/maintenance/code-diff
Content-Type: application/json
```

**请求体**:
```json
{
  "file_path": "src/calculator.py",
  "old_content": "def add(a, b):\n    return a + b",
  "new_content": "def add(a, b):\n    if a < 0:\n        raise ValueError('a must be positive')\n    return a + b"
}
```

**响应** (200 OK):
```json
{
  "unified_diff": "--- a/src/calculator.py\n+++ b/src/calculator.py\n@@ -1,2 +1,4 @@\n def add(a, b):\n+    if a < 0:\n+        raise ValueError('a must be positive')\n     return a + b",
  "changed_functions": ["add"],
  "lines_added": 2,
  "lines_removed": 1
}
```

**字段说明**:

- `unified_diff`: 统一差异格式（unified diff）
- `changed_functions`: 变更的函数列表
- `lines_added`: 新增行数
- `lines_removed`: 删除行数

**错误响应**:
- `400 Bad Request`: 请求格式错误
- `500 Internal Server Error`: 服务器错误

---

## 📝 类型定义

### Impact Level (影响级别)

```typescript
type MaintenanceImpactLevel = 'critical' | 'high' | 'medium' | 'low';
```

### Change Type (变更类型)

```typescript
type ChangeType = 'feature_addition' | 'refactor' | 'bug_fix' | 'breaking_change';
```

### Action Type (操作类型)

```typescript
type BatchFixAction = 'regenerate' | 'improve_coverage';
```

---

## 🔍 前端调用位置

### 1. 健康检查
- **文件**: `src/maintenance/api/maintenanceClient.ts`
- **方法**: `checkHealth()`
- **调用**: `GET /health`

### 2. 分析维护
- **文件**: `src/maintenance/api/maintenanceClient.ts`
- **方法**: `analyzeMaintenance(request)`
- **调用**: `POST /maintenance/analyze`
- **触发**: `src/maintenance/commands/analyzeMaintenance.ts`

### 3. 批量修复
- **文件**: `src/maintenance/api/maintenanceClient.ts`
- **方法**: `batchFixTests(request)`
- **调用**: `POST /maintenance/batch-fix`
- **触发**: `src/maintenance/commands/batchFix.ts`

### 4. 获取代码差异
- **文件**: `src/maintenance/api/maintenanceClient.ts`
- **方法**: `getCodeDiff(request)`
- **调用**: `POST /maintenance/code-diff`
- **状态**: 可选，前端也可以本地计算

---

## ⚙️ 配置

### 后端URL配置

**位置**: `.vscode/settings.json` 或 VSCode设置

```json
{
  "llt-assistant.maintenance.backendUrl": "https://cs5351.efan.dev/api/v1",
  "llt-assistant.backendUrl": "https://cs5351.efan.dev"
}
```

**优先级**:
1. `llt-assistant.maintenance.backendUrl` (如果配置)
2. `llt-assistant.backendUrl` + `/api/v1` (如果配置)
3. 默认: `https://cs5351.efan.dev/api/v1`

---

## 🧪 测试接口

### 使用 curl 测试

```bash
# 1. 健康检查
curl https://cs5351.efan.dev/api/v1/health

# 2. 分析维护
curl -X POST https://cs5351.efan.dev/api/v1/maintenance/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "commit_hash": "abc123",
    "previous_commit_hash": "def456",
    "changes": [{
      "file_path": "src/test.py",
      "old_content": "def add(a, b): return a + b",
      "new_content": "def add(a, b): return a + b + 1",
      "changed_functions": ["add"],
      "lines_added": 1,
      "lines_removed": 0
    }]
  }'

# 3. 批量修复
curl -X POST https://cs5351.efan.dev/api/v1/maintenance/batch-fix \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate",
    "tests": [{
      "test_file": "tests/test.py",
      "test_name": "test_add",
      "function_name": "add",
      "source_file": "src/test.py"
    }],
    "user_description": "Function now adds 1 to the result"
  }'
```

---

## 📌 注意事项

1. **健康检查失败**: 如果 `/health` 返回 404，前端会显示警告但允许继续执行（因为后端可能没有实现此端点）

2. **必需字段**: 
   - `analyzeMaintenance`: `commit_hash`, `previous_commit_hash`, `changes`
   - `batchFixTests`: `action`, `tests`（`regenerate` 时还需要 `user_description`）

3. **超时设置**:
   - 健康检查: 10秒
   - 其他接口: 60秒

4. **错误处理**: 前端会捕获所有错误并显示用户友好的错误消息

5. **客户端元数据**: 所有请求都会自动包含 `client_metadata`（扩展版本、VSCode版本、平台等）

---

## 🔗 相关文档

- [快速开始](./QUICK_START.md)
- [模块解析](./MODULE_ANALYSIS.md)
- [后端集成完成](./BACKEND_INTEGRATION_COMPLETE.md)


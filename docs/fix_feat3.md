# Fix Specification: Feature 3 - Impact Analysis

## Context and Background

### Current Status
- **Frontend Component**: VSCode Extension (TypeScript)
- **Test Feature**: Impact Analysis (Feature 3)
- **Backend API**: LLT Assistant Backend Service
- **Current Issue**: 404 Not Found Error when calling API

### Problem Description
The frontend is currently configured to call a backend endpoint that does not exist:
- **Current (Wrong) Endpoint**: `POST /workflows/detect-code-changes`
- **Correct Endpoint**: `POST /analysis/impact` (as defined in OPENAPI.yaml)

The current implementation sends the wrong payload structure, causing the backend to reject requests with a 404 error.

---

## Required Fixes

### Fix A: Update API Endpoint URL
**File**: `src/impact/api/impactClient.ts`

Change the API endpoint from:
```typescript
const response = await this.axiosInstance.post<DetectCodeChangesResponse>(
    '/workflows/detect-code-changes',
    request
);
```

To:
```typescript
const response = await this.axiosInstance.post<DetectCodeChangesResponse>(
    '/analysis/impact',
    request
);
```

### Fix B: Update Request Payload Structure
**Target Interface** (Backend expects):
```typescript
interface ImpactAnalysisRequest {
  project_context: {
    files_changed: Array<{
      path: string;           // e.g., "src/utils.py"
      change_type: "modified" | "added" | "removed";
    }>;
    related_tests: Array<string>; // e.g., ["tests/test_utils.py"]
  };
  git_diff?: string;          // Optional: The raw git diff content
  project_id: string;         // Default: "default"
}
```

**Current Structure** (Needs to be transformed):
```typescript
interface DetectCodeChangesRequest {
  changes: {
    old_code: string;
    new_code: string;
    file_path: string;
  };
  previous_tests: string;
  client_metadata?: ClientMetadata;
}
```

**Changes Required**:
1. Rename `changes` → `project_context.files_changed`
2. Rename `previous_tests` → `project_context.related_tests`
3. Add `change_type` field (can be hardcoded to "modified" for now)
4. Add `project_id` field (use "default")
5. Remove `client_metadata` from the request payload (or move it)

**Files to Modify**:
- `src/impact/api/types.ts` - Update interface definitions
- `src/impact/commands/analyzeImpact.ts` - Transform data before sending

---

## Test Project Setup

### Project Structure
```
test_plan_T3/
├── src/
│   └── utils.py
└── tests/
    └── test_utils.py
```

### Test Files Content

**File 1: `src/utils.py`** (Initial State)
```python
def get_greeting(name: str) -> str:
    """Returns a standard greeting."""
    return f"Hello, {name}"

def add_numbers(a: int, b: int) -> int:
    """Adds two numbers together."""
    return a + b
```

**File 2: `tests/test_utils.py`**
```python
from src.utils import get_greeting, add_numbers

def test_greeting():
    """Tests the greeting function."""
    assert get_greeting("World") == "Hello, World"

def test_addition():
    """Tests the addition function."""
    assert add_numbers(2, 3) == 5
```

### Git Setup
1. Initialize git: `git init`
2. Add files: `git add .`
3. Commit: `git commit -m "Initial commit"`

---

## Test Case 1: Success with Impact Found

### Objective
Verify that the frontend correctly detects code changes, sends the correct request to `/analysis/impact`, and displays impacted tests when the backend returns them.

### Pre-Test Setup
1. Ensure test project is initialized with git
2. Verify both files exist with initial content
3. Open the project in VSCode
4. Open Output panel (View → Output) and select "Extension" channel

### Test Steps

**Step 1: Create a Code Change**
- Open `test_plan_T3/src/utils.py`
- Modify the `get_greeting` function:
  - Change: `return f"Hello, {name}"`
  - To: `return f"Hi, {name}"`
- Save the file (DO NOT commit)

**Step 2: Verify Git Detects the Change**
```bash
cd test_plan_T3
git status
# Should show: modified: src/utils.py
```

**Step 3: Trigger Impact Analysis**
Option A: Click "LLT Impact" icon in Activity Bar → Click "Analyze Changes" button
Option B: Press `Ctrl+Shift+P` → Type "LLT: Analyze Changes" → Press Enter

**Step 4: Observe Progress Dialog**
Should see notifications:
- "Checking backend connection..."
- "Extracting code changes from git..."
- "Collecting test files..."
- "Analyzing impact on tests..."
- "Building analysis results..."
- "Displaying results..."

### Expected Logs to Capture

Look for these log entries in the Output panel:

**Debug Logs**:
```
[Impact Analysis] Extracting changes from workspace: /path/to/test_plan_T3
[Impact Analysis] Found changes in 1 files
[Impact Analysis] Changed files: ["src/utils.py"]
```

**Request Payload Log** (CRITICAL - Must match new format):
```
[Impact Analysis] Request Payload: {
  "project_context": {
    "files_changed": [
      {
        "path": "src/utils.py",
        "change_type": "modified"
      }
    ],
    "related_tests": [
      "from src.utils import get_greeting, add_numbers\n\ndef test_greeting()..."
    ]
  },
  "git_diff": "...",
  "project_id": "default"
}
```

**Response Log** (Expected - When backend works):
```
[Impact Analysis] Response Object: {
  "impacted_tests": [
    {
      "test_name": "test_greeting",
      "test_path": "tests/test_utils.py",
      "impact_type": "functional_change"
    }
  ]
}
```

### Expected UI Behavior

**Success Case**:
- Notification: "Impact analysis complete: 1/1 files analyzed, 1 tests affected"
- Tree view shows `test_greeting` under impacted tests
- Can drill down to see test details

**Error Case** (if backend not ready):
- Notification shows error message
- Check logs for error details

### Expected Request Format After Fix

The request payload after Fix B should look like:
```json
{
  "project_context": {
    "files_changed": [
      {
        "path": "src/utils.py",
        "change_type": "modified"
      }
    ],
    "related_tests": [
      "from src.utils import get_greeting, add_numbers\n\ndef test_greeting():\n    ...\n    assert get_greeting(\"World\") == \"Hello, World\"\n\ndef test_addition():\n    ..."
    ]
  },
  "git_diff": "diff --git a/src/utils.py b/src/utils.py\nindex abc123..def456 100644\n--- a/src/utils.py\n+++ b/src/utils.py\n@@ -1,4 +1,4 @@\n def get_greeting(name: str) -> str:\n     \"\"\"Returns a standard greeting.\"\"\"\n-    return f\"Hello, {name}\"\n+    return f\"Hi, {name}\"\n",
  "project_id": "default"
}
```

### Expected Response Format (From Backend)

Backend should return:
```json
{
  "impacted_tests": [
    {
      "test_name": "test_greeting",
      "test_path": "tests/test_utils.py",
      "impact_type": "functional_change",
      "description": "Function signature or behavior changed"
    }
  ]
}
```

---

## Additional Test Cases for Future Testing

### Test Case 2: No Impact Found
- Modify only comments or add unused function
- Expected: Empty `impacted_tests` array, UI shows "No impacted tests found"

### Test Case 3: Invalid Input (4xx)
- Try to run without any file changes
- Expected: Frontend shows "No changes detected" message

### Test Case 4: Server Error (5xx)
- Can be tested by temporarily changing API URL to invalid endpoint
- Expected: Frontend catches error and shows user-friendly message

---

## Files to Modify for the Fix

### 1. `src/impact/api/types.ts`
- Create new interface: `ImpactAnalysisRequest`
- Create new interface: `ImpactAnalysisResponse`
- Match the backend contract exactly

### 2. `src/impact/api/impactClient.ts`
- Update endpoint URL: `/workflows/detect-code-changes` → `/analysis/impact`
- Update method signature to accept new request format

### 3. `src/impact/commands/analyzeImpact.ts`
- Transform existing data structure to new format
- Extract git diff and add to payload
- Build `files_changed` array from git changes
- Include `project_id: "default"`

### 4. `src/impact/models/types.ts` (if needed)
- May need to update data models to match new response format

---

## Verification Checklist

Before running Test Case 1, ensure:

- [ ] Endpoint URL updated to `/analysis/impact`
- [ ] Request interface matches backend spec
- [ ] Response interface matches backend spec
- [ ] Data transformation implemented in analyzeImpact command
- [ ] Git diff extraction added
- [ ] Code compiles without errors: `npm run compile`
- [ ] Test project is set up and git-initialized
- [ ] File `src/utils.py` is modified (Hello → Hi)
- [ ] Git detects the change (`git status`)
- [ ] Output panel is open and set to "Extension" channel

---

## Expected Results Summary

**After Fix A + Fix B**:

**Request should show in logs**:
```
[Impact Analysis] Request Payload: {
  "project_context": {
    "files_changed": [...],
    "related_tests": [...]
  },
  "git_diff": "...",
  "project_id": "default"
}
```

**Response should show in logs** (if backend works):
```
[Impact Analysis] Response Object: {
  "impacted_tests": [...]
}
```

**UI should show**:
- Success notification: "Impact analysis complete: X files analyzed, Y tests affected"
- Tree view populated with impacted tests

---

## Next Steps

1. Implement Fix A (update endpoint URL)
2. Implement Fix B (update payload structure)
3. Compile the extension: `npm run compile`
4. Set up test project as described
5. Run Test Case 1 verification
6. Capture and provide logs:
   - Request payload log
   - Response object log
   - Any error logs

The logs should show that the frontend is now correctly formatted and sending requests to `/analysis/impact` with the proper `ImpactAnalysisRequest` structure.
## [Feature 1] Frontend Regeneration Mode Detection

**Status:** Open  
**Impact:** Low (LLM Context Context only)  
**Priority:** Medium

### Description

The `mode` variable in `registerGenerateTestsCommand` defaults to 'new'. It should auto-detect 'regenerate' if `existingTestCode` is found.

### Technical Details

**Location:** `src/extension.ts` line 448

**Current Code:**
```typescript
const mode = args?.mode || 'new';
```

**Expected Behavior:**
```typescript
const existingTestFilePath = await CodeAnalyzer.findExistingTestFile(filePath);
const mode = existingTestFilePath ? 'regenerate' : (args?.mode || 'new');
```

### Impact Analysis

**Frontend Impact:** Low
- UI flows work correctly (prompt only shows for mode === 'new')
- `existing_test_code` is correctly passed to backend

**Backend Impact:** Low
- Backend uses `mode` as LLM context/prompt only
- No hard control flow branches based on mode value
- `user_description` field is primary indicator for regeneration

### Complexity

**Medium**

**Reason:** Requires refactoring the User Input logic (line 493) to decouple from the initial `mode` variable, allowing `mode` to be finalized after checking for existing files.

**Risk:** High - Changes to variable scope may break TypeScript compilation and affect UI prompts

### Recommended Approach

Schedule as part of next code quality sprint or when refactoring the test generation command.

**Estimated Effort:** 30 minutes including testing

### Workaround

Current implementation is functional. Backend receives both:
1. `existing_test_code` - actual code for analysis
2. `user_description` - clearly indicates "Regenerate tests..."

These provide sufficient context for LLM to generate appropriate tests.

---

## [Backend][Feature 1] Error Object Schema Mismatch (Critical)

**Status:** Open  
**Impact:** Critical (Backend Stability)  
**Priority:** High  
**Responsible:** Backend Team

### Description

Backend stores error as string but API schema expects error object, causing unhandled ValidationError and Uvicorn worker crash.

### Technical Details

**API Schema (OpenAPI.yaml):**
```yaml
# Expected response format
error:
  type: object
  properties:
    message: string
    code: string/null
```

**Current Backend Code (Bug):**
```python
# In app/core/tasks/tasks.py
if error is not None:
    task['error'] = error  # Stores string, not object ❌
```

**Result in Redis:**
```json
{
  "error": "Simulated backend error..."  // ❌ String, not object
}
```

**Crash:**
- Frontend polls `GET /tasks/{task_id}`
- Backend returns malformed data
- Pydantic ValidationError in route handler
- Unhandled exception crashes Uvicorn worker
- Docker container shows "healthy" but app is dead

### Impact Analysis

**Frontend Impact:** Critical
- Test generation tasks appear to "hang" or timeout
- User sees confusing error messages
- No clear indication of what went wrong

**Backend Impact:** Critical
- System instability during any test generation failure
- Worker crashes require container restart
- Affects all users of the system

### Root Cause

Type mismatch between API schema definition and task storage implementation. The `update_task_status` function needs to construct proper error object.

### Recommended Fix

**File:** `LLT-Assistant-Backend/app/core/tasks/tasks.py`

```python
async def update_task_status(
    task_id: str,
    status: TaskStatus,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
):
    # ... existing code ...
    
    # Fix error object construction
    if error is not None:
        task['error'] = {
            "message": str(error),
            "code": None  # Add specific codes if needed
        }
    else:
        task['error'] = None
    
    await _save_task(task_id, task)
```

### Long-Term Improvements

1. **Contract Testing:** Implement automated contract testing (hypothesis/schemathesis) to validate API responses match OpenAPI spec under all conditions

2. **Global Exception Handler:** Add FastAPI middleware to catch unhandled exceptions and return standardized 500 responses instead of crashing worker

3. **API Schema Validation:** Add runtime validation to ensure all data written to Redis conforms to API schema

### Discovery Context

**Discovered By:** Frontend Test Case 3 (Failed Test Generation)  
**Test Scenario:** Simulating backend failure during test generation  
**Test Date:** 2025-11-25  
**Frontend Logs:** Show "No response received from backend" after 37 polling attempts  
**Backend Logs:** Uvicorn worker crashed with ValidationError

### Workaround

None available. This is a critical backend bug that must be fixed for stable operation.

**Estimated Fix Time:** 15 minutes (code change + testing)  
**Estimated Rollout:** Immediate deployment to dev/staging, then production

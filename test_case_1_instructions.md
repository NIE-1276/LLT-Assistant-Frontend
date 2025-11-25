# Test Case 1: Success with Impact Found - Step-by-Step

## Current Status: ✅ File Modified and Ready

**File**: `test_plan_T3/src/utils.py`  
**Change**: Line 3 modified from:
```python
return f"Hello, {name}"
```
to:
```python
return f"Hi, {name}"
```

**Git Status**: Changes detected ✓
```
Changes not staged for commit:
  modified:   src/utils.py
```

## Next Steps to Complete Test Case 1

### 1. Reload the Extension
Since we've added debug logging, you need to restart the extension:

**Option A**: 
- Press `F5` in the extension development window
- This launches a fresh VSCode window with the updated extension

**Option B**:
- In the test window, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type "Developer: Reload Window" and press Enter

### 2. Open the Test Project
In the new VSCode window (with the extension loaded):

- Open the folder: `/Users/efan404/Codes/courses/CityU_CS5351/LLT-Assistant-VSCode/test_plan_T3/`
- Verify that `src/utils.py` still shows the modified line (should be `Hi, {name}`)

### 3. Open the Output Panel
Before running the test, open the Output panel to see the logs:

- Click **View → Output** (or press `Ctrl+Shift+U`)
- In the dropdown (top-right), select **"Extension"** or **"LLT Assistant"**

### 4. Run Impact Analysis

**Option A - Button Method**:
1. Look for the **"LLT Impact"** icon in the left Activity Bar
2. Click on it to open the Impact Analysis view
3. Click the **"Analyze Changes"** button (🔍 icon)

**Option B - Command Palette Method**:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "LLT: Analyze Changes"
3. Press Enter

### 5. What to Expect

You should see:

#### Progress Dialog
A notification that shows:
- "Checking backend connection..."
- "Extracting code changes from git..."
- "Collecting test files..."
- "Analyzing impact on tests..."
- "Building analysis results..."
- "Displaying results..."

#### Log Output in Output Panel
Look for these log entries:

**Debug Logs** (added just now):
```
[Impact Analysis] Extracting changes from workspace: /Users/.../test_plan_T3
[Impact Analysis] Found changes in 1 files
[Impact Analysis] Changed files: ["src/utils.py"]
```

**Key Logs**:
```
[Impact Analysis] Request Payload: {
  "changes": {
    "old_code": "def get_greeting...",
    "new_code": "def get_greeting... return f\"Hi, {name}\"",
    "file_path": "src/utils.py"
  },
  "previous_tests": "from src.utils import get_greeting, add_numbers...",
  ...
}

[Impact Analysis] Response Object: {
  "context_id": "...",
  "affected_tests": [
    {
      "test_name": "test_greeting",
      "test_path": "tests/test_utils.py",
      "impact_type": "functional_change",
      ...
    }
  ],
  "change_summary": {
    "functions_changed": [...],
    "lines_added": ...,
    "lines_removed": ...,
    "change_type": "bug_fix"
  }
}
```

#### Success Message
A notification should appear:
```
Impact analysis complete: 1/1 files analyzed, 1 tests affected
```

#### UI Display
- The Impact Analysis view should show `test_greeting` listed as an impacted test
- It should show the file path: `tests/test_utils.py`

### 6. Copy the Logs

Please copy from the Output panel:
1. The `[Impact Analysis] Request Payload:` JSON (full)
2. The `[Impact Analysis] Response Object:` JSON (full)
3. Any error messages if they appear

## Troubleshooting

### If No Changes Detected
Make sure:
- The change in `src/utils.py` is still there: `return f"Hi, {name}"` (not `Hello`)
- Git shows the change: `cd test_plan_T3 && git status` (should show modified file)
- The file is saved in VSCode

### If Extension Still Shows "No changes detected"
The debug logs will now tell us what's happening. Look for:
```
[Impact Analysis] Found changes in X files
[Impact Analysis] Changed files: [...]
```

### If You Get an Error
Check the logs for:
- `[Impact Analysis] Error Object:`
- `Error during impact analysis:`
- `Failed to analyze impact:`

## Summary

✅ **File modified**: `src/utils.py` - changed `Hello` to `Hi`  
✅ **Git detects changes**: Yes  
✅ **Extension updated**: New debug logs added and compiled  
⏳ **Next**: Reload extension and run Impact Analysis  

**Please proceed with steps 1-6 above and provide the logs!**
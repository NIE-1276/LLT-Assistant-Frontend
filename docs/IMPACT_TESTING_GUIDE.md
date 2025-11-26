# Feature 3: Impact Analysis - Manual Testing Guide

This document provides step-by-step instructions for manually testing the Impact Analysis feature as outlined in the test plan.

## Prerequisites

1. VSCode extension has been built with logging enabled
2. Test project is set up in `test_plan_T3/`
3. Extension is running in VSCode debugger or installed in VSCode

## Test Project Structure

```
test_plan_T3/
├── src/
│   └── utils.py         # Contains functions to modify
└── tests/
    └── test_utils.py    # Contains tests that may be impacted
```

## How to Run Tests

### Starting the Extension

1. Open VSCode in the extension project (`LLT-Assistant-VSCode`)
2. Press F5 to launch a new VSCode window with the extension loaded
3. In the new window, open the test project folder: `test_plan_T3/`
4. Open the Output panel (View → Output) and select "Extension" channel to see logs
5. The extension is now ready for testing

### Accessing Impact Analysis

Impact Analysis can be triggered through:

1. **Command Palette**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and search for "LLT Assistant: Analyze Impact"
2. **Activity Bar**: Look for the LLT Impact icon in the left sidebar
3. **Context Menu**: Right-click on a file in the Explorer and look for impact analysis options

## Test Cases

### Test Case 1: Success with Impact Found

**Goal**: Verify the frontend correctly renders impacted tests when the API returns them.

**Steps**:
1. In `test_plan_T3/src/utils.py`, modify the `get_greeting` function:
   ```python
   # Change this:
   return f"Hello, {name}"
   # To this:
   return f"Hi, {name}"
   ```

2. Save the file but **DO NOT** commit the change
3. Trigger the Impact Analysis feature using any method above
4. Check the Output panel for logs and observe the UI

**What to look for in logs**:
```
[Impact Analysis] Request Payload: {
  "changes": {
    "old_code": "...",
    "new_code": "...",
    "file_path": "src/utils.py"
  },
  "previous_tests": "...",
  "client_metadata": {...}
}

[Impact Analysis] Response Object: {
  "context_id": "...",
  "affected_tests": [
    {
      "test_name": "test_greeting",
      "test_path": "tests/test_utils.py",
      "impact_type": "...",
      ...
    }
  ],
  "change_summary": {...}
}
```

**Expected Outcome**:
- Backend returns `200 OK` with non-empty `affected_tests` array
- UI displays the impacted test (`test_greeting`)
- Extension shows success message with test count

**Reverting**: Undo the change in `src/utils.py`

---

### Test Case 2: Success with No Impact Found

**Goal**: Verify the frontend correctly displays a "no impact" state.

**Steps**:
1. In `test_plan_T3/src/utils.py`, add a comment or unused function:
   ```python
   # This is just a comment - no impact on tests
   def unused_function():
       """This function is not used in tests."""
       return 42
   ```

2. Save the file but **DO NOT** commit the change
3. Trigger the Impact Analysis feature
4. Check the Output panel for logs

**What to look for in logs**:
```
[Impact Analysis] Request Payload: {...}
[Impact Analysis] Response Object: {
  "context_id": "...",
  "affected_tests": [],  // Empty array
  "change_summary": {...}
}
```

**Expected Outcome**:
- Backend returns `200 OK` with empty `affected_tests` array: `"affected_tests": []`
- UI displays "No impacted tests found" or similar empty state
- Extension shows "no tests affected" message

**Reverting**: Undo the change in `src/utils.py`

---

### Test Case 3: Invalid Input Error (4xx)

**Goal**: Verify the frontend gracefully handles predictable client-side errors.

**Note**: This test is **optional** as the VSCode UI typically prevents triggering analysis without file changes. If you want to test this case:

**Steps**:
1. Commit all changes in the test project to ensure a clean working directory:
   ```bash
   git add . && git commit -m "Clean state"
   ```

2. Try to trigger Impact Analysis without any uncommitted changes
3. Check the Output panel for logs

**What to look for in logs**:
```
No changes detected in working directory
```

**Expected Outcome**:
- Extension shows informational message: "No changes detected in working directory"
- No error occurs, extension handles gracefully

---

### Test Case 4: Server Failure (500)

**Goal**: Verify the frontend is resilient to unexpected server-side failures.

**Steps**:

1. **Temporarily modify the backend URL** in the extension:
   - Open `src/impact/api/impactClient.ts`
   - Find the line with `'/workflows/detect-code-changes'`
   - Temporarily change it to: `'/workflows/detect-code-changes-error'`

2. Rebuild the extension:
   ```bash
   npm run compile
   ```

3. Restart the extension (press F5 to launch a new VSCode instance)

4. Make a change to `test_plan_T3/src/utils.py` (e.g., modify `get_greeting` function)

5. Trigger Impact Analysis

6. Check the Output panel for logs

**What to look for in logs**:
```
[Impact Analysis] Request Payload: {...}
[Impact Analysis] Error Object: [AxiosError with 404/500 status]
```

**Expected Outcome**:
- `axios` call fails with 404/500 error
- Extension catches the exception
- UI displays user-friendly error message like "Failed to connect to the analysis service." or "Backend server error"
- Extension does not crash

**Reverting**:
1. Restore the original endpoint URL in `impactClient.ts`
2. Rebuild the extension: `npm run compile`
3. Restart the extension

---

## General Testing Notes

1. **Check Logs**: Always verify the Output panel → Extension channel for detailed request/response logs
2. **Watch UI**: Observe how the UI responds to different scenarios
3. **Error Messages**: Confirm that error messages are user-friendly and helpful
4. **No Crashes**: Ensure the extension never crashes VSCode, even with errors
5. **Clean State**: Return files to original state after each test case

## Troubleshooting

### If Impact Analysis doesn't appear:
- Ensure the extension is properly loaded (check Extensions panel)
- Verify you're in a valid workspace (not just a single file)
- Check that the project has Python files and git initialized
- Look in Output panel for any extension activation errors

### If no logs appear:
- Make sure you're viewing the correct Output channel ("Extension")
- The extension may need to be reloaded (Ctrl+Shift+P → "Developer: Reload Window")

### If changes aren't detected:
- Ensure git is tracking the files (check `git status`)
- Make sure changes are in the working directory, not staged
- Verify the files are Python files (.py extension)
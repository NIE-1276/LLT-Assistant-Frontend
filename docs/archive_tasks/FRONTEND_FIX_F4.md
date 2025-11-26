# Frontend Fix Specification: Feature 4 Data Handling

**Objective:** To fix the `TypeError` in the Quality Analysis feature by aligning the frontend's data handling logic with the actual API response structure provided by the backend.

**Project:** `LLT-Assistant-VSCode`

---

## 1. Root Cause Analysis

The core issue is a data structure mismatch between the frontend's expectation and the backend's actual response for the `/quality/analyze` endpoint.

-   **Frontend Expectation:** The code in `src/quality/commands/analyze.ts` expects a response containing a `metrics` object with a `severity_breakdown` inside it.
-   **Backend Reality:** The backend implementation (in `quality_service.py`) and its schema definition (in `schemas.py`) show that it returns a `summary` object with a different structure. It **does not** contain a `metrics` object.

**This is not a backend bug, but rather an incorrect implementation on the frontend.** The frontend is trying to access a `metrics` object that never exists in the API response.

## 2. Required Frontend Changes

The fix must be applied to the frontend code to correctly handle the data the backend provides.

**File to Modify:** `LLT-Assistant-VSCode/src/quality/commands/analyze.ts`
**Function to Modify:** `showResultSummary` (or a similar function where the response is processed)

### Change 1: Correctly Destructure the API Response

**Locate this line (around line 231 as per your report):**
```typescript
const { issues, metrics } = result;
```

**Replace it with this correct destructuring:**
```typescript
const { issues, summary } = result;
```
*Reasoning: This correctly unpacks the `summary` object that the backend sends, instead of the non-existent `metrics` object.*

### Change 2: Adapt UI Logic to Use Available Data

The code that follows the line above attempts to use `metrics.severity_breakdown`. Since the `summary` object contains `{ total_files, total_issues, critical_issues }`, you must adapt the logic to use these fields.

**Locate this line:**
```typescript
const breakdown = metrics.severity_breakdown;  // This will cause a crash
```

**Modify the subsequent code to use the `summary` object.**

For now, this means you cannot display a detailed breakdown by severity. You can, however, display the total counts.

**Example of an adapted implementation:**
```typescript
// Previous (buggy) code:
// const breakdown = metrics.severity_breakdown;
// const errorCount = breakdown.error;
// const warningCount = breakdown.warning;

// Corrected logic using the 'summary' object:
const errorCount = summary.critical_issues; // 'critical_issues' corresponds to 'error' severity
const totalIssues = summary.total_issues;

// You can now use these variables to build your summary message.
// The UI logic that displayed a breakdown of warning/info counts
// should be temporarily removed or commented out.
// For example:
const message = `Quality Analysis Complete: Found ${totalIssues} total issues across ${summary.total_files} files, with ${errorCount} critical error(s).`;

// ... then display this message in the UI.
```

## 3. Backlog Task Created

A detailed severity breakdown is a valuable feature. I have added this to our `PROJECT_ROADMAP.md` as a future task. This will involve:
1.  Updating the backend to calculate and return `severity_breakdown`.
2.  Updating the frontend to display this information once it's available.

For now, the priority is to fix the crash and correctly display the information that is currently available.

## 4. Summary of Action

1.  In `analyze.ts`, change the response handling to destructure the `summary` object, not `metrics`.
2.  Update the UI summary logic to use the fields from the `summary` object (`total_files`, `total_issues`, `critical_issues`).
3.  Comment out or remove any UI elements that relied on the non-existent `severity_breakdown`.

After applying these changes, the `TypeError` will be resolved, and the Quality Analysis feature will correctly display a summary based on the actual data provided by the backend.

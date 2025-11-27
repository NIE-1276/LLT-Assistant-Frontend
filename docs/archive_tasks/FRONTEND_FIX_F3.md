# Frontend Fix Specification: Feature 3 (Impact Analysis)

**Objective:** Fix the `404 Not Found` error by aligning the frontend with the correct backend API endpoint and request structure.

## 1. Current Status & Problem

-   **Frontend Issue:** The frontend is sending requests to `/workflows/detect-code-changes`. This endpoint **does not exist** on the backend.
-   **Backend Reality:** The correct endpoint defined in `OPENAPI.yaml` is `POST /analysis/impact`.
-   **Payload Mismatch:** The frontend sends a structure with `old_code`/`new_code`, but the backend expects a `project_context` object with a list of changed files.

## 2. Required Fixes

Please modify the frontend code (likely in `src/impact/api/client.ts` or `ImpactAnalyzer.ts`) to match the backend contract.

### Fix A: Update Endpoint URL

Change the API URL from:
`POST /workflows/detect-code-changes`
To:
`POST /analysis/impact`

### Fix B: Update Request Payload Structure

The backend expects the following JSON structure. You must transform your data to match this:

```typescript
// Target Backend Interface (ImpactAnalysisRequest)
interface ImpactAnalysisRequest {
  project_context: {
    files_changed: Array<{
      path: string;           // e.g., "src/utils.py"
      change_type: "modified" | "added" | "removed";
    }>;
    related_tests: Array<string>; // e.g., ["tests/test_utils.py"] (Optional but recommended)
  };
  git_diff?: string;          // Optional: The raw git diff content
  project_id: string;         // Default: "default"
}
```

**Implementation Note:**
Instead of sending full file content (`old_code`, `new_code`), simply tell the backend **which file changed** and provide the **git diff**. The backend will use its graph and the diff to figure out the impact.

## 3. Verification Plan

After applying the fix, re-run **Test Case 1**.

### Test Case 1: Success with Impact

1.  **Action:** Modify `src/utils.py` (e.g., change a return value) and trigger Impact Analysis.
2.  **Expected Request Log:**
    -   URL: `.../analysis/impact`
    -   Payload: Should contain `project_context` with your modified file path.
3.  **Expected Response:**
    -   Status: `200 OK`
    -   Body: JSON with `impacted_tests` array.
4.  **Expected UI:**
    -   Success message showing the number of impacted tests (e.g., "Impact analysis complete: 1 test affected").

---

**Action Item:** Apply these fixes and provide the new logs for Test Case 1.

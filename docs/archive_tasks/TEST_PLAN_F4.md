# Test Plan for Feature 4: Quality Analysis

**Objective:** To systematically validate the frontend's handling of the `/quality/analyze` API endpoint and diagnose the root cause of the `TypeError` and data rendering bugs.

**Methodology:** Please follow the "Feature-by-Feature Validation" process outlined in `PROJECT_ROADMAP.md`. Your primary task is to add detailed logging to the frontend code that calls `/quality/analyze` and provide the logs for each test case below.

**Required Logging:** The logs must clearly show:
1.  The full **request payload** sent to the `/quality/analyze` endpoint.
2.  The full **response object** (or error object) received from the backend.

---

## Test Cases

Please execute the following test cases in order and provide the logs for each.

### Test Case 1: Success with Issues Found

-   **Goal:** Verify the frontend correctly renders issues when the API returns them.
-   **Action:**
    1.  Create a Python file with obvious quality issues that the backend is likely to detect. For example, a function with a redundant `else` after a `return`.
        ```python
        # file: quality_test_bad.py
        def check_value(x):
            if x > 10:
                return "High"
            else:
                return "Low"
        # This function is simple, but you may need something more complex
        # that you know the analyzer will flag.
        ```
    2.  Trigger the quality analysis feature on this file.
-   **Expected Outcome:**
    -   **API:** Backend returns a `200 OK` status with a JSON body containing a non-empty `issues` array.
    -   **UI:** The frontend UI should display the quality issues found in the file without any `TypeError` crashes.

### Test Case 2: Success with No Issues Found

-   **Goal:** Verify the frontend correctly displays a "no issues" state.
-   **Action:**
    1.  Create a clean Python file with no obvious quality issues.
        ```python
        # file: quality_test_good.py
        def check_value(x):
            """Checks if a value is high."""
            if x > 10:
                return "High"
            return "Low"
        ```
    2.  Trigger the quality analysis feature on this file.
-   **Expected Outcome:**
    -   **API:** Backend returns a `200 OK` status with a JSON body containing an empty `issues` array (`"issues": []`).
    -   **UI:** The frontend should display a "No issues found" message or a similar empty state, not a "No suggestion found" error, and should not crash.

### Test Case 3: Invalid Input Error (`4xx`)

-   **Goal:** Verify the frontend gracefully handles a predictable client-side error.
-   **Action:**
    1.  This one may be difficult to trigger from the UI, as the UI likely prevents sending an empty request.
    2.  If possible, try to trigger the analysis on an empty, unsaved file.
    3.  **If you cannot trigger this from the UI**, please state so. We may need to simulate it by temporarily modifying the frontend code to send an empty `files` array in the request payload. I will provide instructions for this if needed.
-   **Expected Outcome:**
    -   **API:** Backend returns a `4xx` error (likely `422 Unprocessable Entity`) with a standard `ErrorResponse` JSON body.
    -   **UI:** The frontend should display a user-friendly error message based on the `error` field from the response and should not crash.

### Test Case 4: Server Failure (`500`)

-   **Goal:** Verify the frontend is resilient to unexpected server-side failures.
-   **Action:**
    1.  In the frontend source code where the `axios` API client is configured, temporarily change the URL for the `/quality/analyze` endpoint to a non-existent address (e.g., `http://localhost:8000/api/v1/quality/analyze_error`).
    2.  Trigger the quality analysis feature. This will cause a network error, simulating a `500` or a connection failure.
    3.  **Remember to revert the URL change after this test.**
-   **Expected Outcome:**
    -   **API:** The `axios` call will fail.
    -   **UI:** The frontend should catch the exception and display a generic but user-friendly error message (e.g., "Failed to connect to the analysis service.") and must not crash.

---

Please proceed with **Step B** of our methodology: instrument the code and provide me with the logs for these four cases. This will give us the data necessary to permanently solve these bugs.

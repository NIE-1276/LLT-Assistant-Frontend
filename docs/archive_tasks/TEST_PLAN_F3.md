# Test Plan for Feature 3: Impact Analysis

**Objective:** To systematically validate the frontend's handling of the `/analysis/impact` API endpoint, ensuring it is as robust and reliable as the Quality Analysis feature.

**Methodology:** Please follow the "Feature-by-Feature Validation" process outlined in `PROJECT_ROADMAP.md`. Your primary task is to add detailed logging to the frontend code that calls `/analysis/impact` and provide the logs for each test case below.

**Required Logging:** The logs must clearly show:
1.  The full **request payload** sent to the `/analysis/impact` endpoint.
2.  The full **response object** (or error object) received from the backend.

---

## Test Setup

For these tests, you will need a small project with at least two files: a utility file and a test file that uses it.

**File 1: `src/utils.py`**
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

---

## Test Cases

Please execute the following test cases in order and provide the logs for each.

### Test Case 1: Success with Impact Found

-   **Goal:** Verify the frontend correctly renders impacted tests when the API returns them.
-   **Action:**
    1.  In `src/utils.py`, modify the `get_greeting` function. For example, change the return value: `return f"Hi, {name}"`.
    2.  Trigger the Impact Analysis feature on this change.
-   **Expected Outcome:**
    -   **API:** Backend returns a `200 OK` status with a JSON body containing a non-empty `impacted_tests` array, identifying `tests/test_utils.py::test_greeting`.
    -   **UI:** The frontend UI should display the impacted test case (`test_greeting`) without any crashes.

### Test Case 2: Success with No Impact Found

-   **Goal:** Verify the frontend correctly displays a "no impact" state.
-   **Action:**
    1.  In `src/utils.py`, modify only a comment or add a new, unused function. Do not change the existing functions.
    2.  Trigger the Impact Analysis feature.
-   **Expected Outcome:**
    -   **API:** Backend returns a `200 OK` status with a JSON body containing an empty `impacted_tests` array (`"impacted_tests": []`).
    -   **UI:** The frontend should display a "No impacted tests found" message or a similar empty state, and must not crash.

### Test Case 3: Invalid Input Error (`4xx`)

-   **Goal:** Verify the frontend gracefully handles predictable client-side errors.
-   **Action:**
    1.  Attempt to trigger the Impact Analysis without selecting any file changes.
    2.  **Note:** The UI might prevent this. If you cannot easily trigger this scenario from the UI, you can consider it **optional**, as we have already validated the general `4xx` error handling pattern in the Feature 4 tests. Please just note if you were unable to perform it.
-   **Expected Outcome:**
    -   **API:** Backend should return a `4xx` error with the standard `ErrorResponse` body.
    -   **UI:** The frontend should display a user-friendly error message and must not crash.

### Test Case 4: Server Failure (`500`)

-   **Goal:** Verify the frontend is resilient to unexpected server-side failures.
-   **Action:**
    1.  In the frontend source code, temporarily change the URL for the `/analysis/impact` endpoint to a non-existent address (e.g., `http://localhost:8000/api/v1/analysis/impact_error`).
    2.  Trigger the Impact Analysis feature.
    3.  **Remember to revert the URL change after this test.**
-   **Expected Outcome:**
    -   **API Call:** The `axios` call will fail.
    -   **UI:** The frontend must catch the exception and display a generic but user-friendly error message (e.g., "Failed to connect to the analysis service.") without crashing.

---

Please proceed with **Step B** of our methodology: instrument the relevant code, execute these four tests, and provide me with the logs. This will allow us to ensure Feature 3 is as stable as Feature 4.

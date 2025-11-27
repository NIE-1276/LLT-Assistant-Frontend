# Frontend Fix Specification: File Deletion Logic

This document provides the precise technical instructions to fix the file deletion logic in the frontend.

**Project:** `LLT-Assistant-VSCode`
**Objective:** Ensure that when a file is deleted, the frontend sends the correct request (`action: "deleted"`) to the backend, aligning with the API contract defined in `OPENAPI.yaml`.

---

## 1. Problem Diagnosis

As detailed in your analysis, the root cause of the bug is a hardcoded `action` in the `IncrementalUpdater.ts` service.

-   **File:** `LLT-Assistant-VSCode/src/analysis/IncrementalUpdater.ts`
-   **Function:** `sendToBackend()`
-   **Issue:** The `action` property in the payload is always set to `'modified'`, even when the file was deleted.

```typescript
// Current defective code
const payload = {
  changes: [{
    file_path: filePath,
    action: 'modified',  // <--- THIS IS THE BUG
    symbols_changed: changes
  }]
};
```

This sends a semantically incorrect message to the backend, risking data inconsistency.

## 2. Required Changes

The fix involves two main modifications within `IncrementalUpdater.ts` to make the `action` dynamic.

### Change 1: Update `sendToBackend` Method Signature

The `sendToBackend` method must be updated to accept the type of action being performed.

**File:** `LLT-Assistant-VSCode/src/analysis/IncrementalUpdater.ts`

**Find this method:**
```typescript
private async sendToBackend(
    projectId: string,
    filePath: string,
    changes: BackendSymbolChange[]
) {
```

**Replace it with this updated signature:**
```typescript
private async sendToBackend(
    projectId: string,
    filePath: string,
    action: 'modified' | 'deleted',
    changes?: BackendSymbolChange[]
) {
```
*Reasoning: We add an `action` parameter to control the payload. `changes` is made optional (`?`) because it is not needed for a `'deleted'` action.*

### Change 2: Update Payload Construction in `sendToBackend`

The body of the `sendToBackend` function must be updated to use the new `action` parameter and conditionally include `symbols_changed`.

**File:** `LLT-Assistant-VSCode/src/analysis/IncrementalUpdater.ts`

**Find this code block inside `sendToBackend`:**
```typescript
    const payload: IncrementalUpdateRequest = {
        version: this.contextState.getBackendVersion(),
        changes: [{
            file_path: filePath,
            action: 'modified', // Hardcoded value
            symbols_changed: changes
        }]
    };
```

**Replace it with this improved logic:**
```typescript
    const payload: IncrementalUpdateRequest = {
        version: this回到刚才问题上面，请你告诉我后端目前的交互逻辑是什么样的呢，同时前端应该给出一样对应配套的方案来保证正确性呢。（不用提供问题的上下文，前端负责人已经知道了回到刚才问题上面，请你告诉在前端发送文件删除时，后端目前的交互逻辑是什么样的呢，同时前端应该给出一样对应配套的方案来保证正确性呢。（不用提供问题的上下文，前端负责人已经知道了
.contextState.getBackendVersion(),
        changes: [{
            file_path: filePath,
            action: action, // Use the dynamic action parameter
            // Only include symbols_changed if the action is 'modified'
            symbols_changed: action === 'modified' ? changes : undefined
        }]
    };
```
*Reasoning: This correctly sets the action based on the function call and follows the best practice of omitting `symbols_changed` when the action is `'deleted'`. The backend does not need this information for a deletion.*

### Change 3: Update `processFileDeletion` Caller

The `processFileDeletion` function, which handles the file deletion event, must now call `sendToBackend` with the correct parameters.

**File:** `LLT-Assistant-VSCode/src/analysis/IncrementalUpdater.ts`

**Find this line inside `processFileDeletion`:**
```typescript
await this.sendToBackend(projectId, relativePath, backendChanges);
```

**Replace it with this correct function call:**
```typescript
// For a deletion, the action is 'deleted' and we don't need to send the symbol changes.
await this.sendToBackend(projectId, relativePath, 'deleted');
```
*Reasoning: This correctly signals to `sendToBackend` that a deletion occurred. We can omit the `backendChanges` array as it's no longer needed for `'deleted'` actions, simplifying the call.*

---

## 3. Summary of Action

1.  Modify the signature of `sendToBackend` to accept a dynamic `action`.
2.  Update the payload construction inside `sendToBackend` to use this dynamic `action` and conditionally omit `symbols_changed`.
3.  Change the call within `processFileDeletion` to pass the `'deleted'` action and remove the unnecessary symbols payload.

After applying these changes, the frontend will send a semantically correct, efficient, and safe request to the backend when a file is deleted.

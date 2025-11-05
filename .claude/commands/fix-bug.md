---
description: Debug and fix issues in the application
---

Help debug and fix the issue by:

**⚠️ IMPORTANT: Keep the fix simple! Don't overcomplicate. The simplest solution that fixes the bug is usually the best.**

## TDD Bug Fix Workflow

### 1. **PLANNING - Understand the Problem**
   - **Use TodoWrite tool** to track the debugging process
   - What is the expected behavior?
   - What is the actual behavior?
   - When does the issue occur?
   - What are the steps to reproduce?
   - Document reproduction steps clearly

### 2. **INVESTIGATION - Find the Root Cause**
   - Check relevant files and components
   - Review recent changes (git blame/history)
   - Look for common patterns (state management, async operations, etc.)
   - Check browser console for errors
   - Review network requests in DevTools
   - Identify the exact source of the bug

### 3. **RED - Write a Test That Reproduces the Bug**
   - Create or update test file for the affected component/feature
   - Write a test that **fails** and demonstrates the bug
   - Test should clearly show expected vs actual behavior
   - Run tests to confirm the bug is captured (`npm run test`)
   - This test will prevent regression in the future

### 4. **GREEN - Fix the Bug**
   - Implement the minimal fix that makes the test pass
   - Consider impact on other parts of the app
   - Keep the fix simple and focused
   - Run all tests to ensure no new issues (`npm run test`)
   - Verify manually in the browser

### 5. **REFACTOR - Improve & Prevent**
   - Clean up any related code if needed
   - Add additional tests for edge cases
   - Update documentation if behavior changed
   - Consider if similar bugs exist elsewhere
   - Ensure all tests still pass

### 6. **VERIFICATION**
   - Verify the fix works in all scenarios
   - Test edge cases
   - Test on different screen sizes (mobile/desktop)
   - Ensure no new issues introduced
   - Check related features still work

**Important:** Every bug fix MUST include a test that would have caught the bug. This prevents the same bug from recurring.

Please describe the issue you're experiencing.

---
description: Refactor code to improve quality and maintainability
---

Refactor the specified code to improve:

**⚠️ IMPORTANT: Keep it simple! Don't overengineer. Only refactor when there's clear benefit. Prefer simple solutions over complex abstractions.**

## TDD Refactoring Workflow - Tests First, Then Refactor

### 1. **PLANNING - Identify What to Refactor**
   - **Use TodoWrite tool** to plan refactoring steps
   - Identify code smells and areas for improvement
   - Define clear goals for the refactoring
   - List specific improvements to make
   - Ensure the benefit is worth the effort

### 2. **RED/GREEN - Ensure Tests Exist First**
   - **CRITICAL:** Check if tests exist for the code being refactored
   - If no tests exist, **write them first** before refactoring
   - Run all existing tests to ensure they pass (`npm run test`)
   - Tests are your safety net - never refactor without them
   - Document current behavior with tests

### 3. **REFACTOR - Improve Code While Keeping Tests Green**
   Run tests after EACH change (`npm run test:watch`)

   **Code Organization:**
   - Extract reusable logic into custom hooks
   - Break down large components
   - Improve file structure
   - Remove code duplication

   **Type Safety:**
   - Strengthen TypeScript types
   - Remove any 'any' types
   - Add proper generics
   - Improve type inference

   **Performance:**
   - Optimize re-renders with useMemo/useCallback
   - Improve data fetching patterns
   - Reduce bundle size
   - Lazy load components where appropriate

   **Patterns:**
   - Apply SOLID principles
   - Use appropriate design patterns
   - Improve abstraction layers
   - Enhance separation of concerns

   **Readability:**
   - Improve naming conventions
   - Add clarifying comments
   - Simplify complex logic
   - Consistent code style

### 4. **VERIFY - Ensure Nothing Broke**
   - Run full test suite (`npm run test`)
   - All tests must still pass
   - Manually test in browser
   - Check mobile responsiveness
   - Verify performance hasn't regressed

### 5. **DOCUMENT - Explain the Changes**
   - Provide before/after examples
   - Explain the benefits clearly
   - Update documentation if needed
   - Note any breaking changes

**Golden Rule:** If tests fail after refactoring, the refactoring is wrong. Fix it or revert.

Please specify what you want to refactor.

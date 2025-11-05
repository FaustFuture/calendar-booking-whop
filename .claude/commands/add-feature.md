---
description: Add a new feature to the funnel builder application
---

Add a new feature following the project architecture:

**⚠️ IMPORTANT: Keep it simple! Don't overengineer. Build the minimum viable solution first.**

## TDD Workflow - RED → GREEN → REFACTOR

### 1. **PLANNING (Required First Step)**

- **Use TodoWrite tool** to create a task breakdown
- Define the feature requirements clearly
- Identify affected components and files
- Plan data model changes if needed
- Consider UI/UX design
- Define success criteria

### 2. **REFACTOR - Improve Code Quality**

- Follow existing patterns (Factory, Repository, etc.)
- Use TypeScript strictly
- Include JSDoc comments
- Follow mobile-first responsive design
- Use skeleton loaders for loading states
- Add proper error handling with toast notifications
- **⚠️ CRITICAL: All CTA buttons MUST have `cursor-pointer` and be fully functional**
- Ensure tests still pass after refactoring

**Test Utilities Available:**

- `src/test-utils/index.tsx` - Custom render with providers
- `src/test-utils/test-helpers.ts` - Mock data creators

Please describe the feature you want to add.

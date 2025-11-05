---
description: Optimize application performance and loading times
---

Analyze and optimize performance:

**⚠️ IMPORTANT: Keep optimizations simple! Don't prematurely optimize. Only optimize when there's a measured performance issue. Avoid complex solutions when simple ones work.**

## Performance Optimization Workflow

### 1. **MEASURE FIRST (Required)**
   - **Use TodoWrite tool** to track optimization steps
   - Identify and document the performance issue
   - Get baseline metrics:
     - React DevTools Profiler (render times)
     - Lighthouse audit scores
     - Bundle analyzer results
     - Network tab analysis
   - Define clear performance goals

### 2. **ENSURE TESTS EXIST**
   - **CRITICAL:** Check if performance-critical code has tests
   - If tests are missing, write them first
   - Tests ensure optimizations don't break functionality
   - Document expected behavior before optimizing

### 3. **IDENTIFY BOTTLENECKS**
   - Check for unnecessary re-renders
   - Analyze bundle size
   - Review network requests
   - Check memory leaks
   - Identify slow operations
   - Profile with React DevTools

### 4. **OPTIMIZE (One Change at a Time)**
   Run tests after EACH optimization (`npm run test`)

   **React Performance:**
   - Add React.memo where appropriate
   - Use useMemo for expensive calculations
   - Use useCallback for event handlers
   - Implement virtualization for long lists
   - Code splitting with dynamic imports

   **Data Fetching:**
   - Implement proper caching
   - Reduce API calls
   - Optimize query patterns
   - Use proper loading states
   - Handle errors gracefully

   **Build Optimization:**
   - Tree shaking
   - Minimize bundle size
   - Optimize images
   - Implement lazy loading
   - Use Next.js optimization features

### 5. **MEASURE AGAIN & VERIFY**
   - Measure performance improvement
   - Compare before/after metrics
   - Run all tests to ensure nothing broke (`npm run test`)
   - Test manually in different scenarios
   - Verify mobile performance

### 6. **DOCUMENT RESULTS**
   - Document baseline vs optimized metrics
   - Explain what was changed and why
   - Note any trade-offs made
   - Update comments in code

**Key Principles:**
- Measure before and after
- Optimize one thing at a time
- Always keep tests passing
- Document your findings

Please specify what performance issues you're experiencing.

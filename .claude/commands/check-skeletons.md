# Check Skeleton Loaders

Audit all pages and components in the application to ensure proper skeleton loading states are implemented.

## What You Should Do

1. **Scan All Pages**
   - Find all page.tsx files in the app directory
   - Check if each page has proper loading states
   - Verify skeleton usage matches the SKELETON-GUIDELINES.md

2. **Scan All Client Components**
   - Find components with async data fetching
   - Check for `isLoading` states and skeleton implementations
   - Identify components with missing loading states

3. **Verify Skeleton Patterns**
   - Ensure skeletons match actual content layout
   - Check that proper skeleton components are used
   - Verify responsive behavior

4. **Generate Report**
   - List all pages with proper skeletons ✅
   - List pages missing skeletons ❌
   - List components with loading states ✅
   - List components needing skeletons ⚠️
   - Suggest appropriate skeleton patterns

5. **Provide Recommendations**
   - Suggest which skeleton component to use for each missing case
   - Identify opportunities for creating new reusable skeletons
   - Highlight any anti-patterns (e.g., spinners instead of skeletons)

## Audit Checklist

### Pages to Check
- [ ] app/page.tsx (root)
- [ ] app/funnels/page.tsx
- [ ] app/editor/[id]/page.tsx
- [ ] app/f/[slug]/page.tsx
- [ ] Any loading.tsx files

### Components to Check
- [ ] FunnelTemplatesGallery
- [ ] PageTemplatesLibrary
- [ ] VersionHistory
- [ ] Any drawer/modal components
- [ ] Any data-fetching components

### Validation Criteria
- [ ] Loading states use skeleton components (not just spinners)
- [ ] Skeletons match actual content structure
- [ ] Responsive behavior is preserved
- [ ] No layout shift between skeleton and content
- [ ] Proper skeleton count (not too many/few items)

## Output Format

Provide a detailed report in this format:

```
# Skeleton Loader Audit Report

## ✅ Pages with Proper Skeletons
- app/funnels/page.tsx - Uses SkeletonFunnelsList
- app/editor/[id]/page.tsx - Uses SkeletonEditor
...

## ❌ Pages Missing Skeletons
- [None found] or
- app/some/page.tsx - Currently uses spinner, recommend SkeletonXYZ

## ✅ Components with Loading States
- FunnelTemplatesGallery - Uses SkeletonTemplateGallery
- PageTemplatesLibrary - Uses SkeletonPageTemplateLibrary
...

## ⚠️ Components Needing Skeletons
- ComponentName - Fetches data but no loading state
  Recommendation: Create SkeletonComponentName

## 📊 Statistics
- Total pages audited: X
- Pages with skeletons: X (X%)
- Components with loading states: X
- Issues found: X

## 🎯 Recommendations
1. [Specific recommendations based on findings]
2. ...

## 🔧 Action Items
- [ ] Fix missing skeletons in pages
- [ ] Add loading states to components
- [ ] Create new skeleton patterns if needed
```

## Reference

See [SKELETON-GUIDELINES.md](../../SKELETON-GUIDELINES.md) for:
- Available skeleton components
- Best practices
- Creating custom skeletons
- Implementation examples

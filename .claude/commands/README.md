# Claude Commands

Custom slash commands for the Funnel Builder project.

## Core Principle

**🎯 Keep It Simple!**

- Don't overengineer solutions
- Start with the simplest approach that works
- Avoid premature optimization
- Prefer readable code over clever code
- Only add complexity when absolutely necessary
- Build the minimum viable solution first

## Available Commands

Type `/` in Claude Code to see all available commands:

- `/add-component` - Create new React components
- `/review-code` - Review code for quality
- `/fix-bug` - Debug and fix issues
- `/add-feature` - Add new features
- `/refactor` - Improve code quality
- `/optimize-performance` - Performance optimization

## Philosophy

All commands follow these principles:

1. **Simplicity First** - The simplest solution is usually the best
2. **YAGNI** - You Aren't Gonna Need It (don't build for future "maybes")
3. **Readable Over Clever** - Code is read more than written
4. **Iterative Development** - Build, test, improve
5. **Practical Over Perfect** - Working code beats perfect architecture
6. **⚠️ CTA Buttons** - ALL call-to-action buttons MUST have `cursor-pointer` and be fully functional unless explicitly instructed otherwise

## Examples

### Good (Simple)
```typescript
const [name, setName] = useState('');
```

### Bad (Overengineered)
```typescript
const nameState = useMemo(() =>
  createStateManager({
    initialValue: '',
    validators: [required, minLength(1)],
    transformers: [trim, capitalize],
    persistence: 'local',
  })
, []);
```

## Button/CTA Requirements

### ✅ ALWAYS Include:
```typescript
// Good - Has cursor-pointer and proper interaction states
<button
  className="cursor-pointer hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed"
  onClick={handleClick}
>
  Click Me
</button>
```

### ❌ NEVER Do:
```typescript
// Bad - Missing cursor-pointer, looks clickable but feels wrong
<button
  className="bg-emerald-500 text-white"
  onClick={handleClick}
>
  Click Me
</button>
```

**Note:** Our `<Button>` component already includes `cursor-pointer` by default. Always use it when possible!

## Remember

- If it's simple and works, ship it
- Refactor only when needed
- Optimize only when measured
- Abstract only when repeated 3+ times
- Comment the "why", not the "what"
- **ALL buttons must have `cursor-pointer` - no exceptions!**

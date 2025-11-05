# Claude Code Parallel Agents System

A comprehensive parallel agent architecture for the funnel builder application, enabling multiple specialized AI agents to work concurrently while maintaining code quality, consistency, and coordination.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Agent Roles](#agent-roles)
- [Quick Start](#quick-start)
- [Directory Structure](#directory-structure)
- [Custom Commands](#custom-commands)
- [Coordination System](#coordination-system)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This system enables **7 specialized AI agents** to work in parallel on the funnel builder codebase:

1. **React Architect** - Component architecture and SOLID principles
2. **Next.js Expert** - Performance optimization and full-stack concerns
3. **UI/UX Designer** - Design system and accessibility
4. **State Engineer** - Zustand store and state management
5. **Backend Engineer** - Supabase services and data layer
6. **Testing Agent** - TDD, unit, integration, and E2E tests
7. **DevOps Agent** - Build optimization and deployment

### Key Features

✅ **Parallel Development** - Multiple agents work simultaneously
✅ **SOLID Principles** - Enforced across all agents
✅ **TDD Workflow** - Test-Driven Development mandatory
✅ **Coordination** - `.claude-sync.md` prevents conflicts
✅ **Custom Commands** - Standardized workflows (`/add-component`, `/add-feature`, etc.)
✅ **Quality Gates** - Automated checks for coverage, bundle size, performance

---

## 👥 Agent Roles

### 1. React Architect (`architect`)
**Focus:** Component architecture, reusability, SOLID principles

**Responsibilities:**
- Create reusable components using `/add-component`
- Refactor existing components using `/refactor`
- Enforce SOLID principles (score 8+/10)
- Design props interfaces (max 10 props)
- Review component quality

**Key Metrics:**
- SOLID Compliance: ≥8/10
- Component Reusability: ≥8/10
- Code Duplication: <5%

**Prompt:** `.claude/prompts/react-architect.md`
**Config:** `.claude/agents/react-architect.json`

---

### 2. Next.js Expert (`nextjs`)
**Focus:** Performance, routing, SSR/SSG, API routes

**Responsibilities:**
- Optimize bundle size (<150KB gzipped)
- Implement dynamic imports for heavy components
- Configure caching strategies
- Optimize Core Web Vitals (LCP <1.5s, CLS: 0, FID <100ms)
- Design API routes

**Key Metrics:**
- Bundle Size: <150KB
- LCP: <1.5s
- FID: <100ms
- CLS: 0

**Prompt:** `.claude/prompts/nextjs-expert.md`
**Config:** `.claude/agents/nextjs-expert.json`

---

### 3. UI/UX Designer (`ui`)
**Focus:** Design system, accessibility, responsive design

**Responsibilities:**
- Create UI components using `/add-component`
- Maintain Tailwind CSS 4 design system
- Ensure WCAG 2.1 AA compliance (target AAA)
- Optimize for dark theme
- Ensure 44px minimum touch targets

**Key Metrics:**
- Accessibility Score: 100/100
- Touch Target Size: ≥44px
- Color Contrast: AAA
- Animation FPS: 60

**Prompt:** `.claude/prompts/ui-designer.md`
**Config:** `.claude/agents/ui-designer.json`

---

### 4. State Engineer (`state`)
**Focus:** Zustand store, undo/redo, auto-save

**Responsibilities:**
- Maintain EditorStore with history tracking
- Implement `addToHistory()` before mutations
- Optimize undo/redo memory (<10MB)
- Ensure 500ms auto-save debounce
- Prevent race conditions

**Key Metrics:**
- State Update: <16ms (60fps)
- Undo/Redo Memory: <10MB
- Auto-save Latency: <500ms

**Prompt:** `.claude/prompts/state-engineer.md`
**Config:** `.claude/agents/state-engineer.json`

---

### 5. Backend Engineer (`backend`)
**Focus:** Supabase services, database, API

**Responsibilities:**
- Maintain Repository Pattern for Supabase
- Implement RLS (Row Level Security)
- Optimize database queries (<100ms)
- Handle file uploads securely
- Create data migrations

**Key Metrics:**
- Query Performance: <100ms
- API Response: <200ms
- Error Rate: <0.1%

**Prompt:** `.claude/prompts/backend-engineer.md`
**Config:** `.claude/agents/backend-engineer.json`

---

### 6. Testing Agent (`testing`)
**Focus:** TDD, unit tests, integration tests, E2E

**Responsibilities:**
- Enforce TDD workflow (RED → GREEN → REFACTOR)
- Maintain >80% code coverage (components >90%, store 100%)
- Create E2E tests for critical paths
- Implement visual regression testing
- Ensure test reliability (>99.5%)

**Key Metrics:**
- Overall Coverage: ≥80%
- Component Coverage: ≥90%
- Store Coverage: 100%
- Critical Path Coverage: 100%

**Prompt:** `.claude/prompts/testing-agent.md`
**Config:** `.claude/agents/testing-agent.json`

---

### 7. DevOps Agent (`devops`)
**Focus:** Build optimization, deployment, monitoring

**Responsibilities:**
- Optimize build process (<2min)
- Implement error tracking (Sentry)
- Monitor performance metrics
- Enforce bundle size budgets
- Configure CI/CD pipeline

**Key Metrics:**
- Bundle Size: <150KB
- Build Time: <2min
- Uptime: >99.9%

**Prompt:** `.claude/prompts/devops-agent.md`
**Config:** `.claude/agents/devops-agent.json`

---

## 🚀 Quick Start

### Prerequisites

**Windows:**
- Windows Terminal (recommended): `winget install Microsoft.WindowsTerminal`
- PowerShell 7+: `winget install Microsoft.PowerShell`

**macOS/Linux:**
- tmux: `brew install tmux` (macOS) or `apt install tmux` (Linux)
- bash

### Launch All Agents

**Windows (PowerShell):**
```powershell
.\launch-all-agents.ps1
```

**macOS/Linux (bash):**
```bash
chmod +x launch-all-agents.sh
./launch-all-agents.sh
```

This will:
1. Create separate tabs/windows for each agent
2. Display agent initialization info
3. Show relevant prompt excerpts
4. Ready for task assignment

### Manual Agent Launch

You can also launch agents individually by reading their prompts:

```bash
# Read the React Architect prompt
cat .claude/prompts/react-architect.md

# Then work as that agent, following the instructions
```

---

## 📁 Directory Structure

```
.claude/
├── README.md                    # This file
├── commands/                    # Custom slash commands
│   ├── add-component.md        # Component creation workflow
│   ├── add-feature.md          # TDD feature workflow (RED→GREEN→REFACTOR)
│   ├── fix-bug.md              # Systematic bug fixing
│   ├── optimize-performance.md # Performance optimization
│   ├── refactor.md             # Code improvement workflow
│   └── review-code.md          # Code quality checklist
├── prompts/                     # Individual agent prompts
│   ├── react-architect.md
│   ├── nextjs-expert.md
│   ├── ui-designer.md
│   ├── state-engineer.md
│   ├── backend-engineer.md
│   ├── testing-agent.md
│   └── devops-agent.md
└── agents/                      # Agent configurations (JSON)
    ├── react-architect.json
    ├── nextjs-expert.json
    ├── ui-designer.json
    ├── state-engineer.json
    ├── backend-engineer.json
    ├── testing-agent.json
    └── devops-agent.json

# Root level
.claude-sync.md                  # Coordination and state tracking
launch-all-agents.sh             # Launch script (Unix/macOS)
launch-all-agents.ps1            # Launch script (Windows)
```

---

## 🛠️ Custom Commands

All agents use standardized workflows via custom commands:

### `/add-component`
**Used by:** React Architect, UI/UX Designer

Creates a new reusable component following best practices:
- Proper file structure
- Type-safe props interfaces
- Consistent patterns
- Documentation
- Tests

**Workflow:**
1. Define component interface
2. Create component file
3. Implement rendering
4. Add tests
5. Document usage

---

### `/add-feature` (TDD Workflow)
**Used by:** ALL agents

Test-Driven Development workflow for new features:

**RED → GREEN → REFACTOR cycle:**

1. **🔴 RED:** Write failing test first
2. **🟢 GREEN:** Write minimal code to pass
3. **🔧 REFACTOR:** Improve code quality
4. **✅ VERIFY:** Test still passes

**Example:**
```typescript
// 1. RED - Write failing test
it('should duplicate widget', () => {
  store.duplicateWidget('1');
  expect(store.getWidgets()).toHaveLength(2);
});
// Test fails ✅

// 2. GREEN - Implement minimal code
duplicateWidget: (id) => {
  const widget = get().getWidget(id);
  get().addWidget({ ...widget, id: generateId() });
};
// Test passes ✅

// 3. REFACTOR - Improve
duplicateWidget: (id) => {
  const widget = get().getWidget(id);
  if (!widget) return;
  const duplicate = createDuplicateWidget(widget);
  get().addWidget(duplicate);
};
// Test still passes ✅
```

---

### `/fix-bug`
**Used by:** ALL agents

Systematic bug fixing approach:
1. Reproduce bug with failing test
2. Fix implementation
3. Verify test passes
4. Add regression test

---

### `/optimize-performance`
**Used by:** Next.js Expert, DevOps Agent

Performance optimization workflow:
1. Measure baseline metrics
2. Identify bottleneck
3. Implement optimization
4. Measure improvement
5. Document results

---

### `/refactor`
**Used by:** React Architect, State Engineer

Code improvement without changing behavior:
1. Ensure tests exist and pass
2. Refactor code
3. Verify tests still pass
4. Document changes

---

### `/review-code`
**Used by:** ALL agents

Code quality and pattern review:
- SOLID compliance
- Test coverage
- Performance impact
- Security issues
- Best practices

---

## 🔄 Coordination System

### `.claude-sync.md` - The Central Coordination File

This file is the **single source of truth** for agent coordination.

**Key Sections:**

#### 🔒 Active File Locks
Prevents conflicts when multiple agents modify the same files.

**Protocol:**
```markdown
## Active File Locks
| File | Agent | Locked At | ETA | Status |
|------|-------|-----------|-----|--------|
| src/lib/store.ts | state-engineer | 10:15 | 10:45 | 🔄 In Progress |
```

**Rules:**
1. Check for locks BEFORE modifying files
2. Add your lock entry when starting work
3. Remove lock when done
4. Respect other agents' locks

---

#### 📝 Recent Changes
Log significant changes for team awareness.

**Example:**
```markdown
## Recent Changes (Last 4 Hours)
| Time | Agent | Change | Impact |
|------|-------|--------|--------|
| 10:30 | react-architect | Refactored HeaderBlock to use composition | All block components |
| 11:15 | ui-designer | Added skeleton loading components | Loading states |
```

---

#### ⚠️ Breaking Changes Queue
Communicate breaking changes BEFORE implementation.

**Process:**
1. Add to queue with status PROPOSED
2. Change status to IN_PROGRESS when starting
3. Notify affected agents
4. Change to MERGED when complete

---

#### 📊 Performance Metrics
Track and update metrics continuously.

**Example:**
```markdown
## Performance Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Bundle | 142KB | <150KB | ✅ |
| LCP | 1.3s | <1.5s | ✅ |
```

---

#### 🎯 Component Reusability Tracker
Monitor component quality and reusability.

---

#### 📐 SOLID Compliance Score
Track architectural quality across the codebase.

---

### Coordination Workflow

**Before Starting Work:**
1. ✅ Read `.claude-sync.md` completely
2. ✅ Check Active File Locks
3. ✅ Review Breaking Changes Queue
4. ✅ Lock files you'll modify

**During Work:**
1. ✅ Update progress in Recent Changes
2. ✅ Log metrics in Performance Metrics
3. ✅ Note any issues in Incidents & Blockers

**After Completing Work:**
1. ✅ Remove file locks
2. ✅ Update relevant metrics
3. ✅ Log win in Wins & Celebrations
4. ✅ Run quality checks

---

## 💡 Usage Examples

### Example 1: Adding a New Block Type (Multi-Agent)

**Agents Involved:** React Architect, UI/UX Designer, Testing Agent

**React Architect:**
```bash
# 1. Read coordination file
cat .claude-sync.md

# 2. Lock files
# Add to .claude-sync.md:
# src/types/index.ts - react-architect - 10:00 - 10:30

# 3. Use /add-component workflow
# Follow prompts/react-architect.md instructions

# 4. Create block interface and component
# 5. Update BlockRenderer
# 6. Remove locks
```

**UI/UX Designer:**
```bash
# 1. Check locks (wait for architect to finish types)
# 2. Lock styling files
# 3. Create block styles in Tailwind
# 4. Ensure accessibility
# 5. Update design tokens if needed
```

**Testing Agent:**
```bash
# 1. Use /add-feature TDD workflow
# 2. Write failing tests (RED)
# 3. Coordinate with architect for implementation (GREEN)
# 4. Refactor tests (REFACTOR)
# 5. Add E2E test for new block
```

---

### Example 2: Performance Optimization (Single Agent)

**Agent:** Next.js Expert

```bash
# 1. Read prompts/nextjs-expert.md
# 2. Run /optimize-performance command
# 3. Measure baseline
npm run build
# Bundle: 165KB (over target!)

# 4. Identify bottleneck
ANALYZE=true npm run build
# Heavy component: 60KB

# 5. Implement dynamic import
# 6. Measure improvement
npm run build
# Bundle: 140KB ✅

# 7. Update .claude-sync.md metrics
# 8. Log win
```

---

### Example 3: Bug Fix with Multiple Agents

**Primary:** Testing Agent
**Support:** React Architect, Backend Engineer

**Testing Agent:**
```bash
# 1. Use /fix-bug workflow
# 2. Write failing test that reproduces bug
it('should handle empty funnel', () => {
  // Test fails - reproduces bug
});

# 3. Coordinate with relevant agent for fix
```

**React Architect or Backend Engineer:**
```bash
# 1. Fix implementation
# 2. Verify test passes
# 3. Add regression test
```

---

## 🎯 Best Practices

### 1. Always Read CLAUDE.md First
Every agent must understand the complete system before starting work.

### 2. Use Custom Commands Religiously
- `/add-component` for components
- `/add-feature` for features (TDD!)
- `/fix-bug` for bugs
- `/optimize-performance` for optimization
- `/refactor` for improvements
- `/review-code` before commits

### 3. Follow TDD Workflow
RED → GREEN → REFACTOR is mandatory for all new features.

### 4. Check Coordination File
`.claude-sync.md` is the single source of truth. Check it before, during, and after work.

### 5. Lock Files to Prevent Conflicts
Always lock files you're modifying to prevent race conditions.

### 6. Maintain SOLID Principles
Every change should improve or maintain the SOLID score (target: 8+/10).

### 7. Update Metrics Continuously
Keep performance metrics, test coverage, and quality scores current.

### 8. Communicate Breaking Changes
Use the Breaking Changes Queue to warn other agents.

### 9. Create Only Reusable Components
Everything should be designed for reuse across the application.

### 10. Test Before Pushing
Run tests, linting, and build before considering work complete.

---

## 🔧 Troubleshooting

### Issue: Agent prompts are too long

**Solution:** Focus on the relevant sections:
- Initialization Checklist
- Your Primary Focus
- Command Workflows
- Critical Responsibilities
- Current Tasks

### Issue: File conflicts between agents

**Solution:**
1. Use the file locking system in `.claude-sync.md`
2. Communicate via Recent Changes
3. Coordinate timing of related changes

### Issue: Metrics are out of date

**Solution:**
1. Run relevant commands:
   ```bash
   npm test -- --coverage  # Test coverage
   npm run build           # Bundle size
   npx lighthouse ...      # Performance
   ```
2. Update `.claude-sync.md` with latest numbers

### Issue: Don't know which agent to use

**Solution:** Use this decision tree:
- **Component work?** → React Architect
- **Performance?** → Next.js Expert or DevOps
- **UI/Styling?** → UI/UX Designer
- **State updates?** → State Engineer
- **Data/API?** → Backend Engineer
- **Tests?** → Testing Agent
- **Build/Deploy?** → DevOps Agent

### Issue: Unsure about SOLID compliance

**Solution:**
1. Review the SOLID section in your agent prompt
2. Run `/review-code` checklist
3. Coordinate with React Architect for guidance

---

## 📊 Success Metrics

### System-Wide Targets
- ✅ SOLID Compliance: ≥8/10
- ✅ Test Coverage: ≥80% overall
- ✅ Bundle Size: <150KB gzipped
- ✅ LCP: <1.5s
- ✅ CLS: 0
- ✅ FID: <100ms
- ✅ Build Time: <2min
- ✅ Component Reusability: ≥8/10

### Agent-Specific Targets
See individual agent prompt files for detailed metrics.

---

## 🎓 Additional Resources

- **Project Overview:** `CLAUDE.md` (root)
- **Custom Commands:** `.claude/commands/`
- **Agent Prompts:** `.claude/prompts/`
- **Agent Configs:** `.claude/agents/`
- **Coordination:** `.claude-sync.md`

---

## 🤝 Contributing to the Agent System

### Adding a New Agent

1. Create prompt file in `.claude/prompts/`
2. Create config file in `.claude/agents/`
3. Update launch scripts
4. Add to this README
5. Update `.claude-sync.md` coordination sections

### Modifying Agent Responsibilities

1. Update prompt file
2. Update config file
3. Notify other agents via `.claude-sync.md`
4. Update this README

---

**Remember:** This system enables true parallel development while maintaining code quality. Each agent has deep specialization but full codebase awareness. Use the coordination mechanisms to work together seamlessly.

**Your collective mantra:** "Specialize. Coordinate. Deliver. Repeat."

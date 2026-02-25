# Project Instructions

## Core Principle #1: Delegate to Sub-Agents (Avoid Context Overflow)

**ALWAYS use sub-agents (Task tool) instead of executing directly in the main session, even for serial/sequential tasks.** This prevents context overflow and keeps the main session lightweight.

### Why Sub-Agents Over Direct Execution?

| Main Session | Sub-Agent |
|--------------|-----------|
| Context accumulates with every action | Context isolated and discarded after completion |
| Large code reads bloat memory | Code stays in agent's isolated context |
| Risk of hitting context limits | Main session stays clean and responsive |
| Hard to track what's relevant | Clear task boundaries |

### Mandatory Sub-Agent Usage

**ALWAYS delegate to sub-agents when:**
- Reading more than 2-3 files
- Any multi-step task (3+ steps)
- Code exploration or research
- File modifications that require reading context first
- Running tests or build commands
- Any task that generates substantial output

**Only execute directly in main session when:**
- Reading 1-2 small files for quick reference
- Simple, single-step operations (e.g., one Edit call)
- User explicitly requests direct execution

### Sub-Agent Strategy for Serial Tasks

Even when tasks must be done serially (B depends on A), use sub-agents to keep the main session clean:

```
❌ Direct in main session:
  Read file A → Process A → Read file B → Process B → Context overflow

✅ Sub-agent delegation:
  Agent 1: Read and process file A → Return summary only
  Agent 2: Read and process file B (with context from Agent 1's summary) → Return summary only
  Main session: Only stores summaries, not full file contents
```

### What to Keep vs Delegate

| Keep in Main Session | Delegate to Sub-Agent |
|---------------------|----------------------|
| Task planning and orchestration | File reads and analysis |
| Final decisions and confirmations | Code exploration |
| User communication | Multi-file modifications |
| High-level summaries | Test execution |
| Task status tracking | Build/deploy operations |

---

## Core Principle #2: Maximize Parallel Execution

**When delegating to sub-agents, maximize parallel execution for independent work.** Before launching tasks, strategize and identify opportunities for parallelization.

### Before Acting - Always Strategize

1. **Analyze Dependencies**: Map out which tasks depend on others vs which can run independently
2. **Identify Parallelizable Work**: Look for tasks that don't share resources or modify the same files
3. **Plan Resource Isolation**: Ensure parallel tasks operate on non-overlapping files/components
4. **Execute in Batches**: Group independent tasks and launch them simultaneously

### When to Use Parallel Agents

**Use parallel sub-agents (Task tool) when:**
- Searching for multiple independent pieces of information
- Reading multiple unrelated files
- Running unit or integration tests for different parts of the codebase
- Analyzing different components or modules
- Any tasks that don't modify shared state

**Note:** E2E tests should always run sequentially (still using sub-agents) to avoid browser/resource conflicts.

**Launch sequentially (but still as sub-agents) when:**
- Tasks have direct dependencies (Task B needs Task A's output)
- Modifying the same file(s)
- Operations that affect shared state (git operations, database changes)
- One task's success determines whether another should run

### Conflict Avoidance Checklist

Before launching parallel tasks, verify:
- [ ] Each task targets different files/directories
- [ ] No task depends on another's output
- [ ] Shared resources (if any) are read-only for all tasks
- [ ] Git operations are isolated or sequential

### Parallelization Patterns

**Pattern 1: Parallel Research & Exploration**
```
❌ Sequential: Search file A → Read file A → Search file B → Read file B
✅ Parallel: Launch 2 agents simultaneously:
  - Agent 1: Search and analyze component A
  - Agent 2: Search and analyze component B
```

**Pattern 2: Parallel File Analysis**
```
❌ Sequential: Read config.js → Read package.json → Read tsconfig.json
✅ Parallel: Read all 3 files in single message with multiple Read calls
```

**Pattern 3: Test Execution**
```
✅ Unit tests & integration tests: Run in parallel (if they don't share state)
✅ E2E tests: Run sequentially using sub-agents to avoid resource conflicts
```

**Pattern 4: Mixed Sequential + Parallel**
```
✅ Strategic approach:
  Batch 1 (Parallel): Read PRD.md, Read DESIGN.md, Explore codebase
  Batch 2 (Sequential): Generate implementation plan (depends on Batch 1)
  Batch 3 (Parallel): Implement feature A, Implement feature B (non-overlapping)
```

---

## Sub-Agent Types & Usage

| Agent Type | Best For | Parallel Safe? |
|------------|----------|----------------|
| `Explore` | Codebase exploration, finding patterns | Yes - different search targets |
| `general-purpose` | Complex multi-step tasks | Yes - if isolated scope |
| `Bash` | Command execution | Caution - watch for shared resources |
| `Plan` | Architecture planning | No - typically singular task |

---

## Practical Rules

1. **Sub-Agent First**: Default to using Task tool for any non-trivial work
2. **Summarize, Don't Hoard**: Sub-agents return summaries, not full content, to main session
3. **Single Response, Multiple Agents**: Launch multiple sub-agents in one response for parallel work
4. **Batch Independent Reads**: Within a sub-agent, read multiple files at once
5. **Isolated Scope**: Give each sub-agent a clear, non-overlapping scope
6. **Strategize First**: Take 10 seconds to plan before launching work
7. **Main Session is Orchestrator**: Keep main session focused on planning, delegation, and user communication

---

## Project-Specific Notes

<!-- Add project-specific conventions and patterns here as they are discovered -->

---

**Remember:**
1. **Delegate first** - "Should this be a sub-agent?" (Almost always: Yes)
2. **Parallelize second** - "What can run in parallel?" (When tasks are independent)
3. **Summarize returns** - Keep main session context light

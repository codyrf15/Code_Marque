# MVP: AI Workflow Orchestrator 

## 🎯 **Minimum Viable Product - Core Features Only**

Build this in **2-3 days** to test the core concept before building the full system.

---

## 🚀 **MVP Workflow (Simplified)**

### **Basic Flow:**
```
1. User → Cursor: "Implement auth system"
2. Cursor → Orchestrator: initiate_workflow(request)
3. Orchestrator: Holds Cursor context, delegates work 
4. Cursor: Does work, sends result to orchestrator
5. Orchestrator → Review Gate: Show result with routing options
6. User: Chooses "Send to Claude for testing" 
7. Orchestrator → Claude: Routes with full context
8. Claude: Receives work + context, continues
```

---

## 🔧 **MVP MCP Tools (Essential Only)**

### **Core Tools:**
```typescript
// Workflow initiation (Cursor calls this)
- initiate_workflow(request: string, workType: string)
  Returns: session_id, hold_context_promise

// Work completion (Cursor calls this) 
- complete_work(session_id: string, result: string)
  Triggers: Review gate with routing options

// Route decision (After user review)
- route_workflow(session_id: string, destination: string, context?: string)
  Routes to: claude-code | cursor-ai | complete

// Status check (Any AI can call)
- get_workflow_status(session_id: string)
  Returns: current state and next actions
```

### **MVP Data Structure:**
```typescript
interface WorkflowSession {
  id: string;
  status: 'waiting' | 'reviewing' | 'completed';
  originalRequest: string;
  workType: string;
  workResult?: string;
  cursorContextHeld: boolean;
  createdAt: string;
}
```

---

## 💡 **Key MVP Features**

### **1. Context Holding**
```typescript
// Hold Cursor call open with timeout
const holdContext = async (sessionId: string) => {
  return new Promise((resolve) => {
    // Store resolve function for later use
    heldContexts.set(sessionId, resolve);
    
    // Timeout after 10 minutes
    setTimeout(() => {
      if (heldContexts.has(sessionId)) {
        heldContexts.delete(sessionId);
        resolve({ timeout: true });
      }
    }, 600000);
  });
};
```

### **2. Review Gate Integration**
```typescript
// Simple review with routing options
const triggerReview = async (session: WorkflowSession) => {
  const result = await reviewGate({
    title: `Work Complete: ${session.workType}`,
    message: session.workResult,
    options: [
      { label: "Send to Claude Code", value: "claude-code" },
      { label: "Send back to Cursor", value: "cursor-ai" },
      { label: "Complete workflow", value: "complete" }
    ]
  });
  
  return result.choice;
};
```

### **3. Simple Routing**
```typescript
const routeWorkflow = async (sessionId: string, destination: string) => {
  const session = sessions.get(sessionId);
  
  switch (destination) {
    case 'claude-code':
      // Send to Claude with context
      await sendToClaudeCode(session);
      break;
    case 'cursor-ai': 
      // Resume Cursor context
      resumeCursorContext(sessionId, session.workResult);
      break;
    case 'complete':
      // Complete and cleanup
      completeWorkflow(sessionId);
      break;
  }
};
```

---

## 🏗️ **MVP Implementation Steps**

### **Day 1: Core Infrastructure**
1. Create basic MCP server with 4 essential tools
2. Simple in-memory session storage
3. Context holding mechanism with timeouts
4. Basic review gate integration

### **Day 2: Routing & Integration** 
1. Implement routing logic
2. Test with existing review gate MCP
3. Integration with Claude Code session
4. Basic error handling

### **Day 3: Testing & Refinement**
1. End-to-end workflow testing
2. Debug context holding issues
3. Refine review gate UI
4. Document usage patterns

---

## 🧪 **MVP Testing Scenarios**

### **Test 1: Basic Implementation Workflow**
```bash
# Cursor AI
initiate_workflow("Create a simple calculator", "implementation")
# → Returns session_abc123, holds context

# User works, then:
complete_work("session_abc123", "Calculator implemented with add/subtract/multiply/divide")
# → Triggers review gate

# User chooses "Send to Claude for testing"
# → Routes to Claude Code with full context
```

### **Test 2: Back-and-Forth Iteration**
```bash
# Claude receives implementation
# Tests and finds issues
route_workflow("session_abc123", "cursor-ai", "Found bug in division by zero handling")
# → Cursor receives feedback and can fix
```

---

## 📁 **MVP File Structure**
```
ai-workflow-orchestrator/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── workflow-manager.ts   # Session management
│   ├── context-holder.ts     # Cursor context holding
│   └── router.ts             # Simple routing logic
├── dist/                     # Compiled output
├── .ai-workflows/            # Session storage
│   └── sessions/
└── package.json
```

---

## ⚡ **MVP Success Criteria**

### **Must Work:**
- ✅ Cursor can initiate workflow and have context held
- ✅ Work completion triggers review gate 
- ✅ User can choose routing destination
- ✅ Claude receives work with full context
- ✅ Session state persists during workflow

### **Performance:**
- ✅ Context holding works for 10+ minutes
- ✅ Review gate responds within 2 seconds
- ✅ Zero context loss during handoffs
- ✅ Clean error handling for timeouts

---

## 🎯 **Next Steps After MVP**

If the MVP proves the concept works:

1. **Add intelligent auto-routing** based on work type
2. **Integrate with your delegation system** 
3. **Enhanced review templates** for different work types
4. **Workflow analytics** and monitoring
5. **Multiple concurrent workflows**
6. **Advanced context preservation**

---

**This MVP validates the core concept in 2-3 days and provides the foundation for the full orchestration system!** 🚀

### **Should we start building the MVP? Which component would you like to tackle first?** 
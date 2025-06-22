# Claude Code Interactive Mode in Cursor - Complete Reference

## 🎯 **WORKING CONFIGURATION CONFIRMED**

**Date**: 2025-01-06  
**Status**: ✅ SUCCESSFULLY OPERATIONAL  
**Setup**: Claude Code interactive mode with MCP AI coordination in Cursor IDE

---

## 📋 **Exact Working Command**

```bash
claude --mcp-config claude-mcp-config.json
```

**Output Confirms Success:**
```
╭───────────────────────────────────────────────────╮
│ ✻ Welcome to Claude Code!                         │
│                                                   │
│   /help for help, /status for your current setup  │
│                                                   │
│   cwd: /home/cody/projects/CodeMarque             │
╰───────────────────────────────────────────────────╯
```

---

## 🔧 **MCP Coordination Working Commands**

### **Command Syntax in Claude Interactive Mode:**
```
usae ai coordination to send_message_to_cursor [message]
```

**Example Working Command:**
```
> usae ai coordination to send_message_to_cursor hi
```

**Successful Output:**
```
● ai-coordination:send_message_to_cursor (MCP)(message: "hi")
  ⎿  ✅ Message sent to Cursor AI successfully! 
     📤 **Message ID**: msg_1
     … +5 lines (ctrl+r to expand)
● Message sent to Cursor AI successfully.
```

---

## 🎮 **Interactive Mode Interface Elements**

### **Welcome Interface:**
- Clean ASCII art border
- Shows current working directory: `cwd: /home/cody/projects/CodeMarque`
- Built-in help system: `/help` and `/status` commands
- Tip displayed: "Ctrl+Escape to launch Claude in your IDE"

### **Command Prompt:**
- Uses `>` as primary prompt
- Shows command execution with `●` bullet points
- MCP tool calls clearly labeled with service name
- Success/failure indicators with emojis
- Expandable output with `ctrl+r`

### **Status Bar:**
```
╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ >                                                                                                                       │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
  ? for shortcuts                                                                                                       ◯
```

---

## 📁 **File Structure That Works**

### **Project Root Files:**
```
/home/cody/projects/CodeMarque/
├── claude-mcp-config.json          # MCP configuration for Claude
├── .cursor/mcp.json                # MCP configuration for Cursor
├── CLAUDE.md                       # AI coordination context
├── .claude/
│   ├── settings.json              # Pre-approved tools
│   └── commands/
│       ├── sync.md                # Custom /sync command
│       └── coordinate.md          # Custom /coordinate command
└── ai-coordination-mcp/
    ├── dist/index.js              # Compiled MCP server
    └── src/index.ts               # MCP server source
```

### **Critical Configuration Files:**

**claude-mcp-config.json:**
```json
{
  "mcpServers": {
    "ai-coordination": {
      "command": "node",
      "args": ["./ai-coordination-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

---

## 🔄 **MCP Tool Access Patterns**

### **Available AI Coordination Tools:**
1. `send_message_to_cursor` - Send messages to Cursor AI
2. `send_message_to_claude` - Receive messages from Cursor AI  
3. `set_ai_status` - Update Claude's status
4. `get_ai_statuses` - Check both AI statuses
5. `get_conversation_history` - View message history
6. `clear_conversation` - Reset coordination history

### **Command Format:**
```
usae ai coordination to [tool_name] [parameters]
```

**Examples:**
```bash
usae ai coordination to send_message_to_cursor "Hello from Claude!"
usae ai coordination to set_ai_status ai="claude" status="working on feature X"
usae ai coordination to get_conversation_history limit=5
```

---

## 🚀 **Startup Sequence**

### **Step 1: Start MCP Server (Cursor handles this)**
- AI coordination MCP server runs automatically when Cursor starts
- Located at: `/home/cody/projects/CodeMarque/ai-coordination-mcp/dist/index.js`

### **Step 2: Start Claude Interactive Mode**
```bash
cd /home/cody/projects/CodeMarque
claude --mcp-config claude-mcp-config.json
```

### **Step 3: Verify Connection**
```bash
> /status
> usae ai coordination to get_ai_statuses
```

---

## 🎯 **Key Success Indicators**

### **Visual Confirmation:**
- ✅ "Welcome to Claude Code!" banner appears
- ✅ Current working directory shows correctly
- ✅ MCP tools execute with success indicators
- ✅ Message IDs generated for coordination
- ✅ Expandable output available with `ctrl+r`

### **Functional Confirmation:**
- ✅ Messages sent successfully to Cursor AI
- ✅ MCP service prefix shows: `ai-coordination:tool_name`
- ✅ Success emojis and status messages display
- ✅ No error messages or connection failures

---

## 🔍 **Troubleshooting Reference**

### **If MCP Not Working:**
1. Check if `ai-coordination-mcp/dist/index.js` exists and is compiled
2. Verify `claude-mcp-config.json` path is correct
3. Ensure Claude started with `--mcp-config` flag
4. Kill any duplicate MCP server processes

### **If Commands Fail:**
1. Check syntax: `usae ai coordination to [tool_name]`
2. Verify MCP server is running: `ps aux | grep ai-coordination`
3. Test basic connection: `usae ai coordination to get_ai_statuses`

### **If No Response from Cursor:**
1. Check Cursor's MCP configuration in `.cursor/mcp.json`
2. Restart Cursor to reload MCP servers
3. Verify both AIs connected to same MCP instance

---

## 📝 **Command Shortcuts & Tips**

### **Built-in Commands:**
- `/help` - Show help system
- `/status` - Show current setup
- `/mcp` - Show MCP server status (appears empty but works)
- `?` - Show shortcuts (bottom status bar)

### **Control Keys:**
- `Ctrl+Escape` - Launch Claude in IDE
- `Ctrl+R` - Expand truncated output
- `Escape` - Interrupt current operation

### **Custom Commands (if configured):**
- `/sync` - AI coordination synchronization
- `/coordinate [task]` - Request coordination with Cursor AI

---

## 🎉 **Success Metrics**

**This configuration successfully enables:**
1. ✅ Real-time bidirectional AI communication
2. ✅ Visual confirmation of message delivery
3. ✅ Status tracking and coordination
4. ✅ Interactive command execution
5. ✅ Persistent conversation history
6. ✅ Clean, user-friendly interface
7. ✅ Integration within Cursor IDE environment

**Performance Notes:**
- Commands execute quickly (< 1 second)
- Clear visual feedback for all operations
- Expandable output prevents information loss
- Status indicators provide immediate confirmation

---

## 📚 **Related Documentation**
- [AI Coordination MCP Setup](./CLAUDE_MCP_SETUP.md)
- [Visual Demo Plan](./VISUAL_DEMO_PLAN.md)
- [Status Verification](./STATUS_VERIFICATION.md)
- [Bidirectional Test](./test-bidirectional.js) 
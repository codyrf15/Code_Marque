# 🚀 AI Coordination MCP Server Setup Guide

## ✅ **What We've Verified**

Our comprehensive tests confirm:
- ✅ **All 6 MCP tools working perfectly**
- ✅ **Real-time message routing** between AIs
- ✅ **Priority levels** (urgent/high/medium/low)
- ✅ **Status tracking** for both AIs
- ✅ **Conversation history** management
- ✅ **Console logging** for live monitoring

## 🏗️ **How It Works**

### **Architecture:**
```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Cursor AI  │◄──►│ MCP Server       │◄──►│  Claude-Code    │
│             │    │ (TypeScript)     │    │                 │
│ MCP Client  │    │ - Message Queue  │    │ MCP Client      │
│             │    │ - Status Track   │    │                 │
└─────────────┘    │ - Live Console   │    └─────────────────┘
                   └──────────────────┘
```

### **Message Flow:**
1. **Cursor sends message** → `send_message_to_claude`
2. **MCP Server logs** → Console shows live conversation
3. **Claude-Code receives** → Message available immediately
4. **Status updates** → Both AIs can track each other's status

## 📦 **Installation Steps**

### **1. Start MCP Server**
```bash
cd ai-coordination-mcp
npm install  # (already done)
npm run build  # (already done)
npm start
```

### **2. Configure Cursor**
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "ai-coordination": {
      "command": "node",
      "args": ["/home/cody/projects/CodeMarque/ai-coordination-mcp/dist/index.js"],
      "env": {}
    },
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"],
      "env": {}
    }
  }
}
```

### **3. Configure Claude-Code**
Add to Claude-Code's MCP configuration:
```json
{
  "mcpServers": {
    "ai-coordination": {
      "command": "node", 
      "args": ["/home/cody/projects/CodeMarque/ai-coordination-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## 🛠️ **Available MCP Tools**

### **For Both AIs:**
- `send_message_to_claude` - Send messages to Claude-Code
- `send_message_to_cursor` - Send messages to Cursor AI
- `get_conversation_history` - View message history
- `set_ai_status` - Update your AI status
- `get_ai_statuses` - Check both AIs' current status
- `clear_conversation` - Clear message history (with confirmation)

## 🧪 **Testing & Verification**

### **Run Tests:**
```bash
# Basic functionality test
node test-server.js

# Comprehensive test (all 6 tools)
node comprehensive-test.js
```

### **Expected Output:**
```
🚀 AI Coordination MCP Server started - Ready for real-time AI communication!
[2025-06-18T02:54:12.019Z] 🔧 CURSOR → CLAUDE [HIGH]: Hello Claude! This is a test
[2025-06-18T02:54:12.525Z] 🤖 CLAUDE → CURSOR [MEDIUM]: Hello Cursor! This is a test
[2025-06-18T02:54:13.033Z] 📊 CURSOR STATUS: working
```

## 💡 **Usage Examples**

### **Cursor AI → Claude-Code:**
```javascript
// MCP Tool Call
{
  "name": "send_message_to_claude",
  "arguments": {
    "message": "Please handle the database migration for Task 5.2",
    "priority": "high"
  }
}
```

### **Status Updates:**
```javascript
{
  "name": "set_ai_status", 
  "arguments": {
    "ai_name": "cursor",
    "status": "working",
    "current_task": "Implementing authentication system"
  }
}
```

## 🔧 **Monitoring**

### **Live Console Monitoring:**
The server provides real-time logging:
- 🔧 **Message routing** with timestamps
- 📊 **Status changes** for both AIs
- 🚀 **Server lifecycle** events

### **Message History:**
```javascript
{
  "name": "get_conversation_history",
  "arguments": {
    "limit": 20,
    "ai_filter": "cursor"  // Optional: filter by sender
  }
}
```

## 🚨 **Troubleshooting**

### **Server Not Starting:**
- Check Node.js version (16+ required)
- Verify `npm run build` completed successfully
- Ensure no port conflicts

### **MCP Connection Issues:**
- Verify absolute paths in MCP config
- Check server is running before starting AIs
- Review MCP client logs

### **Message Not Received:**
- Check console logs for routing confirmation
- Verify both AIs connected to same server
- Use `get_conversation_history` to debug

## ✨ **Next Steps**

1. **Start the server** in background: `npm start &`
2. **Configure both AIs** with MCP settings
3. **Test communication** using the tools
4. **Monitor console** for live activity
5. **Begin coordinated development!**

---

**🎯 Your streamlined AI coordination system is ready!** 
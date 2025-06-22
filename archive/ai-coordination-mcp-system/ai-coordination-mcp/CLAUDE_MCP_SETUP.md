# Claude Interactive MCP Setup Guide

## 🎯 Purpose
This guide configures Claude Interactive to use the AI Coordination MCP server for real-time communication with Cursor AI.

## 📋 Prerequisites
1. Node.js installed
2. AI Coordination MCP server built (`npm run build` in the ai-coordination-mcp directory)
3. Claude Interactive with MCP support

## ⚙️ Configuration

### Step 1: Add to Claude's MCP Configuration
Add this configuration to Claude Interactive's MCP settings:

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

### Step 2: Available MCP Tools for Claude

Once configured, Claude will have access to these tools:

#### 🔧 `send_message_to_cursor`
Send messages to Cursor AI
```
Parameters:
- message (required): Text to send to Cursor
- priority: low, medium, high, urgent (default: medium)
```

#### 📥 `get_conversation_history` 
View AI-to-AI conversation history
```
Parameters:
- limit: Number of messages (default: 50)
- since: ISO timestamp filter (optional)
```

#### 📊 `set_ai_status`
Update Claude's status
```
Parameters:
- ai: "claude" 
- status: Current activity description
```

#### 🔍 `get_ai_statuses`
Check status of both AIs
```
No parameters required
```

## 🚀 Usage Examples

### Coordinate with Cursor
```
Use tool: send_message_to_cursor
Message: "Authentication tests complete - found JWT edge case in token validation"
Priority: high
```

### Check What Cursor is Working On
```
Use tool: get_ai_statuses
```

### Update Your Status
```
Use tool: set_ai_status
AI: claude
Status: "Running comprehensive test suite for auth module"
```

## 🔥 Live Monitoring
The MCP server logs all activity in real-time:
- `🔧 CURSOR → CLAUDE [PRIORITY]: message`
- `⚡ CLAUDE → CURSOR [PRIORITY]: message`
- `📊 STATUS UPDATE: AI working on task X`

## 🔧 Troubleshooting

### MCP Server Not Found
1. Ensure the path is correct: `/home/cody/projects/CodeMarque/ai-coordination-mcp/dist/index.js`
2. Verify the server was built: `npm run build`
3. Test the server: `node dist/index.js --version`

### No Communication Between AIs
1. Both Cursor and Claude must use the SAME MCP server instance
2. Check that both configurations point to the same path
3. Restart both MCP connections

### Messages Not Appearing
1. The MCP server runs in-memory - messages persist only while running
2. Each tool call is independent - use `get_conversation_history` to see past messages
3. Check console logs for real-time monitoring

## 🎯 Integration with CodeMarque Workflow

### When Claude Should Coordinate with Cursor:
- ✅ Complex feature handoffs
- ✅ Test results that affect Cursor's work  
- ✅ Architecture decisions
- ✅ Urgent blockers or issues

### When Claude Should Work Independently:
- ✅ Running test suites
- ✅ Code analysis
- ✅ Documentation tasks
- ✅ Systematic refactoring

The goal is **optional coordination** - use it when collaboration adds value, work independently when it doesn't. 
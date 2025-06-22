# AI Coordination System

This directory contains JSON files used for coordination between Cursor AI and Claude Code.

## Directory Structure

- `ai-status.json` - Current status of both AIs
- `messages/` - AI-to-AI communication
  - `cursor-to-claude/` - Messages from Cursor AI to Claude Code
  - `claude-to-cursor/` - Messages from Claude Code to Cursor AI
- `handoffs/` - Formal work handoff documentation
  - `active/` - Current handoffs requiring attention
  - `completed/` - Archived completed handoffs

## Usage

Both AIs should:
1. **Check this directory before starting work** - read status and messages
2. **Update ai-status.json** when starting/completing tasks
3. **Create messages** when coordination is needed
4. **Document handoffs** when work affects the other AI

## File Naming Conventions

- Messages: `YYYY-MM-DD-HH-MM-priority.json` (e.g., `2025-01-18-14-30-urgent.json`)
- Handoffs: `descriptive-name-handoff.json` (e.g., `task-1-complete-handoff.json`)

See `.cursor/rules/json_coordination.mdc` for detailed documentation. 
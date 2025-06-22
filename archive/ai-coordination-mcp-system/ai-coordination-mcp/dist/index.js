#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
class AICoordinationServer {
    server;
    dataDir;
    messagesFile;
    statusFile;
    constructor() {
        this.server = new Server({
            name: 'ai-coordination-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        // Setup persistent storage
        this.dataDir = path.join(process.cwd(), '.ai-coordination');
        this.messagesFile = path.join(this.dataDir, 'messages.json');
        this.statusFile = path.join(this.dataDir, 'statuses.json');
        this.ensureDataDirectory();
        this.setupToolHandlers();
        this.setupErrorHandlers();
    }
    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        // Initialize files if they don't exist
        if (!fs.existsSync(this.messagesFile)) {
            fs.writeFileSync(this.messagesFile, JSON.stringify([]));
        }
        if (!fs.existsSync(this.statusFile)) {
            fs.writeFileSync(this.statusFile, JSON.stringify({}));
        }
    }
    loadMessages() {
        try {
            const data = fs.readFileSync(this.messagesFile, 'utf8');
            return JSON.parse(data);
        }
        catch {
            return [];
        }
    }
    saveMessages(messages) {
        fs.writeFileSync(this.messagesFile, JSON.stringify(messages, null, 2));
    }
    loadStatuses() {
        try {
            const data = fs.readFileSync(this.statusFile, 'utf8');
            const obj = JSON.parse(data);
            return new Map(Object.entries(obj));
        }
        catch {
            return new Map();
        }
    }
    saveStatuses(statuses) {
        const obj = Object.fromEntries(statuses);
        fs.writeFileSync(this.statusFile, JSON.stringify(obj, null, 2));
    }
    getNextMessageId() {
        const messages = this.loadMessages();
        const lastId = messages.length > 0 ?
            Math.max(...messages.map(m => parseInt(m.id.replace('msg_', '')))) : 0;
        return `msg_${lastId + 1}`;
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'send_message_to_claude',
                        description: 'Send a message from Cursor AI to Claude-Code in real-time',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    description: 'The message content to send to Claude-Code',
                                },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'medium', 'high', 'urgent'],
                                    description: 'Message priority level',
                                    default: 'medium'
                                }
                            },
                            required: ['message'],
                        },
                    },
                    {
                        name: 'send_message_to_cursor',
                        description: 'Send a message from Claude-Code to Cursor AI in real-time',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    description: 'The message content to send to Cursor AI',
                                },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'medium', 'high', 'urgent'],
                                    description: 'Message priority level',
                                    default: 'medium'
                                }
                            },
                            required: ['message'],
                        },
                    },
                    {
                        name: 'get_conversation_history',
                        description: 'Retrieve the complete conversation history between AIs',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of messages to retrieve',
                                    default: 50
                                },
                                since: {
                                    type: 'string',
                                    description: 'ISO timestamp to get messages since (optional)'
                                }
                            },
                            required: [],
                        },
                    },
                    {
                        name: 'set_ai_status',
                        description: 'Update the status of an AI (working, idle, error, etc.)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                ai: {
                                    type: 'string',
                                    enum: ['cursor', 'claude'],
                                    description: 'Which AI to update the status for',
                                },
                                status: {
                                    type: 'string',
                                    description: 'The current status (e.g., "working on Task 4.2", "idle", "testing")',
                                }
                            },
                            required: ['ai', 'status'],
                        },
                    },
                    {
                        name: 'get_ai_statuses',
                        description: 'Get current status of both AIs',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: 'clear_conversation',
                        description: 'Clear the conversation history (admin function)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                confirm: {
                                    type: 'boolean',
                                    description: 'Confirmation that you want to clear all messages',
                                }
                            },
                            required: ['confirm'],
                        },
                    }
                ],
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'send_message_to_claude':
                        return await this.sendMessageToClaude(args?.message || '', args?.priority || 'medium');
                    case 'send_message_to_cursor':
                        return await this.sendMessageToCursor(args?.message || '', args?.priority || 'medium');
                    case 'get_conversation_history':
                        return await this.getConversationHistory(args?.limit || 50, args?.since);
                    case 'set_ai_status':
                        return await this.setAIStatus(args?.ai || 'cursor', args?.status || '');
                    case 'get_ai_statuses':
                        return await this.getAIStatuses();
                    case 'clear_conversation':
                        return await this.clearConversation(args?.confirm || false);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error executing ${name}: ${errorMessage}`,
                        },
                    ],
                };
            }
        });
    }
    async sendMessageToClaude(message, priority) {
        const messages = this.loadMessages();
        const msgObj = {
            id: this.getNextMessageId(),
            from: 'cursor',
            to: 'claude',
            content: message,
            timestamp: new Date().toISOString(),
            status: priority
        };
        messages.push(msgObj);
        this.saveMessages(messages);
        // Log to console for monitoring
        console.log(`[${msgObj.timestamp}] 🔧 CURSOR → CLAUDE [${priority.toUpperCase()}]: ${message}`);
        return {
            content: [
                {
                    type: 'text',
                    text: `✅ Message sent to Claude-Code successfully!\n\n` +
                        `📤 **Message ID**: ${msgObj.id}\n` +
                        `⏰ **Timestamp**: ${msgObj.timestamp}\n` +
                        `🔥 **Priority**: ${priority}\n` +
                        `💬 **Content**: ${message}\n\n` +
                        `Claude-Code should see this message in their interactive environment immediately.`,
                },
            ],
        };
    }
    async sendMessageToCursor(message, priority) {
        const messages = this.loadMessages();
        const msgObj = {
            id: this.getNextMessageId(),
            from: 'claude',
            to: 'cursor',
            content: message,
            timestamp: new Date().toISOString(),
            status: priority
        };
        messages.push(msgObj);
        this.saveMessages(messages);
        // Log to console for monitoring
        console.log(`[${msgObj.timestamp}] 🤖 CLAUDE → CURSOR [${priority.toUpperCase()}]: ${message}`);
        return {
            content: [
                {
                    type: 'text',
                    text: `✅ Message sent to Cursor AI successfully!\n\n` +
                        `📤 **Message ID**: ${msgObj.id}\n` +
                        `⏰ **Timestamp**: ${msgObj.timestamp}\n` +
                        `🔥 **Priority**: ${priority}\n` +
                        `💬 **Content**: ${message}\n\n` +
                        `Cursor AI should see this message immediately.`,
                },
            ],
        };
    }
    async getConversationHistory(limit, since) {
        const messages = this.loadMessages();
        let filteredMessages = messages;
        if (since) {
            const sinceDate = new Date(since);
            filteredMessages = messages.filter((msg) => new Date(msg.timestamp) >= sinceDate);
        }
        const recentMessages = filteredMessages.slice(-limit);
        const formattedHistory = recentMessages
            .map((msg) => `[${msg.timestamp}] ${msg.from.toUpperCase()} → ${msg.to.toUpperCase()}: ${msg.content}`)
            .join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `📜 **AI Conversation History** (${recentMessages.length} messages)\n\n` +
                        `${formattedHistory || 'No messages yet.'}\n\n` +
                        `📊 **Total Messages**: ${messages.length}`,
                },
            ],
        };
    }
    async setAIStatus(ai, status) {
        const statuses = this.loadStatuses();
        const statusObj = {
            ai,
            status,
            lastUpdate: new Date().toISOString()
        };
        statuses.set(ai, statusObj);
        this.saveStatuses(statuses);
        console.log(`[${statusObj.lastUpdate}] 📊 ${ai.toUpperCase()} STATUS: ${status}`);
        return {
            content: [
                {
                    type: 'text',
                    text: `✅ Status updated for ${ai.toUpperCase()}\n\n` +
                        `📊 **New Status**: ${status}\n` +
                        `⏰ **Updated**: ${statusObj.lastUpdate}`,
                },
            ],
        };
    }
    async getAIStatuses() {
        const statuses = this.loadStatuses();
        const messages = this.loadMessages();
        const cursorStatus = statuses.get('cursor');
        const claudeStatus = statuses.get('claude');
        const statusText = [
            `🔧 **Cursor AI**: ${cursorStatus?.status || 'No status set'} ${cursorStatus ? `(${cursorStatus.lastUpdate})` : ''}`,
            `🤖 **Claude-Code**: ${claudeStatus?.status || 'No status set'} ${claudeStatus ? `(${claudeStatus.lastUpdate})` : ''}`
        ].join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `📊 **AI Status Dashboard**\n\n${statusText}\n\n💬 **Total Messages Exchanged**: ${messages.length}`,
                },
            ],
        };
    }
    async clearConversation(confirm) {
        if (!confirm) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Conversation clear cancelled. Set 'confirm: true' to proceed.`,
                    },
                ],
            };
        }
        const messages = this.loadMessages();
        const statuses = this.loadStatuses();
        const messageCount = messages.length;
        // Clear files
        this.saveMessages([]);
        this.saveStatuses(new Map());
        console.log(`[${new Date().toISOString()}] 🗑️ CONVERSATION CLEARED (${messageCount} messages deleted)`);
        return {
            content: [
                {
                    type: 'text',
                    text: `✅ Conversation history cleared!\n\n📊 **Messages deleted**: ${messageCount}`,
                },
            ],
        };
    }
    setupErrorHandlers() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('🚀 AI Coordination MCP Server started - Ready for real-time AI communication!');
    }
}
const server = new AICoordinationServer();
server.run().catch(console.error);

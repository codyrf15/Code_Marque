#!/usr/bin/env node

/**
 * Test script to verify bidirectional AI coordination MCP server functionality
 * This simulates both Cursor and Claude sending messages to test the full workflow
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Starting Bidirectional AI Coordination Test\n');

// Test configuration
const mcpServerPath = path.join(__dirname, 'dist', 'index.js');
let mcpProcess;

// Start the MCP server
function startMCPServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting MCP Server...');
        mcpProcess = spawn('node', [mcpServerPath], { 
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'test' }
        });
        
        mcpProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('📊 MCP Server:', output.trim());
            
            if (output.includes('ready')) {
                resolve();
            }
        });
        
        mcpProcess.stderr.on('data', (data) => {
            console.error('❌ MCP Server Error:', data.toString().trim());
        });
        
        mcpProcess.on('close', (code) => {
            console.log(`🔴 MCP Server exited with code ${code}`);
        });
        
        // Give the server time to start
        setTimeout(resolve, 2000);
    });
}

// Simulate MCP client interaction
function simulateMCPCall(toolName, params = {}) {
    return new Promise((resolve, reject) => {
        const request = {
            jsonrpc: "2.0",
            id: Math.random().toString(36),
            method: "tools/call",
            params: {
                name: toolName,
                arguments: params
            }
        };
        
        console.log(`📤 Simulating ${toolName} call...`);
        
        // Send the request to the MCP server
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        
        // Listen for response
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout waiting for response to ${toolName}`));
        }, 5000);
        
        const onData = (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.id === request.id) {
                    clearTimeout(timeout);
                    mcpProcess.stdout.removeListener('data', onData);
                    resolve(response);
                }
            } catch (e) {
                // Ignore non-JSON output
            }
        };
        
        mcpProcess.stdout.on('data', onData);
    });
}

// Run the test sequence
async function runTests() {
    try {
        await startMCPServer();
        
        console.log('\n🔧 Test 1: Send message from Cursor to Claude');
        await simulateMCPCall('send_message_to_claude', {
            message: 'Test message from simulated Cursor AI',
            priority: 'high'
        });
        
        console.log('\n⚡ Test 2: Send message from Claude to Cursor');
        await simulateMCPCall('send_message_to_cursor', {
            message: 'Test response from simulated Claude Code',
            priority: 'medium'
        });
        
        console.log('\n📊 Test 3: Set AI statuses');
        await simulateMCPCall('set_ai_status', {
            ai: 'cursor',
            status: 'testing bidirectional communication'
        });
        
        await simulateMCPCall('set_ai_status', {
            ai: 'claude',
            status: 'responding to test messages'
        });
        
        console.log('\n🔍 Test 4: Get AI statuses');
        const statusResult = await simulateMCPCall('get_ai_statuses', { random_string: 'test' });
        console.log('📊 Status Result:', statusResult.result);
        
        console.log('\n📜 Test 5: Get conversation history');
        const historyResult = await simulateMCPCall('get_conversation_history', { limit: 10 });
        console.log('📜 History Result:', historyResult.result);
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (mcpProcess) {
            console.log('\n🔴 Stopping MCP Server...');
            mcpProcess.kill();
        }
        process.exit(0);
    }
}

// Handle cleanup
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    if (mcpProcess) {
        mcpProcess.kill();
    }
    process.exit(0);
});

// Start the tests
runTests().catch(console.error); 
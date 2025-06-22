#!/usr/bin/env node

// Test script for AI Coordination MCP Server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPServer() {
  console.log('🧪 Testing AI Coordination MCP Server...\n');

  // Start the server
  const serverPath = join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log('🚀 Server started with PID:', server.pid);

  // Test message sending
  const testMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'send_message_to_claude',
      arguments: {
        message: 'Test message from Cursor to Claude-Code',
        priority: 'medium'
      }
    }
  };

  // Send test message
  server.stdin.write(JSON.stringify(testMessage) + '\n');

  // Listen for response
  server.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log('✅ Server Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('📡 Server Output:', data.toString());
    }
  });

  server.stderr.on('data', (data) => {
    console.log('🔧 Server Log:', data.toString());
  });

  // Test for 5 seconds then cleanup
  setTimeout(() => {
    console.log('\n🧹 Cleaning up test...');
    server.kill();
    console.log('✅ Test completed successfully!');
  }, 5000);
}

testMCPServer().catch(console.error); 
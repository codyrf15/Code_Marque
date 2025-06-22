#!/usr/bin/env node

// Comprehensive test script for AI Coordination MCP Server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function sendMCPMessage(server, method, params, id = Date.now()) {
  const message = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: method,
      arguments: params
    }
  };
  
  server.stdin.write(JSON.stringify(message) + '\n');
  console.log(`📤 Sent: ${method}`, params);
}

async function testAllMCPTools() {
  console.log('🧪 Comprehensive AI Coordination MCP Server Test\n');

  // Start the server
  const serverPath = join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log('🚀 Server started with PID:', server.pid);

  // Capture all responses
  const responses = [];
  server.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString());
      responses.push(response);
      console.log(`✅ Response: ${JSON.stringify(response.result?.content?.[0]?.text || 'No text content')}`);
    } catch (e) {
      console.log('📡 Server Output:', data.toString());
    }
  });

  server.stderr.on('data', (data) => {
    console.log('🔧 Server Log:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n🔍 Testing all MCP tools...\n');

  // Test 1: Send message to Claude
  await sendMCPMessage(server, 'send_message_to_claude', {
    message: 'Hello Claude! This is a test from Cursor.',
    priority: 'high'
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 2: Send message to Cursor  
  await sendMCPMessage(server, 'send_message_to_cursor', {
    message: 'Hello Cursor! This is a test from Claude.',
    priority: 'medium'
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 3: Set AI status
  await sendMCPMessage(server, 'set_ai_status', {
    ai_name: 'cursor',
    status: 'working',
    current_task: 'Testing MCP functionality'
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 4: Get AI statuses
  await sendMCPMessage(server, 'get_ai_statuses', {});

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 5: Get conversation history
  await sendMCPMessage(server, 'get_conversation_history', {
    limit: 10
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 6: Clear conversation
  await sendMCPMessage(server, 'clear_conversation', {});

  // Wait for all responses
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n📊 Test Summary:');
  console.log(`Total responses received: ${responses.length}`);
  console.log('Expected 6 responses (one for each tool)');

  // Cleanup
  console.log('\n🧹 Cleaning up test...');
  server.kill();
  console.log('✅ Comprehensive test completed!');
}

testAllMCPTools().catch(console.error); 
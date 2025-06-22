#!/usr/bin/env node

// Simple Live Monitoring Test - Shows actual console behavior
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function demonstrateLiveMonitoring() {
  console.log('🎬 LIVE AI COORDINATION MONITORING DEMO\n');
  console.log('Starting AI Coordination MCP Server...\n');

  // Start the server with proper output handling
  const serverPath = join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'inherit', 'inherit']  // inherit stderr to see console.log
  });

  console.log('📺 Watching for live coordination logs...\n');

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🔧 Sending test messages to trigger live monitoring...\n');

  // Send multiple test messages to show the live monitoring in action
  const testMessages = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'send_message_to_claude',
        arguments: {
          message: 'Claude, Task 4.2 DALL-E integration complete. Please start comprehensive testing immediately!',
          priority: 'high'
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'send_message_to_cursor',
        arguments: {
          message: 'Testing complete! Found edge cases in error handling. Implementation looks solid overall.',
          priority: 'medium'
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'set_ai_status',
        arguments: {
          ai_name: 'cursor',
          status: 'working',
          current_task: 'Implementing user authentication system'
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'set_ai_status',
        arguments: {
          ai_name: 'claude',
          status: 'testing',
          current_task: 'Validating DALL-E integration edge cases'
        }
      }
    }
  ];

  // Send messages with delays to show live activity
  for (let i = 0; i < testMessages.length; i++) {
    console.log(`📤 Sending message ${i + 1}...`);
    server.stdin.write(JSON.stringify(testMessages[i]) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n🎯 DEMO COMPLETE!');
  console.log('\n📺 What you saw above is LIVE AI COORDINATION MONITORING:');
  console.log('   ✅ Real-time message routing with timestamps');
  console.log('   ✅ Priority levels (HIGH, MEDIUM, LOW, URGENT)');
  console.log('   ✅ AI status updates as they work');
  console.log('   ✅ Full transparency into AI conversations');
  
  console.log('\n🚀 When you run this with REAL AIs:');
  console.log('   🔧 Cursor sends messages → you see them instantly');
  console.log('   🤖 Claude responds → you see the responses');
  console.log('   📊 Both update status → you track their progress');
  console.log('   ⚡ Everything happens in REAL-TIME with FULL VISIBILITY');

  // Cleanup
  setTimeout(() => {
    console.log('\n🧹 Shutting down server...');
    server.kill();
    process.exit(0);
  }, 3000);
}

demonstrateLiveMonitoring().catch(console.error); 
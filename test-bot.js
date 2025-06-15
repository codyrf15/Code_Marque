const { onMessageCreate } = require('./src/messageCreateHandler');
const { ConversationManager } = require('./src/conversationManager');
const { ErrorHandler } = require('./src/errorHandler');
const async = require('async');

// Mock Discord message object
const createMockMessage = (content, isBot = false, isDM = false, mentionsBot = false) => {
  return {
    author: {
      id: '123456789',
      bot: isBot
    },
    content: content,
    channel: {
      type: isDM ? 1 : 0, // 1 = DM, 0 = guild channel
      send: (msg) => console.log('Bot would send:', msg),
      sendTyping: () => console.log('Bot is typing...')
    },
    client: {
      user: { id: 'bot123' }
    },
    mentions: {
      users: {
        has: (userId) => mentionsBot && userId === 'bot123'
      }
    },
    attachments: new Map(),
    reply: (msg) => console.log('Bot would reply:', msg)
  };
};

// Create instances
const errorHandler = new ErrorHandler();
const conversationManager = new ConversationManager(errorHandler);

async function testBot() {
  console.log('Testing Discord Bot Message Processing...');

  const conversationQueue = {
    push: (messageData) => {
      console.log('Message queued for processing (queue is mocked)');
    }
  };

  // Test 1: Direct Message
  console.log('\n=== Test 1: Direct Message ===');
  const dmMessage = createMockMessage('Hello bot!', false, true, false);
  await onMessageCreate(dmMessage, conversationQueue, errorHandler, conversationManager);

  // Test 2: Guild Message with Bot Mention
  console.log('\n=== Test 2: Guild Message with Bot Mention ===');
  const guildMessage = createMockMessage('<@bot123> How are you?', false, false, true);
  await onMessageCreate(guildMessage, conversationQueue, errorHandler, conversationManager);

  // Test 3: Bot Message (should be ignored)
  console.log('\n=== Test 3: Bot Message (should be ignored) ===');
  const botMessage = createMockMessage('I am a bot', true, false, false);
  await onMessageCreate(botMessage, conversationQueue, errorHandler, conversationManager);

  // Test 4: Guild Message without Mention (should be ignored)
  console.log('\n=== Test 4: Guild Message without Mention (should be ignored) ===');
  const noMentionMessage = createMockMessage('Random message', false, false, false);
  await onMessageCreate(noMentionMessage, conversationQueue, errorHandler, conversationManager);

  console.log('\n=== Test 5: Professional Code Delivery System ===');
  // Test the new professional code preprocessing and splitting
  const complexResponse = `## ⚡ MISSION BRIEFING ⚡
*adjusts power armor* Roger that, soldier. You want another Halo game? 
Back in my day, we called this "target practice"...

## 📦 THE CODE PACKAGE (COMPRESSED) 📦
Copy this. Deploy it. Execute it. And for the love of everything holy, don't ask again.

\`\`\`html
<!-- 🚀 Copy this. Deploy it. 🚀 -->
<!DOCTYPE html>
<html>
<!-- CodeMarque says: This is the main structure -->
<head>
    <title>CodeMarque's Range 🎯</title>
    // Copy this. Deploy it. And for the love of everything holy, don't ask again.
</head>
<body>
    /* Copy this and deploy it immediately */
    <div>Game Content</div>
</body>
</html>
\`\`\`

## 🎯 TACTICAL NOTES 🎯
There's your firing range, marine. Deploy and test your aim.`;

  console.log('ORIGINAL COMPLEX RESPONSE:');
  console.log(complexResponse);

  // Test preprocessing
  const preprocessedResponse = conversationManager.preprocessForProfessionalDelivery(complexResponse);
  console.log('\nPREPROCESSED RESPONSE:');
  console.log(preprocessedResponse);

  // Test professional splitting
  const chunks = conversationManager.splitResponseProfessionally(preprocessedResponse);
  console.log('\nPROFESSIONAL CHUNKS:');
  chunks.forEach((chunk, index) => {
    console.log(`\n--- CHUNK ${index + 1} ---`);
    console.log(chunk);
  });

  // Check results
  const hasCleanCodeBlock = chunks.some(chunk => 
    chunk.includes('```html') && 
    !chunk.includes('🚀') && 
    !chunk.includes('Copy this') &&
    chunk.includes('<html>')
  );

  console.log('\n=== PROFESSIONAL DELIVERY RESULTS ===');
  console.log('✅ Clean code block separated:', hasCleanCodeBlock);
  console.log('✅ Narrative preserved in separate chunks:', chunks.length > 1);
  console.log('✅ No emojis in code blocks:', !chunks.some(chunk => chunk.includes('```') && chunk.includes('🚀')));
  console.log('✅ Professional structure maintained:', chunks.some(chunk => chunk.includes('MISSION BRIEFING')));

  console.log('\n=== All Tests Complete ===');
}

testBot().catch(console.error);

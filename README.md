# 🛡️ CodeMarque AI Bot

> **Professional AI-Powered Discord Assistant with Military-Grade Precision**

CodeMarque AI Bot is a sophisticated Discord assistant engineered for professional environments. Built with enterprise-grade Google Gemini AI models, it delivers strategic intelligence and tactical support through advanced conversational AI.

---

## 🏆 **Credits & Acknowledgments**

This project builds upon the exceptional foundation created by **Mark Anthony Llego** ([@llegomark](https://github.com/llegomark)). 

**Original Repository:** [discord-bot-claude-gemini](https://github.com/llegomark/discord-bot-claude-gemini)

We extend our sincere gratitude to Mark for:
- ✨ Creating the original architectural framework
- 🔧 Establishing the core Discord.js integration patterns  
- 🚀 Pioneering the advanced AI integration approach with Gemini
- 📚 Providing comprehensive documentation and examples

CodeMarque AI Bot represents an evolution of this foundation, customized for enterprise and professional use cases with enhanced security, branding, and operational features.

---

## 🎯 **Mission Statement**

CodeMarque AI Bot serves as your digital command center, providing:
- **Strategic AI Consultation** through Gemini's advanced reasoning
- **Rapid Intelligence Gathering** via Gemini's swift processing
- **Secure Communication Channels** with enterprise-grade authentication
- **Mission-Critical Reliability** with comprehensive error handling

---

## ⚡ **Core Capabilities**

### 🤖 **AI Command & Control**
- **Gemini AI Intelligence**: Powered by Google's advanced Gemini models
- **Tactical Personas**: Deploy specialized AI agents for different mission requirements
  - 🎖️ **CodeMarque Agent**: Military-themed professional assistant  
  - 🛠️ **Technical Specialist**: JavaScript/Python development expert
  - 🤝 **Support Operator**: General assistance and guidance
- **Conversation Intelligence**: Maintains operational context and memory

### 🔐 **Security & Operations**
- **Channel Authorization**: Redis-based access control system
- **API Authentication**: Secured endpoints with key-based protection
- **Rate Limiting**: Anti-abuse protection for sustained operations
- **Error Intelligence**: Webhook notifications with detailed reporting
- **Activity Monitoring**: Real-time status and performance tracking

### 📡 **Command Interface**
| Command | Function | Access Level |
|---------|----------|-------------|
| `/help` | Display operational manual | All Users |
| `/settings` | Show current configuration | All Users |
| `/clear` | Purge conversation history | All Users |
| `/save` | Archive conversation to DM | All Users |
| `/model` | Switch AI model | All Users |
| `/prompt` | Change AI persona | All Users |
| `/reset` | Restore default settings | All Users |
| `/testerror` | Diagnostic error test | Owner Only |

### 🏗️ **Infrastructure & Architecture**
- **Production-Ready**: Optimized for 24/7 deployment
- **Test Coverage**: Comprehensive Jest testing suite
- **Express Backend**: RESTful API for channel management
- **Redis Integration**: High-performance data persistence
- **Rate Management**: Intelligent throttling and queue systems

---

## 🚀 **Deployment Guide**

### **Prerequisites**
- **Node.js** (v18+ recommended)
- **Discord Bot Token** ([Discord Developer Portal](https://discord.com/developers/applications))
- **Google AI API Key** ([Google AI Studio](https://aistudio.google.com/))
- **Upstash Redis** ([Upstash Console](https://console.upstash.com/))

### **Quick Start**

1. **Repository Setup**
   ```bash
   git clone https://github.com/codyrf15/CodeMarque.git
   cd CodeMarque
   npm install
   ```

2. **Environment Configuration**
   
   Create `.env` file with your credentials:
   ```env
   DISCORD_BOT_TOKEN=your-bot-token
   DISCORD_CLIENT_ID=your-client-id
   GOOGLE_API_KEY_1=your-google-key-here
   UPSTASH_REDIS_URL=your-redis-url
   UPSTASH_REDIS_TOKEN=your-redis-token
   PORT=3000
   ```

3. **Discord Integration**
   ```bash
   # Deploy slash commands to Discord
   node src/deploy-commands.js
   
   # Launch the bot
   npm start
   ```

### **Channel Authorization**

Configure authorized channels via API:
```bash
curl -X POST http://localhost:3000/api/allowedChannels \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"channelId": "CHANNEL_ID", "action": "add"}'
```

---

## 🛠️ **Development & Testing**

### **Quality Assurance**
```bash
# Run test suite
npm test

# Code linting
npm run lint

# Start development server
npm start
```

### **Architecture Overview**
```
src/
├── index.js              # Main application entry
├── config.js             # Configuration management
├── conversationManager.js # AI conversation logic
├── commandHandler.js     # Slash command processing
├── messageCreateHandler.js # Message event handling
├── interactionCreateHandler.js # Interaction management
├── errorHandler.js       # Error reporting system
├── redisClient.js        # Redis connection
├── channelRoutes.js      # API route handlers
├── functionTools.js      # Utility functions
├── helpCommand.js        # Help system
└── deploy-commands.js    # Discord command deployment
```

---

## 🔒 **Security Features**

- **🛡️ API Key Protection**: All endpoints secured with authentication
- **⚡ Rate Limiting**: Prevents abuse and ensures stability  
- **🔐 Environment Isolation**: Sensitive data in `.env` files only
- **📊 Error Reporting**: Webhook notifications for critical issues
- **🚫 Channel Restrictions**: Redis-based access control

---

## 📈 **Performance & Monitoring**

- **Response Time Optimization**: Sub-second AI model switching
- **Memory Management**: Efficient conversation caching
- **Error Recovery**: Automatic fallback systems
- **Status Reporting**: Real-time operational metrics
- **Load Balancing**: Multiple Google API key rotation

---

## 🌐 **Production Deployment**

### **Replit Deployment**
1. Import repository from GitHub
2. Configure environment variables in Secrets
3. Run `npm install && npm start`

### **VPS/Cloud Deployment**
- Supports Docker containerization
- PM2 process management recommended
- NGINX reverse proxy compatible
- SSL/TLS ready for secure connections

---

## 📝 **Configuration Reference**

<details>
<summary>Complete Environment Variables</summary>

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_USER_ID=your-user-id

# AI Service APIs
GOOGLE_API_KEY_1=your-google-key-1
GOOGLE_API_KEY_2=your-google-key-2
GOOGLE_API_KEY_3=your-google-key-3

# Database & Storage
UPSTASH_REDIS_URL=your-redis-url
UPSTASH_REDIS_TOKEN=your-redis-token

# Application Settings
PORT=3000
API_KEY=your-api-key
CONVERSATION_INACTIVITY_DURATION=600000

# Optional Integrations
ERROR_NOTIFICATION_WEBHOOK=your-webhook-url
CLOUDFLARE_AI_GATEWAY_URL=your-gateway-url
```
</details>

---

## 🤝 **Contributing**

We welcome contributions that enhance CodeMarque AI Bot's capabilities:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/enhancement`)
3. Commit changes (`git commit -m 'Add new capability'`)
4. Push to branch (`git push origin feature/enhancement`)
5. Open a Pull Request

---

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🛡️ **CodeMarque AI Bot** 
*Professional Discord AI Assistant • Built for Enterprise • Powered by Gemini AI*

**Repository**: [github.com/codyrf15/discord-bot-claude-gemini](https://github.com/codyrf15/discord-bot-claude-gemini)

---

*Based on the original work by Mark Anthony Llego - Thank you for the incredible foundation! 🙏*

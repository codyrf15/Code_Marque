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
- **Gemini AI Intelligence**: Powered by Google's advanced Gemini 2.5 Flash models
- **Tactical Personas**: Deploy specialized AI agents for different mission requirements
  - 🎖️ **CodeMarque Agent**: Military-themed professional assistant  
  - 🛠️ **Technical Specialist**: JavaScript/Python development expert
  - 🤝 **Support Operator**: General assistance and guidance
- **Conversation Intelligence**: Maintains operational context and memory

### 📊 **Visual Diagram Generation**
- **Automatic Mermaid Diagrams**: Native PNG generation from Mermaid code blocks
- **Docker Integration**: Uses `minlag/mermaid-cli` for professional diagram rendering
- **Zero User Setup**: Diagrams generated automatically in Discord responses
- **Intelligent Fallback**: Provides mermaid.live links when Docker unavailable
- **Multiple Formats**: Supports flowcharts, sequence diagrams, class diagrams, and more

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
| `/diagnostic` | Production environment diagnostics | Owner Only |
| `/testerror` | Diagnostic error test | Owner Only |

### 🏗️ **Infrastructure & Architecture**
- **Production-Ready**: Optimized for 24/7 deployment with Docker support
- **Test Coverage**: Comprehensive Jest testing suite
- **Express Backend**: RESTful API for channel management
- **Redis Integration**: High-performance data persistence
- **Rate Management**: Intelligent throttling and queue systems
- **Docker Integration**: Full containerization support with Mermaid CLI
- **PM2 Process Management**: Enterprise-grade process monitoring

---

## 🚀 **Deployment Guide**

### **Prerequisites**
- **Node.js** (v20+ recommended)
- **Docker** (for Mermaid diagram generation)
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

3. **Docker Setup (for Mermaid diagrams)**
   ```bash
   # Install Docker and pull Mermaid CLI image
   npm run setup:docker
   
   # Or manually install Docker and pull image
   docker pull minlag/mermaid-cli
   ```

4. **Discord Integration**
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

# Test Mermaid diagram generation
npm run test:mermaid

# Production diagnostics
npm run diagnose

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
├── helpCommand.js        # Help system
├── deploy-commands.js    # Discord command deployment
└── utils/
    ├── mermaidGenerator.js # Mermaid diagram generation
    └── messageSplitter.js  # Intelligent message splitting
```

---

## 📊 **Mermaid Diagram Generation**

CodeMarque automatically generates beautiful PNG diagrams from Mermaid code blocks in AI responses.

### **How It Works**
1. **Automatic Detection**: Bot detects `````mermaid` code blocks in responses
2. **Docker Generation**: Uses `minlag/mermaid-cli` to create professional PNG images
3. **Discord Integration**: Attaches generated diagrams directly to Discord messages
4. **Smart Fallback**: Shows mermaid.live links when Docker unavailable

### **Example Usage**
Simply ask the bot: *"Create a flowchart showing user authentication"*

The bot will respond with both the Mermaid code AND a generated PNG image:
````mermaid
graph TD
    A[User Login] --> B{Valid Credentials?}
    B -->|Yes| C[Generate Token]
    B -->|No| D[Show Error]
````

### **Supported Diagram Types**
- **Flowcharts**: Process flows and decision trees
- **Sequence Diagrams**: System interactions and API calls  
- **Class Diagrams**: Object-oriented design structures
- **State Diagrams**: State machines and workflows
- **Gantt Charts**: Project timelines and schedules
- **Git Graphs**: Version control branching strategies

### **Zero User Setup Required**
- No installation needed for Discord users
- No special commands required
- Works automatically in any Discord channel
- Instant visual diagram generation

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

### **Docker Deployment (Recommended)**
```bash
# Build and run with Docker Compose
npm run docker:build
npm run docker:run

# Stop the deployment
npm run docker:stop
```

### **PM2 Deployment**
```bash
# Start with PM2 (with Docker group permissions)
sg docker -c 'pm2 start ecosystem.config.js'

# Monitor the process
pm2 logs codemarque-bot
pm2 monit
```

### **VPS/Cloud Deployment**
- **Docker-enabled hosting recommended** (Railway, Render, DigitalOcean)
- **PM2 process management** with Docker group permissions
- **NGINX reverse proxy** compatible
- **SSL/TLS ready** for secure connections
- **Automatic Mermaid generation** when Docker available

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

**Repository**: [github.com/codyrf15/Code_Marque](https://github.com/codyrf15/Code_Marque)

---

*Based on the original work by Mark Anthony Llego - Thank you for the incredible foundation! 🙏*

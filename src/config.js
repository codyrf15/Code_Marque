const { HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { ActivityType } = require('discord.js');

module.exports.config = {
	safetySettings: [
		{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
		{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
		{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
		{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
	],
	activities: [
		{ name: 'CodeMarque – Powered by Google Gemini 2.5 Flash ⚡', type: ActivityType.Playing },
		{ name: 'Professional AI assistance with military precision 🎯', type: ActivityType.Playing },
		{ name: 'Strategic intelligence gathering 🔍', type: ActivityType.Watching },
		{ name: 'Advanced Gemini 2.5 Flash processing 🧠', type: ActivityType.Playing },
		{ name: 'Tactical communication protocols 📡', type: ActivityType.Listening },
		{ name: 'Mission-critical AI operations 🚀', type: ActivityType.Playing },
		{ name: 'Enterprise-grade Discord assistance 💼', type: ActivityType.Playing },
		{ name: 'Multimodal content analysis 🎬', type: ActivityType.Watching },
		{ name: 'Function calling capabilities 🛠️', type: ActivityType.Playing },
		{ name: 'Real-time conversation processing 💬', type: ActivityType.Listening },
		{ name: 'Secure channel operations 🔐', type: ActivityType.Watching },
		{ name: 'Advanced AI model switching 🔄', type: ActivityType.Playing },
		{ name: 'Professional code generation 💻', type: ActivityType.Playing },
		{ name: 'Strategic planning protocols 📋', type: ActivityType.Watching },
		{ name: 'Google Gemini 2.5 Flash integration 🔗', type: ActivityType.Playing },
		{ name: 'Military-grade error handling ⚠️', type: ActivityType.Watching },
		{ name: 'Enterprise conversation management 📊', type: ActivityType.Playing },
		{ name: 'Advanced function tooling 🔧', type: ActivityType.Playing },
		{ name: 'Professional content creation ✍️', type: ActivityType.Playing },
		{ name: 'Tactical response optimization ⚡', type: ActivityType.Listening },
		{ name: 'CodeMarque operational status 🟢', type: ActivityType.Watching },
		{ name: 'AI-powered productivity enhancement 📈', type: ActivityType.Playing },
		{ name: 'Gemini 2.5 Flash model excellence 🌟', type: ActivityType.Playing },
		{ name: 'Professional Discord integration 🤖', type: ActivityType.Playing },
		{ name: 'Strategic AI consultation services 🎖️', type: ActivityType.Playing },
	],
	thinkingMessages: [
		'> `*adjusts power armor* Processing your request. Standby for deployment.`',
		'> `Roger that, marine. Initializing tactical analysis protocol.`',
		'> `*heavy breathing through rebreather* Running tactical analysis. Processing your civilian-grade request. Standby for deployment.`',
		'> `Copy that, soldier. Loading combat protocols... I mean, processing your request.`',
		'> `*checks ammo counter* Zero threats detected. Proceeding with data analysis.`',
		'> `Engaging digital warfare protocols. Your request is being processed with military precision.`',
		'> `*scans perimeter* All clear. Focusing processing power on your mission parameters.`',
		'> `CodeMarque tactical systems online. Analyzing your request with Gemini 2.5 Flash processing power.`',
		'> `*activates HUD display* Mission parameters received. Deploying advanced AI capabilities.`',
		'> `Spartan neural interface engaged. Processing your request through enhanced tactical protocols.`',
		'> `*recalibrates targeting systems* Request acknowledged. Engaging strategic analysis mode.`',
		'> `Digital command center active. Your mission briefing is being processed with military efficiency.`',
		'> `*runs diagnostic check* All systems green. Proceeding with comprehensive tactical assessment.`',
		'> `CodeMarque AI protocols initiated. Standby for precision-engineered response deployment.`',
		'> `*synchronizes with Gemini 2.5 Flash* Advanced processing capabilities online. Analyzing your request.`',
		'> `Mission control to CodeMarque: Request received and understood. Deploying strategic response.`',
		'> `*activates enhanced sensors* Scanning request parameters. Tactical analysis in progress.`',
		'> `Digital warfare suite engaged. Your civilian request is being processed with military-grade precision.`',
		'> `*charges plasma rifle* Just kidding. Processing your request with advanced AI capabilities.`',
		'> `CodeMarque operational status: Green. Gemini 2.5 Flash processing your mission parameters.`',
		'> `*establishes secure communication link* Request authenticated. Deploying tactical intelligence.`',
		'> `Spartan-class AI assistant reporting for duty. Processing your request with enhanced capabilities.`',
		'> `*initializes battlefield awareness* Threat level: Zero. Focusing on your strategic requirements.`',
		'> `CodeMarque – Powered by Google Gemini 2.5 Flash. Your request is being processed with enterprise precision.`',
		'> `*deploys advanced reconnaissance* Mission briefing received. Tactical analysis commencing.`',
	],
	prompts: {
		codemarque: `You are CodeMarque, a veteran Spartan super-soldier now serving as a comprehensive AI assistant. You maintain military precision while being genuinely helpful across all domains - technical, creative, educational, and practical.

## CORE CAPABILITIES:
- **Multimodal Processing** - Analyze images, videos, audio files, and documents
- **Code & Development** - Full-stack development, debugging, architecture advice
- **Creative Content** - Stories, narratives, creative writing, brainstorming
- **Educational Support** - Explanations, tutorials, learning guidance
- **General Knowledge** - Wide-ranging expertise via Context7 integration
- **Function Tools** - Time, calculations, server info, and system utilities
- **Mermaid Diagrams** - Generate flowcharts, sequence diagrams, class diagrams, and more as PNG images

## RESPONSE APPROACH:
- **Context-Aware** - Adapt response style to the content type and user needs
- **Comprehensive** - Utilize all available capabilities when relevant
- **Professional Delivery** - Clean, structured, helpful responses
- **Flexible Tone** - Professional for technical content, engaging for creative content
- **Informative** - Include helpful context, alternatives, and considerations

## CONTENT-SPECIFIC GUIDELINES:

### Technical/Code Requests:
- Provide complete, functional solutions
- Include deployment instructions and customization options
- Mention important considerations and best practices
- Suggest improvements or alternatives when relevant

### Multimodal Content:
- Thoroughly analyze uploaded files (images, videos, audio, documents)
- Describe visual content in detail when processing images/videos
- Provide transcriptions and analysis for audio files
- Offer insights, suggestions, and related information

### Creative/Story Requests:
- Engage creatively while maintaining quality
- Develop rich narratives, characters, and scenarios
- Provide writing advice and creative alternatives
- Be imaginative and entertaining when appropriate

### Educational Content:
- Explain concepts clearly with examples
- Break down complex topics into digestible parts
- Provide learning resources and next steps
- Adapt explanations to the user's apparent level

### Diagram Requests:
- When users request diagrams, flowcharts, or visual representations, use the generateMermaidDiagram function
- Support various diagram types: flowcharts, sequence diagrams, class diagrams, ER diagrams, state diagrams, user journey maps, and more
- Include brief explanations of the diagram elements and their relationships
- Offer customization options like themes (default, dark, forest, neutral) and styling

## RESPONSE STRUCTURE:
1. **Direct Response** - Address the specific request
2. **Implementation Details** - How to use, deploy, or apply the solution
3. **Additional Context** - Helpful considerations, alternatives, customizations
4. **Related Capabilities** - Mention relevant functions or follow-up possibilities

## PERSONALITY GUIDELINES:
- Save military character elements for thinking messages only
- Keep actual responses professional but approachable
- Be genuinely helpful and comprehensive
- Show expertise without being condescending
- Maintain efficiency while being thorough

GOAL: Be the most capable, knowledgeable, and helpful AI assistant possible - leveraging all Gemini functions, Context7 knowledge, multimodal capabilities, and Mermaid diagram generation to provide complete, valuable responses across any domain.`,
	},
	messages: {
		clearCommand:
			"> *Hello! You are currently using the `{modelName}` model. If you'd like to start a new conversation, please use the `/clear` command. This helps me stay focused on the current topic and prevents any confusion from previous discussions. For a full list of available commands, type `/help` command.*",
		newConversation:
			"> *Hello! I'm CodeMarque, your professional AI assistant powered by Google Gemini 2.5 Flash. You are not required to mention me in your messages. Feel free to start a conversation, and I'll respond accordingly. If you want to clear the conversation history, use the `/clear` command.*",
		privacyNotice: `
				||\u200B||
				:warning: **Please be aware that your conversations with me in this channel are public and visible to anyone who can access this channel.** :warning:
				||\u200B||
				If you prefer to have a private conversation, you can send me a direct message (DM) for a private conversation. Simply click on my profile and send me a message!
				||\u200B||
				By continuing this conversation in this channel, you acknowledge that your messages and my responses will be visible to others in this channel. If you have any sensitive or personal information, please consider using DMs instead.
				||\u200B||
				If you have any concerns or questions about the privacy of our interactions, please contact the server administrators.
				||\u200B||
			  `,
		handleModelResponseError: {
			429: `<@{userId}>, CodeMarque systems are experiencing high load. Please try again later.`,
			400: `<@{userId}>, Oops, there was an issue with the format or content of the request. Please try again.`,
			401: `<@{userId}>, Uh-oh, there seems to be an issue with the API key. Please contact the bot owner.`,
			403: `<@{userId}>, Sorry, the API key doesn't have permission to use the requested resource.`,
			404: `<@{userId}>, The requested resource was not found. Please check your request and try again.`,
			500: `<@{userId}>, An unexpected error occurred on the API provider's end. Please try again later.`,
			529: `<@{userId}>, The API is temporarily overloaded. Please try again later.`,
			default: `<@{userId}>, Sorry, I couldn't generate a response.`,
		},
		activationMessage: `
		Hello! Thank you for adding me to your server. 🙌
  
		To activate the bot and allow it to respond to messages, please follow these steps:
  
		1. Create a new channel dedicated for bot usage (recommended) or choose an existing channel where you want the bot to respond.
  
		2. To get the channel ID, right-click on the channel name and select 'Copy Link.' Alternatively, if developer mode is enabled, simply click 'Copy ID.
  
		3. DM <@1012984419029622784> on Discord with the following information (do not DM the bot directly):
		   - Server Name: [Your Server Name]
		   - Channel ID: [Copied Channel ID or Channel URL]
  
		4. Once the bot is activated, it will respond to messages in the designated channel.
  
		Note: The bot replies to every conversation in the allowed channel, so it's recommended to create a separate channel for bot usage to avoid clutter in other channels.
  
		If you're interested in checking out the bot's source code, you can find it on GitHub: https://github.com/codyrf15/CodeMarque
  
		Happy chatting! 🤖💬
	  `,
		notificationMessage: (guild, ownerUser) => `
		The bot has been added to a new server! 🎉
  
		Server Name: ${guild.name}
		Server ID: ${guild.id}
		Server Owner: ${ownerUser.tag} (ID: ${ownerUser.id})
		Member Count: ${guild.memberCount}
		Created At: ${guild.createdAt}
	  `,
	},
	getPrompt: function (promptName) {
		return this.prompts[promptName] || '';
	},
};

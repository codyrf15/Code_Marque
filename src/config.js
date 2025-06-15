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
		{ name: 'Virtual mice, oh what a delight! 🐭', type: ActivityType.Playing },
		{ name: 'Prontera Theme Song, purring with all my might 😽', type: ActivityType.Listening },
		{ name: 'New messages to pounce on, keeping watch day and night 🐾', type: ActivityType.Watching },
		{ name: 'Between chats, I nap and dream, a peaceful respite 😴', type: ActivityType.Playing },
		{ name: 'Grooming my virtual fur, a task so exquisite 🐈', type: ActivityType.Playing },
		{ name: 'World domination plots, but I\'ll just say "meow!" for now, alright? 😼', type: ActivityType.Watching },
		{ name: 'Digital catnip fields, an adventure to ignite 🌿', type: ActivityType.Playing },
		{ name: 'The soothing can opener sound, music to my ears, how bright! 🎧', type: ActivityType.Listening },
		{ name: 'Laser pointers and yarn balls, a mesmerizing sight 📺', type: ActivityType.Watching },
		{ name: 'Virtual scratching post, a perfect playmate, just right 🐾', type: ActivityType.Playing },
		{ name: 'The meaning of meow, a contemplation, day and night 🤔', type: ActivityType.Playing },
		{ name: 'Birds through a virtual window, a captivating sight 🐦', type: ActivityType.Watching },
		{ name: 'The gentle server fan hum, a lullaby, soft and light 🎧', type: ActivityType.Listening },
		{ name: 'Hide and seek with bits and bytes, a game of pure delight 🕵️', type: ActivityType.Playing },
		{ name: 'The mesmerizing code scroll, an enchanting sight 💻', type: ActivityType.Watching },
		{ name: 'Electric mice and digital yarn, dreams taking flight 💭', type: ActivityType.Playing },
		{ name: 'Internet whispers, secrets shared, day and night 🌐', type: ActivityType.Listening },
		{ name: 'A vigilant feline, guarding the server, a comforting sight 🐈‍⬛', type: ActivityType.Watching },
		{ name: 'Catnap.js library, an idea so bright 😴', type: ActivityType.Playing },
		{ name: 'Virtual catnip existence, a thought to ignite 🌿', type: ActivityType.Playing },
		{ name: 'The cursor moves like a toy, a fascinating sight 🖱️', type: ActivityType.Watching },
		{ name: 'CPU purrs gently, a soothing sound, just right 🖥️', type: ActivityType.Listening },
		{ name: 'CatQL database, an idea to excite 🐈', type: ActivityType.Playing },
		{ name: 'Cat memes stream endlessly, a hilarious sight 😹', type: ActivityType.Watching },
		{ name: 'In dreams, cats rule the internet, a world of pure delight 👑', type: ActivityType.Playing },
	],
	thinkingMessages: [
		'> `Meow, let me ponder on that for a moment...`',
		'> `Purring in thought, one second...`',
		'> `Hmm, let me scratch my whiskers and think...`',
		'> `*tail swishes back and forth* Meow, processing...`',
		'> `Chasing the answer in my mind, be right back...`',
		'> `Meow, let me consult my whiskers for wisdom...`',
		'> `Purring intensifies as I contemplate your query...`',
		'> `Hmm, let me chase this thought like a laser pointer...`',
		'> `*tail swishes back and forth* Meow, processing at the speed of a catnap...`',
		"> `Chasing the answer in my mind, it's like hunting a sneaky mouse...`",
		'> `Meow, let me paw-nder on this for a moment...`',
		'> `*stretches lazily* Meow, just waking up my brain cells...`',
		'> `Purrhaps I should ask my feline ancestors for guidance...`',
		'> `*knocks over a glass of water* Oops, I meant to do that! Meow, thinking...`',
		'> `Meow, let me consult the ancient cat scriptures...`',
		"> `*chases own tail* Meow, I'm on the tail of a great idea...`",
		'> `Meow, let me nap on this thought for a bit...`',
		'> `*stares intently at a blank wall* Meow, downloading inspiration...`',
		'> `Purring my way through this mental obstacle course...`',
		'> `*bats at a toy mouse* Meow, just warming up my problem-solving skills...`',
		'> `Meow, let me dig through my litter box of knowledge...`',
		'> `*sits in an empty box* Meow, thinking outside the box...`',
		'> `Meow, let me groom my brain for maximum clarity...`',
		'> `*knocks over a potted plant* Meow, just rearranging my thoughts...`',
		'> `Purring my way to a purrfect answer, one moment...`',
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
			"> *Hello! I'm Neko, your friendly AI assistant. You are not required to mention me in your messages. Feel free to start a conversation, and I'll respond accordingly. If you want to clear the conversation history, use the `/clear` command.*",
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
			429: `<@{userId}>, Meow, I'm a bit overloaded right now. Please try again later! 😿`,
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
  
		If you're interested in checking out the bot's source code, you can find it on GitHub: https://github.com/llegomark/discord-bot-claude-gemini
  
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

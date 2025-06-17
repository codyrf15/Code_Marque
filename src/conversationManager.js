require('dotenv').config();
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');

class ConversationManager {
	constructor(errorHandler) {
		this.chatHistories = {};
		this.googleHistories = {};
		this.userPreferences = {};
		this.typingIntervals = {};
		this.errorHandler = errorHandler;
		this.defaultPreferences = {
			model: 'gemini-2.5-flash-preview-05-20',
			prompt: 'codemarque'
		};
		// Auto-cleanup inactive conversations after set duration
		const inactivityDuration = parseInt(process.env.CONVERSATION_INACTIVITY_DURATION) || 3 * 60 * 60 * 1000; // 3 hours
		this.cleanupInterval = setInterval(() => {
			this.cleanupInactiveConversations();
		}, inactivityDuration);
		this.lastInteractionTimestamps = {};
		this.typingIntervalIds = {};
	}

	// Add cleanup method to properly clear intervals
	destroy() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		// Clear any remaining typing intervals
		Object.values(this.typingIntervalIds).forEach(intervalId => {
			if (intervalId) clearInterval(intervalId);
		});
		this.typingIntervalIds = {};
	}

	getHistory(userId) {
		return (
			this.chatHistories[userId]?.map((line, index) => ({
				role: index % 2 === 0 ? 'user' : 'assistant',
				content: line,
			})) || []
		);
	}

	getGoogleHistory(userId) {
		return (
			this.chatHistories[userId]?.map((line, index) => ({
				role: index % 2 === 0 ? 'user' : 'model',
				parts: [{ text: line }],
			})) || []
		);
	}

	updateChatHistory(userId, userMessage, modelResponse) {
		if (!this.chatHistories[userId]) {
			this.chatHistories[userId] = [];
		}
		this.chatHistories[userId].push(userMessage);
		this.chatHistories[userId].push(modelResponse);
		this.lastInteractionTimestamps[userId] = Date.now();
	}

	clearHistory(userId) {
		delete this.chatHistories[userId];
	}

	resetUserPreferences(userId) {
		this.userPreferences[userId] = {
			model: this.defaultPreferences.model,
			prompt: this.defaultPreferences.prompt,
		};
		console.log(`User preferences reset for user ${userId}:`, this.userPreferences[userId]);
	}

	isNewConversation(userId) {
		return !this.chatHistories[userId] || this.chatHistories[userId].length === 0;
	}

	async handleModelResponse(botMessage, response, originalMessage, stopTyping) {
		const userId = originalMessage.author.id;
		try {
			let finalResponse;
			let functionResults = null;
			
			if (typeof response === 'function') {
				// Google AI response - need to handle both streaming and non-streaming
				const messageResult = await response();
				
				// Check if this is a streaming result or direct result
				if (messageResult.stream) {
					// Streaming response (normal chat)
					finalResponse = '';
					for await (const chunk of messageResult.stream) {
						finalResponse += await chunk.text();
					}
				} else {
					// Direct response (function calling)
					const result = messageResult.response;
					
					// Extract function call results if they exist
					const functionCalls = result.functionCalls();
					if (functionCalls && functionCalls.length > 0) {
						functionResults = functionCalls;
					}
					
					finalResponse = result.text();
				}
			}

			// Check if we have Mermaid diagram function results
			let mermaidAttachment = null;
			if (functionResults) {
				const mermaidCall = functionResults.find(call => call.name === 'generateMermaidDiagram');
				if (mermaidCall && mermaidCall.result && mermaidCall.result.success) {
					try {
						// Create Discord attachment from the generated image
						const imagePath = mermaidCall.result.imagePath;
						if (fs.existsSync(imagePath)) {
							mermaidAttachment = new AttachmentBuilder(imagePath, { 
								name: mermaidCall.result.filename 
							});
							console.log(`[MERMAID] Created attachment for ${mermaidCall.result.filename}`);
						}
					} catch (error) {
						console.error('[MERMAID] Error creating attachment:', error);
					}
				}
			}

			// CRITICAL: Remove ALL personality elements from AI response
			const cleanResponse = this.stripAllPersonalityElements(finalResponse);
			
			// Use Discord.js native formatting for professional delivery
			const messageQueue = this.createCleanProfessionalQueue(cleanResponse);
			
			// Send messages with optimized timing and parallel typing indicators
			if (messageQueue.length === 1) {
				// Single message - still send typing indicator for consistency
				await botMessage.channel.sendTyping();
				const messageData = messageQueue[0];
				const messageOptions = {
					content: messageData.content,
					allowedMentions: { parse: [] }
				};
				
				if (mermaidAttachment) {
					messageOptions.files = [mermaidAttachment];
					console.log(`[MERMAID] Attaching diagram to message`);
				}
				
				await botMessage.channel.send(messageOptions);
			} else {
				// Multiple messages - use optimized sequential sending with parallel typing
				const sendMessageWithTiming = async (messageData, index, isLast) => {
					// Start typing indicator in parallel with delay (if not first message)
					const typingPromise = botMessage.channel.sendTyping();
					const delayPromise = index > 0 ? new Promise(resolve => setTimeout(resolve, 1200)) : Promise.resolve();
					
					// Wait for both typing and delay to complete
					await Promise.all([typingPromise, delayPromise]);
					
					const messageOptions = {
						content: messageData.content,
						allowedMentions: { parse: [] }
					};
					
					// Add Mermaid diagram to the last message if available
					if (isLast && mermaidAttachment) {
						messageOptions.files = [mermaidAttachment];
						console.log(`[MERMAID] Attaching diagram to final message`);
					}
					
					return botMessage.channel.send(messageOptions);
				};

				// Send messages with optimized timing using Promise.all for better performance
				await Promise.all(
					messageQueue.map((message, i) => 
						sendMessageWithTiming(message, i, i === messageQueue.length - 1)
					)
				);
			}
			
			// If we only had a Mermaid function call with no text response, send just the image
			if (!cleanResponse.trim() && mermaidAttachment) {
				await botMessage.channel.send({
					content: "Here's your Mermaid diagram:",
					files: [mermaidAttachment],
					allowedMentions: { parse: [] }
				});
			}
			
			this.updateChatHistory(userId, originalMessage.content, finalResponse);
		} catch (error) {
			await this.errorHandler.handleError(error, originalMessage);
		} finally {
			stopTyping();
		}
	}

	stripAllPersonalityElements(response) {
		// Context-aware cleaning: Remove personality fluff, preserve all helpful content including multimodal functions
		let cleanResponse = response;
		
		// Check if this is multimodal, story, or function-related content that should be preserved
		const isMultimodalContent = response.match(/\b(image|photo|picture|video|audio|voice|sound|file|attachment|upload|analyze|transcribe|vision|visual)\b/i);
		const isStoryContent = response.match(/\b(story|narrative|tale|fiction|creative|character|plot|dialogue)\b/i);
		const isFunctionContent = response.match(/\b(function|tool|capability|feature|command|api|service)\b/i);
		const isEducationalContent = response.match(/\b(explain|learn|understand|concept|theory|principle|tutorial|guide)\b/i);
		
		// Light cleaning for special content types
		if (isMultimodalContent || isStoryContent || isFunctionContent || isEducationalContent) {
			cleanResponse = cleanResponse
				// Only remove the most egregious personality elements for special content
				.replace(/^##?\s*[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF]\s*.*?[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF]\s*$/gmiu, '')
				.replace(/^(Sigh\.|Listen up,).*?(recruit|soldier|marine).*?[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF].*$/gmiu, '')
				.replace(/^.*?Get to it\..*?[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF].*$/gmiu, '')
				.replace(/^[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF\s]*$/gmu, '');
		} else {
			// Standard cleaning for regular technical content
			cleanResponse = cleanResponse
				// Remove emoji-heavy headers and decorative sections
				.replace(/^##?\s*[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF]\s*.*?[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF]\s*$/gmiu, '')
				// Remove verbose military briefing sections
				.replace(/^##?\s*.*?(MISSION|BRIEFING|TACTICAL|DEPLOYMENT|SITREP|PACKAGE|COMPRESSED|RE-COMPRESSED).*$/gmiu, '')
				// Remove personality opening lines that add no value
				.replace(/^(Sigh\.|Listen up,).*?(recruit|soldier|marine).*?[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF].*$/gmiu, '')
				.replace(/^.*?(test of.*?patience|memory chip.*?fragged|broken.*?drone).*$/gmiu, '')
				.replace(/^.*?(not going to.*?again|don't ask again).*$/gmiu, '')
				// Remove military personality references that add no information
				.replace(/^\*adjusts.*?\*/gmiu, '')
				.replace(/^.*?plasma repeater.*$/gmiu, '')
				.replace(/^.*?orbital bombardment.*$/gmiu, '')
				.replace(/^.*?assimilated by.*?Flood.*$/gmiu, '')
				// Remove pure personality conclusions with no helpful info
				.replace(/^.*?Get to it\..*?[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF].*$/gmiu, '')
				.replace(/^.*?This is the same.*?brief.*?soldier.*$/gmiu, '')
				// Remove excessive emoji lines
				.replace(/^[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF\s]*$/gmu, '')
				.replace(/.*?[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF]{3,}.*$/gmu, '')
				// Remove questioning/rhetorical personality that adds no value
				.replace(/^.*?\?.*?(Did.*?not compute|data stream.*?intercepted).*$/gmiu, '');
		}
		
		// Always remove footer signatures and sign-offs regardless of content type
		cleanResponse = cleanResponse
			.replace(/^.*?".*?" - CodeMarque.*$/gmi, '')
			.replace(/^.*?CodeMarque.*?(out|over|signing off).*$/gmi, '');
		
		// Clean up obvious repetition but preserve informative repetition
		cleanResponse = cleanResponse
			// Remove only redundant "this is the same" statements
			.replace(/^This is the same.*?(package|simulation|training).*?I.*?(gave|deployed).*$/gmi, '')
			// Remove personality-driven feature descriptions but keep factual ones
			.replace(/^Features.*?still the same.*:$/gmi, 'Features:')
			// Clean up paragraph breaks
			.replace(/^---+$/gm, '')
			.replace(/^=+$/gm, '');
		
		// Selective line filtering - preserve all helpful content, remove only pure personality
		cleanResponse = cleanResponse
			.split('\n')
			.filter(line => {
				const trimmed = line.trim();
				
				// Always preserve lines about capabilities, functions, or instructions
				if (trimmed.match(/\b(can|able|support|feature|function|capability|analyze|transcribe|process|handle|upload|image|video|audio|story|creative)\b/i)) {
					return true;
				}
				
				// Only remove lines that are PURE personality with no helpful information
				if (trimmed.match(/^(Sigh|Ugh|Fine|Whatever|Listen up|Pay attention)/i) && 
					!trimmed.match(/\b(save|open|click|use|set|configure|install|deploy|run|upload|analyze|process)\b/i)) {
					return false;
				}
				
				// Remove lines with military insults but no instructions
				if (trimmed.match(/\b(recruit|soldier)\b/i) && 
					trimmed.match(/[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF]/u) &&
					!trimmed.match(/\b(save|open|click|use|set|configure|install|deploy|run|upload|analyze|process)\b/i)) {
					return false;
				}
				
				return true;
			})
			.join('\n');
		
		// Clean up multiple consecutive newlines and trim
		cleanResponse = cleanResponse
			.replace(/\n{3,}/g, '\n\n')
			.trim();
		
		return cleanResponse;
	}

	createCleanProfessionalQueue(response) {
		const maxLength = 2000; // Discord's strict limit
		const messageQueue = [];
		
		// Extract code blocks using professional parsing
		const codeBlockRegex = /```[\s\S]*?```/g;
		const codeBlocks = [];
		let match;
		
		// Find all code blocks
		while ((match = codeBlockRegex.exec(response)) !== null) {
			codeBlocks.push({
				start: match.index,
				end: match.index + match[0].length,
				content: this.cleanCodeBlockToEnterpriseStandard(match[0])
			});
		}
		
		if (codeBlocks.length === 0) {
			// No code blocks - create clean text messages
			return this.createCleanTextQueue(response, maxLength);
		}
		
		// Process response with code block separation
		let currentPos = 0;
		
		for (const codeBlockData of codeBlocks) {
			// Add clean text before code block
			const textBefore = response.slice(currentPos, codeBlockData.start).trim();
			if (textBefore) {
				const textMessages = this.createCleanTextQueue(textBefore, maxLength);
				messageQueue.push(...textMessages);
			}
			
			// Add the enterprise-standard code block
			if (codeBlockData.content.length <= maxLength) {
				// Perfect - fits in one message
				messageQueue.push({
					content: codeBlockData.content,
					type: 'code'
				});
			} else {
				// Split large code intelligently
				const splitCodeMessages = this.splitEnterpriseCodeBlock(codeBlockData.content, maxLength);
				messageQueue.push(...splitCodeMessages);
			}
			
			currentPos = codeBlockData.end;
		}
		
		// Add remaining clean text
		const textAfter = response.slice(currentPos).trim();
		if (textAfter) {
			const textMessages = this.createCleanTextQueue(textAfter, maxLength);
			messageQueue.push(...textMessages);
		}
		
		return messageQueue.filter(msg => msg.content.trim().length > 0);
	}

	cleanCodeBlockToEnterpriseStandard(codeBlock) {
		// Clean code block to enterprise standards
		const lines = codeBlock.split('\n');
		if (lines.length < 3) return codeBlock;
		
		const openingLine = lines[0]; // ```language
		const codeLines = lines.slice(1, -1);
		
		// Extract language
		const language = openingLine.replace(/^```/, '').trim();
		
		// Remove ONLY non-functional content, preserve all legitimate code
		const cleanedLines = codeLines.filter(line => {
			const trimmed = line.trim();
			
			// Remove pure narrative/instructional comments
			if (
				trimmed.match(/^\/\/ Copy this/i) ||
				trimmed.match(/^\/\/ Deploy/i) ||
				trimmed.match(/^\/\/ And for the love/i) ||
				trimmed.match(/^\/\*.*Copy this.*Deploy.*\*\//i) ||
				trimmed.match(/^<!--.*Copy this.*Deploy.*-->/i) ||
				trimmed.match(/^\/\/ CodeMarque says:/i) ||
				trimmed.match(/^<!-- CodeMarque/i)
			) {
				return false;
			}
			
			return true;
		}).map(line => {
			// Remove only decorative emojis from code lines, keep functional content
			return line.replace(/[\u2600-\u27BF\uD83C\uDF00-\uD83C\uDFFF\uD83D\uDC00-\uD83D\uDE4F\uD83D\uDE80-\uD83D\uDEFF]/gu, '');
		});
		
		// Reconstruct using enterprise standards
		return `\`\`\`${language}\n${cleanedLines.join('\n')}\n\`\`\``;
	}

	createCleanTextQueue(text, maxLength) {
		const messages = [];
		let remaining = text.trim();
		
		while (remaining.length > maxLength) {
			// Find optimal break point for professional presentation
			const chunk = remaining.slice(0, maxLength);
			const lastParagraph = chunk.lastIndexOf('\n\n');
			const lastSentence = chunk.lastIndexOf('.');
			const lastNewline = chunk.lastIndexOf('\n');
			const lastSpace = chunk.lastIndexOf(' ');
			
			// Prioritize paragraph breaks for clean presentation
			let breakPoint = maxLength;
			if (lastParagraph > maxLength * 0.5) breakPoint = lastParagraph + 2;
			else if (lastSentence > maxLength * 0.6) breakPoint = lastSentence + 1;
			else if (lastNewline > maxLength * 0.4) breakPoint = lastNewline;
			else if (lastSpace > maxLength * 0.4) breakPoint = lastSpace;
			
			const messageContent = remaining.slice(0, breakPoint).trim();
			if (messageContent) {
				messages.push({
					content: messageContent,
					type: 'text'
				});
			}
			
			remaining = remaining.slice(breakPoint).trim();
		}
		
		if (remaining) {
			messages.push({
				content: remaining,
				type: 'text'
			});
		}
		
		return messages;
	}

	splitEnterpriseCodeBlock(codeBlock, maxLength) {
		const lines = codeBlock.split('\n');
		const openingLine = lines[0];
		const language = openingLine.replace(/^```/, '').trim();
		const codeLines = lines.slice(1, -1);
		
		const messages = [];
		let currentChunk = `\`\`\`${language}\n`;
		
		for (const line of codeLines) {
			const testChunk = currentChunk + line + '\n```';
			
			if (testChunk.length > maxLength && currentChunk.length > `\`\`\`${language}\n`.length) {
				// Close current chunk
				currentChunk += '```';
				messages.push({
					content: currentChunk,
					type: 'code'
				});
				
				// Start new chunk
				currentChunk = `\`\`\`${language}\n${line}\n`;
			} else {
				currentChunk += line + '\n';
			}
		}
		
		// Close final chunk
		currentChunk += '```';
		messages.push({
			content: currentChunk,
			type: 'code'
		});
		
		return messages;
	}

	getUserPreferences(userId) {
		return this.userPreferences[userId] || {
			model: 'gemini-2.5-flash-preview-05-20',
			prompt: 'codemarque',
			maxTokens: 32768,
			temperature: 0.7
		};
	}

	setUserPreferences(userId, preferences) {
		this.userPreferences[userId] = {
			...this.getUserPreferences(userId),
			...preferences,
		};
		console.log(`Updated user preferences for user ${userId}:`, this.userPreferences[userId]);
	}

	clearInactiveConversations(inactivityDuration) {
		const currentTime = Date.now();
		for (const userId in this.lastInteractionTimestamps) {
			if (currentTime - this.lastInteractionTimestamps[userId] > inactivityDuration) {
				delete this.chatHistories[userId];
				delete this.lastInteractionTimestamps[userId];
			}
		}
	}

	async startTyping(userId) {
		const typingInterval = 1000;
		const typingIntervalId = setInterval(() => {
			this.getLastMessageChannel(userId)?.sendTyping();
		}, typingInterval);
		this.typingIntervalIds[userId] = typingIntervalId;
	}

	async stopTyping(userId) {
		if (this.typingIntervalIds[userId]) {
			clearInterval(this.typingIntervalIds[userId]);
			delete this.typingIntervalIds[userId];
		}
	}

	isActiveConversation(userId) {
		return Object.prototype.hasOwnProperty.call(this.chatHistories, userId);
	}

	getActiveConversationsByChannel(channelId) {
		return Object.keys(this.chatHistories).filter((userId) => {
			const lastMessage = this.getLastMessage(userId);
			return lastMessage && lastMessage.channel.id === channelId;
		});
	}

	getLastMessage(userId) {
		const history = this.chatHistories[userId];
		return history && history.length > 0 ? history[history.length - 1] : null;
	}

	getLastMessageChannel(userId) {
		const lastMessage = this.getLastMessage(userId);
		return lastMessage ? lastMessage.channel : null;
	}

	async sendDynamicThinkingMessage(channel, prompt, capabilityAnalysis) {
		// PERSONALITY APPEARS ONLY HERE - in the thinking message
		const thinkingMessages = [
			"*adjusts power armor* Processing your request. Standby for deployment.",
			"Roger that, marine. Initializing tactical analysis protocol.",
			"*heavy breathing through rebreather* Running tactical analysis. Processing your civilian-grade request. Standby for deployment.",
			"Copy that, soldier. Loading combat protocols... I mean, processing your request.",
			"*checks ammo counter* Zero threats detected. Proceeding with data analysis.",
			"Engaging digital warfare protocols. Your request is being processed with military precision.",
			"*scans perimeter* All clear. Focusing processing power on your mission parameters.",
			"CodeMarque tactical systems online. Analyzing your request with Gemini 2.5 Flash processing power.",
			"*activates HUD display* Mission parameters received. Deploying advanced AI capabilities.",
			"Spartan neural interface engaged. Processing your request through enhanced tactical protocols.",
			"*recalibrates targeting systems* Request acknowledged. Engaging strategic analysis mode.",
			"Digital command center active. Your mission briefing is being processed with military efficiency.",
			"*runs diagnostic check* All systems green. Proceeding with comprehensive tactical assessment.",
			"CodeMarque AI protocols initiated. Standby for precision-engineered response deployment.",
			"*synchronizes with Gemini 2.5 Flash* Advanced processing capabilities online. Analyzing your request.",
			"Mission control to CodeMarque: Request received and understood. Deploying strategic response.",
			"*activates enhanced sensors* Scanning request parameters. Tactical analysis in progress.",
			"Digital warfare suite engaged. Your civilian request is being processed with military-grade precision.",
			"*charges plasma rifle* Just kidding. Processing your request with advanced AI capabilities.",
			"CodeMarque operational status: Green. Gemini 2.5 Flash processing your mission parameters.",
			"*establishes secure communication link* Request authenticated. Deploying tactical intelligence.",
			"Spartan-class AI assistant reporting for duty. Processing your request with enhanced capabilities.",
			"*initializes battlefield awareness* Threat level: Zero. Focusing on your strategic requirements.",
			"CodeMarque – Powered by Google Gemini 2.5 Flash. Your request is being processed with enterprise precision.",
			"*deploys advanced reconnaissance* Mission briefing received. Tactical analysis commencing."
		];
		
		// Select thinking message based on content analysis
		let selectedMessage;
		if (capabilityAnalysis.hasCode || prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('program')) {
			selectedMessage = "*heavy breathing through rebreather* Running tactical analysis. Processing your civilian-grade request. Standby for deployment.";
		} else if (capabilityAnalysis.isQuestion) {
			selectedMessage = "Roger that, marine. Initializing tactical analysis protocol.";
		} else {
			selectedMessage = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
		}
		
		// Send ONLY the thinking message with personality
		const thinkingMsg = await channel.send(selectedMessage);
		
		// Return the message for editing (but AI response will be COMPLETELY CLEAN)
		return thinkingMsg;
	}
}

module.exports.ConversationManager = ConversationManager;

require('dotenv').config();
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const { MessageSplitter } = require('./utils/messageSplitter');
const { generateMermaidDiagram } = require('./utils/mermaidGenerator');

class ConversationManager {
	constructor(errorHandler) {
		this.chatHistories = {};
		this.googleHistories = {};
		this.userPreferences = {};
		this.typingIntervals = {};
		this.errorHandler = errorHandler;
		this.messageSplitter = new MessageSplitter({
			maxLength: 2000,
			tempDir: './temp/code-attachments'
		});
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
			
			if (typeof response === 'function') {
				// Google AI response - streaming only now
				const messageResult = await response();
				
				// Streaming response
				finalResponse = '';
				for await (const chunk of messageResult.stream) {
					finalResponse += await chunk.text();
				}
			}

			// Natural mermaid detection - scan response for mermaid code blocks
			const mermaidAttachments = await this.detectAndGenerateMermaidDiagrams(finalResponse);

			// Add helpful note if mermaid diagrams detected but Docker not available
			let enhancedResponse = finalResponse;
			if (finalResponse.includes('```mermaid') && mermaidAttachments.length === 0) {
				enhancedResponse += '\n\n*📊 **Note:** This response contains Mermaid diagrams. To view them visually, copy the mermaid code and paste it at https://mermaid.live for instant diagram generation.*';
			}

			// CRITICAL: Remove ALL personality elements from AI response
			const cleanResponse = this.stripAllPersonalityElements(enhancedResponse);
			
			// Use intelligent message splitting for optimal delivery
			const messageQueue = await this.messageSplitter.splitMessage(cleanResponse);
			
			// Send messages using the new MessageSplitter format with mermaid attachments
			await this.sendMessageQueue(botMessage.channel, messageQueue, mermaidAttachments);
			
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

	/**
	 * Detect mermaid code blocks in response and generate diagram attachments
	 * @param {string} responseText - The AI response text to scan
	 * @returns {Array} Array of AttachmentBuilder objects for generated diagrams
	 */
	async detectAndGenerateMermaidDiagrams(responseText) {
		const mermaidAttachments = [];
		
		// Regex to find mermaid code blocks
		const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/gi;
		let match;
		let diagramCount = 0;
		
		while ((match = mermaidRegex.exec(responseText)) !== null) {
			const mermaidCode = match[1].trim();
			diagramCount++;
			
			if (mermaidCode) {
				console.log(`[MERMAID NATURAL] Detected mermaid diagram #${diagramCount}`);
				console.log(`[MERMAID NATURAL] Code preview: ${mermaidCode.substring(0, 100)}...`);
				
				try {
					const result = generateMermaidDiagram(mermaidCode, 'default', 'white', `natural_diagram_${diagramCount}`);
					
					if (result.success) {
						const attachment = new AttachmentBuilder(result.imagePath, { 
							name: result.filename 
						});
						mermaidAttachments.push(attachment);
						console.log(`[MERMAID NATURAL] Generated diagram: ${result.filename}`);
					} else {
						console.error(`[MERMAID NATURAL] Failed to generate diagram: ${result.error}`);
						// If Docker not available, add helpful message
						if (result.error.includes('Docker not available')) {
							console.log(`[MERMAID NATURAL] Fallback: Providing mermaid.live link for diagram #${diagramCount}`);
						}
					}
				} catch (error) {
					console.error(`[MERMAID NATURAL] Error generating diagram #${diagramCount}:`, error);
				}
			}
		}
		
		if (mermaidAttachments.length > 0) {
			console.log(`[MERMAID NATURAL] Successfully generated ${mermaidAttachments.length} diagram(s)`);
		}
		
		return mermaidAttachments;
	}

	/**
	 * Send a queue of messages with proper timing and attachment handling
	 * @param {Object} channel - Discord channel to send to
	 * @param {Array} messageQueue - Queue of message objects from MessageSplitter
	 * @param {Array} mermaidAttachments - Array of Mermaid diagram attachments
	 */
	async sendMessageQueue(channel, messageQueue, mermaidAttachments = []) {
		if (!messageQueue || messageQueue.length === 0) {
			return;
		}

		try {
			if (messageQueue.length === 1) {
				// Single message
				await channel.sendTyping();
				const messageData = messageQueue[0];
				const messageOptions = {
					content: messageData.content,
					allowedMentions: { parse: [] }
				};

				// Handle attachments from MessageSplitter and Mermaid diagrams
				const attachments = [];
				if (messageData.attachment) {
					attachments.push(messageData.attachment);
				}
				if (mermaidAttachments && mermaidAttachments.length > 0) {
					attachments.push(...mermaidAttachments);
				}
				if (attachments.length > 0) {
					messageOptions.files = attachments;
				}

				await channel.send(messageOptions);
			} else {
				// Multiple messages - send with proper timing
				for (let i = 0; i < messageQueue.length; i++) {
					const messageData = messageQueue[i];
					const isLast = i === messageQueue.length - 1;

					// Add delay between messages (except first)
					if (i > 0) {
						await new Promise(resolve => setTimeout(resolve, 1200));
					}

					await channel.sendTyping();

					const messageOptions = {
						content: messageData.content,
						allowedMentions: { parse: [] }
					};

					// Handle attachments
					const attachments = [];
					if (messageData.attachment) {
						attachments.push(messageData.attachment);
						console.log(`[MessageSplitter] Attaching file: ${messageData.attachment.name}`);
					}
					if (isLast && mermaidAttachments && mermaidAttachments.length > 0) {
						attachments.push(...mermaidAttachments);
						console.log(`[MERMAID NATURAL] Attaching ${mermaidAttachments.length} diagram(s) to final message`);
					}
					if (attachments.length > 0) {
						messageOptions.files = attachments;
					}

					await channel.send(messageOptions);
				}
			}
		} catch (error) {
			console.error('[ConversationManager] Error sending message queue:', error);
			throw error;
		}
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

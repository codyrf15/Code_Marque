// Import required modules
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const async = require('async');
const rateLimit = require('express-rate-limit');
const Bottleneck = require('bottleneck');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { performance, PerformanceObserver, monitorEventLoopDelay } = require('perf_hooks');

// Import custom modules
const { ConversationManager } = require('./conversationManager');
const { CommandHandler } = require('./commandHandler');
const { config } = require('./config');
const { ErrorHandler } = require('./errorHandler');
const { onInteractionCreate } = require('./interactionCreateHandler');
const { onMessageCreate } = require('./messageCreateHandler');
const redisClient = require('./redisClient');

// ========================================
// 🚀 PERFORMANCE MONITORING SETUP
// ========================================

// Initialize event loop delay monitoring
const eventLoopDelayHistogram = monitorEventLoopDelay({ resolution: 20 });
eventLoopDelayHistogram.enable();

// Performance observer for tracking async operations
const perfObserver = new PerformanceObserver((list) => {
	const entries = list.getEntries();
	entries.forEach((entry) => {
		// Log slow operations (>100ms)
		if (entry.duration > 100) {
		console.warn(`[PERFORMANCE] Slow operation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
		}
	});
});

// Observe function and measure entries
perfObserver.observe({ entryTypes: ['function', 'measure'], buffered: true });

// Performance metrics collection
const performanceMetrics = {
	messageProcessingTimes: [],
	apiResponseTimes: [],
	attachmentProcessingTimes: [],
	conversationQueueLength: 0,
	memoryUsage: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
	eventLoopDelay: { min: 0, max: 0, mean: 0, stddev: 0 }
};

// Helper function to mark performance (exported for use in other modules)
global.markPerformance = function markPerformance(name) {
	performance.mark(`${name}-start`);
	return () => {
		performance.mark(`${name}-end`);
		performance.measure(name, `${name}-start`, `${name}-end`);
	};
};

// Performance monitoring interval
setInterval(() => {
	// Update memory usage
	performanceMetrics.memoryUsage = process.memoryUsage();
	
	// Update event loop delay metrics
	performanceMetrics.eventLoopDelay = {
		min: eventLoopDelayHistogram.min,
		max: eventLoopDelayHistogram.max,
		mean: eventLoopDelayHistogram.mean,
		stddev: eventLoopDelayHistogram.stddev
	};
	
	// Log performance metrics every 5 minutes
	const now = Date.now();
	if (!performanceMetrics.lastLogTime || now - performanceMetrics.lastLogTime > 300000) {
		console.log('[PERFORMANCE METRICS]', {
		memoryMB: {
			rss: Math.round(performanceMetrics.memoryUsage.rss / 1024 / 1024),
			heapUsed: Math.round(performanceMetrics.memoryUsage.heapUsed / 1024 / 1024),
			heapTotal: Math.round(performanceMetrics.memoryUsage.heapTotal / 1024 / 1024)
		},
		eventLoopDelay: {
			min: performanceMetrics.eventLoopDelay.min,
			max: performanceMetrics.eventLoopDelay.max,
			mean: Math.round(performanceMetrics.eventLoopDelay.mean * 100) / 100
		},
		queueLength: performanceMetrics.conversationQueueLength,
		avgMessageProcessingTime: performanceMetrics.messageProcessingTimes.length > 0 
			? Math.round(performanceMetrics.messageProcessingTimes.reduce((a, b) => a + b) / performanceMetrics.messageProcessingTimes.length)
			: 0
		});
		
		// Reset metrics
		performanceMetrics.messageProcessingTimes = [];
		performanceMetrics.apiResponseTimes = [];
		performanceMetrics.attachmentProcessingTimes = [];
		performanceMetrics.lastLogTime = now;
	}
}, 30000); // Check every 30 seconds

// Initialize Express app
const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 5000;
app.use(express.json());

const API_KEY = process.env.API_KEY;

// Middleware to verify the API key
function verifyApiKey(req, res, next) {
	const apiKey = req.headers['x-api-key'];
	if (!apiKey || apiKey !== API_KEY) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
	next();
}

// Routes
app.post('/api/allowedChannels', verifyApiKey, async (req, res) => {
	const { channelId, action } = req.body;
	if (!channelId || !action) {
		return res.status(400).json({ error: 'Missing channelId or action' });
	}
	try {
		if (action === 'add') {
		await redisClient.sadd('allowedChannelIds', channelId);
		} else if (action === 'remove') {
		await redisClient.srem('allowedChannelIds', channelId);
		} else {
		return res.status(400).json({ error: 'Invalid action' });
		}
		res.status(200).json({ message: 'Channel ID updated successfully' });
	} catch (error) {
		console.error('Error updating allowed channel IDs:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Initialize Discord client with optimized cache configuration
const { Options } = require('discord.js');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMembers,
	],
	partials: [
		Partials.Channel, // Required for DM support
		Partials.Message  // Required for message events in DMs
	],
	// Enhanced WebSocket options for better connection stability
	ws: {
		timeout: 45000, // 45 second timeout
		compress: false, // Disable compression to reduce connection issues
		maxRetryAttempts: 5, // Increase retry attempts
		retryDelay: 30000 // 30 second delay between retries
	},
	// Optimize cache settings for Discord bot performance
	makeCache: Options.cacheWithLimits({
		...Options.DefaultMakeCacheSettings,
		// Limit message cache to prevent memory bloat
		MessageManager: 100, // Keep only recent 100 messages per channel
		// Disable reaction caching for performance (not used by this bot)
		ReactionManager: 0,
		// Limit guild member cache with priority for bot user
		GuildMemberManager: {
		maxSize: 200, // 200 members per guild
		keepOverLimit: member => member.id === member.client.user.id, // Always keep bot's own member
		},
		// Limit presence cache (not critical for bot functionality)
		PresenceManager: 0,
		// Limit voice state cache (not used by this bot)
		VoiceStateManager: 0,
		// Keep guild cache (needed for operations)
		GuildManager: Infinity,
		// Keep channel cache (needed for message sending)
		ChannelManager: Infinity,
		// Keep user cache but with reasonable limits
		UserManager: 1000,
	}),
	// Configure cache sweeping for automatic cleanup
	sweepers: {
		...Options.DefaultSweeperSettings,
		// Sweep messages older than 1 hour every 30 minutes
		messages: {
		interval: 1_800, // Every 30 minutes
		lifetime: 3_600, // Remove messages older than 1 hour
		},
		// Sweep users periodically, keeping important ones
		users: {
		interval: 3_600, // Every hour
		filter: () => user => {
			// Keep bots and the client user
			if (user.bot || user.id === user.client.user.id) return false;
			// Remove other users periodically to free memory
			return true;
		},
		},
		// Sweep guild members periodically
		guildMembers: {
		interval: 3_600, // Every hour
		filter: () => member => {
			// Keep the bot's own member
			if (member.id === member.client.user.id) return false;
			// Remove inactive members
			return true;
		},
		},
	},
});

// Initialize AI services
const googleApiKeys = [
	process.env.GOOGLE_API_KEY_1,
	process.env.GOOGLE_API_KEY_2,
	process.env.GOOGLE_API_KEY_3,
	process.env.GOOGLE_API_KEY_4,
	process.env.GOOGLE_API_KEY_5,
].filter(key => key && key.trim() !== ''); // Filter out undefined/empty keys

if (googleApiKeys.length === 0) {
	console.error('No valid Google API keys found! Please check your environment variables.');
}

const genAIInstances = googleApiKeys.map((apiKey) => new GoogleGenerativeAI(apiKey, {
	// Configure timeouts for better reliability
	requestOptions: {
		timeout: 45000, // 45 second timeout (increased)
		retries: 2, // Allow 2 retries for network issues
		retryDelay: 1000 // 1 second delay between retries
	}
}));

// Initialize custom classes
const errorHandler = new ErrorHandler();
const conversationManager = new ConversationManager(errorHandler);
const commandHandler = new CommandHandler();
const conversationQueue = async.queue(processConversation, 1);

// Create rate limiters
const limiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // limit each user to 10 requests per windows
	message: 'Too many requests, please try again later.',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	proxy: true, // Enable if you're behind a reverse proxy
});

const googleLimiter = new Bottleneck({
	maxConcurrent: 1,
	minTime: 3000, // 20 requests per minute (more conservative)
	reservoir: 5, // Start with 5 requests available
	reservoirRefreshAmount: 5,
	reservoirRefreshInterval: 15 * 1000, // Refresh 5 requests every 15 seconds
});

// Apply rate limiter middleware to Express app
app.use(limiter);

// Discord bot event listeners
let activityIndex = 0;
client.once('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
	// Set the initial status
	client.user.setPresence({
		activities: [config.activities[activityIndex]],
		status: 'online',
	});
	// Change the activity every 30000ms (30 seconds)
	setInterval(() => {
		activityIndex = (activityIndex + 1) % config.activities.length;
		client.user.setPresence({
		activities: [config.activities[activityIndex]],
		status: 'online',
		});
	}, 30000);
});

client.on('interactionCreate', async (interaction) => {
	await onInteractionCreate(interaction, conversationManager, commandHandler, errorHandler);
});

client.on('messageCreate', async (message) => {
	await onMessageCreate(message, conversationQueue, errorHandler, conversationManager);
});

client.on('guildMemberRemove', async (member) => {
	const userId = member.user.id;
	if (conversationManager.isActiveConversation(userId)) {
		await conversationManager.stopTyping(userId);
	}
});

client.on('channelDelete', async (channel) => {
	const channelId = channel.id;
	const activeConversations = conversationManager.getActiveConversationsByChannel(channelId);
	const stopTypingPromises = activeConversations.map((userId) => conversationManager.stopTyping(userId));
	await Promise.all(stopTypingPromises);
});

client.on('guildCreate', async (guild) => {
	const ownerUser = await client.users.fetch(guild.ownerId);
	await ownerUser.send(config.messages.activationMessage);

	const botCreatorId = process.env.DISCORD_USER_ID;
	const botCreator = await client.users.fetch(botCreatorId);
	const notificationMessage = config.messages.notificationMessage(guild, ownerUser);
	await botCreator.send(notificationMessage);
});

// Function to generate dynamic thinking messages based on user input and personality
async function generateThinkingMessage(messageContent) {
	try {
		// PERSONALITY ONLY IN THINKING MESSAGE - Clean implementation
		const thinkingMessages = [
		"*adjusts power armor* Processing your request. Standby for deployment.",
		"Roger that, marine. Initializing tactical analysis protocol.", 
		"*heavy breathing through rebreather* Running tactical analysis. Processing your civilian-grade request. Standby for deployment.",
		"Copy that, soldier. Loading combat protocols... I mean, processing your request.",
		"*checks ammo counter* Zero threats detected. Proceeding with data analysis.",
		"Engaging digital warfare protocols. Your request is being processed with military precision.",
		"*scans perimeter* All clear. Focusing processing power on your mission parameters."
		];
		
		// Analyze content to select appropriate thinking message
		const hasCode = messageContent.toLowerCase().includes('code') || 
					messageContent.toLowerCase().includes('program') ||
					messageContent.toLowerCase().includes('function') ||
					messageContent.toLowerCase().includes('html') ||
					messageContent.toLowerCase().includes('javascript') ||
					messageContent.toLowerCase().includes('css') ||
					messageContent.toLowerCase().includes('game');
		
		const isQuestion = messageContent.includes('?') || 
					  messageContent.toLowerCase().startsWith('how ') ||
					  messageContent.toLowerCase().startsWith('what ') ||
					  messageContent.toLowerCase().startsWith('why ') ||
					  messageContent.toLowerCase().startsWith('when ') ||
					  messageContent.toLowerCase().startsWith('where ');
		
		// Select contextual thinking message
		let selectedMessage;
		if (hasCode) {
		selectedMessage = "*heavy breathing through rebreather* Running tactical analysis. Processing your civilian-grade request. Standby for deployment.";
		} else if (isQuestion) {
		selectedMessage = "Roger that, marine. Initializing tactical analysis protocol.";
		} else {
		selectedMessage = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
		}
		
		// Return formatted thinking message with quote styling
		return `> ${selectedMessage}`;
		
	} catch (error) {
		console.log('[THINKING MESSAGE ERROR] Using fallback:', error.message);
		// Fallback to static CodeMarque message
		return '> *adjusts power armor* Roger that, soldier. Processing your request...';
	}
}

// Enhanced conversation processing function with full Gemini 2.5 Flash capabilities
async function processConversation({ message, messageContent, processedAttachments, formattedContent, capabilities }) {
	try {
		// Start the typing indicator instantly
		message.channel.sendTyping();

		const userPreferences = conversationManager.getUserPreferences(message.author.id);
		console.log(`User preferences for user ${message.author.id}:`, userPreferences);

		const modelName = userPreferences.model;

		// Use Google Generative AI with FULL Gemini 2.5 Flash capabilities
		if (genAIInstances.length === 0) {
		throw new Error('No valid Google API keys available');
		}
		
		const genAIIndex = 0; // Always use the first Google API key (GOOGLE_API_KEY_1)
		const genAI = genAIInstances[genAIIndex];
		console.log(`Using Google API key index: ${genAIIndex + 1}/${genAIInstances.length}`);
		console.log(`Using Google model: ${modelName}`);
		console.log(`Capabilities detected:`, capabilities);
		
		// Prepare enhanced system instruction first
		let systemInstruction = config.getPrompt(userPreferences.prompt);
		
		// Enhance system instruction for multimodal content
		if (capabilities.multimodal) {
			systemInstruction += `\n\nYou have advanced multimodal capabilities. When analyzing images, describe what you see in detail. When analyzing videos, describe the visual content, actions, and scenes. When analyzing audio, describe what you hear including speech, sounds, and music.`;
		}

		// Natural mermaid integration - no function calling needed

		// Enhance system instruction for JSON output
		if (capabilities.jsonOutput) {
			systemInstruction += `\n\nRespond with structured JSON output when the user requests lists, tables, organized data, or structured information.`;
		}

		console.log(`Enhanced system instruction length: ${systemInstruction.length} characters`);

		// Configure model with enhanced capabilities
		const modelConfig = { 
			model: modelName,
			systemInstruction: systemInstruction
		};
		
		// Function calling removed - using natural mermaid detection instead

		const model = await googleLimiter.schedule(() => genAI.getGenerativeModel(modelConfig, { 
			apiVersion: 'v1beta',
			timeout: 30000 // 30 second timeout
		}));
		
		// Prepare generation config - use adaptive token limits based on model
		const getMaxTokensForModel = (modelName) => {
			if (modelName.includes('flash-8b')) {
				return 8192; // Gemini 1.5 Flash-8B max limit
			} else if (modelName.includes('1.5-pro')) {
				return 8192; // Gemini 1.5 Pro max limit
			} else if (modelName.includes('1.5-flash')) {
				return 8192; // Gemini 1.5 Flash max limit
			} else if (modelName.includes('2.0-flash')) {
				return 32768; // Gemini 2.0 Flash higher limit
			} else if (modelName.includes('2.5-flash')) {
				return 32768; // Gemini 2.5 Flash higher limit
			}
			return 8192; // Safe default
		};

		const maxTokens = getMaxTokensForModel(modelName);
		console.log(`[TOKEN LIMIT] Using ${maxTokens} max output tokens for model ${modelName}`);

		const generationConfig = {
			maxOutputTokens: maxTokens,
			temperature: 0.7,
			topP: 0.8,
		};

		// Enable JSON output if requested
		if (capabilities.jsonOutput) {
			generationConfig.responseMimeType = 'application/json';
			console.log(`[JSON OUTPUT] Enabled for structured response`);
		}

		// Start chat with enhanced configuration
		const chat = model.startChat({
			history: conversationManager.getGoogleHistory(message.author.id),
			safetySettings: config.safetySettings,
			generationConfig: generationConfig
		});

		// Prepare final content for Gemini
		let finalContent;
		
		if (capabilities.hasAttachments && formattedContent && formattedContent.length > 0) {
			// Process audio and video files using Files API with parallel uploads for performance
			const { uploadAudioToFilesAPI, uploadVideoToFilesAPI } = require('./messageCreateHandler');
			
			// Separate audio/video files from other content for parallel processing
			const audioFiles = [];
			const videoFiles = [];
			const otherContent = [];
			
			formattedContent.forEach((part, index) => {
				if (part.audioFile) {
					audioFiles.push({ part, index });
				} else if (part.videoFile) {
					videoFiles.push({ part, index });
				} else {
					otherContent.push({ part, index });
				}
			});
			
			// Process audio files in parallel for optimal performance
			const audioProcessingPromises = audioFiles.map(async ({ part, index }) => {
				try {
					const uploadedFile = await uploadAudioToFilesAPI(
						part.audioFile.blob,
						part.audioFile.filename,
						part.audioFile.mimeType,
						googleApiKeys[genAIIndex]
					);
					
					console.log(`[AUDIO FILES API] Successfully processed ${part.audioFile.filename}`);
					
					return {
						index,
						content: {
							fileData: {
								fileUri: uploadedFile.uri,
								mimeType: part.audioFile.mimeType
							}
						}
					};
				} catch (error) {
					console.error(`[AUDIO FILES API ERROR] Failed to process ${part.audioFile.filename}:`, error);
					
					return {
						index,
						content: {
							text: `\n\n**Audio Processing Failed**: ${part.audioFile.filename} could not be uploaded to Google Files API - ${error.message}`
						}
					};
				}
			});

			// Process video files in parallel for optimal performance
			const videoProcessingPromises = videoFiles.map(async ({ part, index }) => {
				try {
					const uploadedFile = await uploadVideoToFilesAPI(
						part.videoFile.blob,
						part.videoFile.filename,
						part.videoFile.mimeType,
						googleApiKeys[genAIIndex]
					);
					
					console.log(`[VIDEO FILES API] Successfully processed ${part.videoFile.filename}`);
					
					return {
						index,
						content: {
							fileData: {
								fileUri: uploadedFile.uri,
								mimeType: part.videoFile.mimeType
							}
						}
					};
				} catch (error) {
					console.error(`[VIDEO FILES API ERROR] Failed to process ${part.videoFile.filename}:`, error);
					
					return {
						index,
						content: {
							text: `\n\n**Video Processing Failed**: ${part.videoFile.filename} could not be uploaded to Google Files API - ${error.message}`
						}
					};
				}
			});
			
			// Wait for all audio and video uploads to complete
			const [audioResults, videoResults] = await Promise.allSettled([
				Promise.allSettled(audioProcessingPromises),
				Promise.allSettled(videoProcessingPromises)
			]);
			
			// Reconstruct the content array in the original order
			const processedContent = new Array(formattedContent.length);
			
			// Place other content
			otherContent.forEach(({ part, index }) => {
				processedContent[index] = part;
			});
			
			// Place processed audio results
			if (audioResults.status === 'fulfilled') {
				audioResults.value.forEach((result, i) => {
					if (result.status === 'fulfilled') {
						const { index, content } = result.value;
						processedContent[index] = content;
					} else {
						// Fallback for failed promises
						const { index } = audioFiles[i];
						processedContent[index] = {
							text: `\n\n**Audio Processing Failed**: Upload promise rejected - ${result.reason.message}`
						};
					}
				});
			}

			// Place processed video results
			if (videoResults.status === 'fulfilled') {
				videoResults.value.forEach((result, i) => {
					if (result.status === 'fulfilled') {
						const { index, content } = result.value;
						processedContent[index] = content;
					} else {
						// Fallback for failed promises
						const { index } = videoFiles[i];
						processedContent[index] = {
							text: `\n\n**Video Processing Failed**: Upload promise rejected - ${result.reason.message}`
						};
					}
				});
			}
			
			finalContent = processedContent;
			console.log(`[MULTIMODAL] Processing ${processedAttachments.length} attachments`);
			console.log(`[MULTIMODAL] Formatted content parts: ${processedContent.length}`);
			
			// Log attachment types
			const attachmentTypes = processedAttachments.map(att => att.type).join(', ');
			console.log(`[ATTACHMENT TYPES] ${attachmentTypes}`);
		} else {
			// Use simple text content
			finalContent = messageContent;
		}

		// Generate dynamic thinking message
		const thinkingMessage = await generateThinkingMessage(messageContent, userPreferences.prompt, genAI);
		const botMessage = await message.reply(thinkingMessage);
		await conversationManager.startTyping(message.author.id);

		// Log content size before API call
		if (Array.isArray(finalContent)) {
			const totalTextSize = finalContent.reduce((total, part) => {
				if (part.text) return total + part.text.length;
				return total;
			}, 0);
			console.log(`[API DEBUG] Sending multimodal content: ${finalContent.length} parts, ${(totalTextSize/1024).toFixed(2)}KB total text`);
		} else {
			console.log(`[API DEBUG] Sending text content: ${(finalContent.length/1024).toFixed(2)}KB`);
		}

		// Enhanced model response handling with retry logic and streaming fallback
		const apiCallWithRetry = async (retries = 3) => {
			for (let attempt = 1; attempt <= retries; attempt++) {
				try {
					// Try streaming first
					console.log(`[API CALL] Attempt ${attempt}/${retries} - Using streaming mode`);
					return await chat.sendMessageStream(finalContent);
				} catch (error) {
					console.error(`[API RETRY] Attempt ${attempt}/${retries} failed:`, error.message);
					console.error(`[API DEBUG] Full error object:`, error);
					
					// Special handling for streaming errors - try non-streaming fallback
					const isStreamError = error.message.includes('stream') || 
										error.message.includes('Error reading from the stream') || 
										error.message.includes('[GoogleGenerativeAI Error]: Error reading from the stream') ||
										error.message.includes('GoogleGenerativeAI Error');
					
					console.log(`[API FALLBACK CHECK] Stream error detected: ${isStreamError}, Error message: "${error.message}"`);
					
					if (isStreamError) {
						console.log(`[API FALLBACK] Streaming failed, trying non-streaming mode...`);
						try {
							const nonStreamingResult = await chat.sendMessage(finalContent);
							console.log(`[API FALLBACK] Non-streaming mode successful`);
							// Convert to streaming-like format for compatibility
							return {
								stream: (async function* () {
									yield { text: () => nonStreamingResult.response.text() };
								})()
							};
						} catch (fallbackError) {
							console.error(`[API FALLBACK] Non-streaming also failed:`, fallbackError.message);
							if (attempt === retries) {
								throw new Error('Both streaming and non-streaming API calls failed. Please try again or use a smaller file.');
							}
						}
					}
					
					// Don't retry on certain errors
					else if (error.message.includes('SAFETY') || 
						error.message.includes('API_KEY') || 
						error.message.includes('quota') || 
						error.message.includes('content too large') ||
						error.status === 429 || 
						error.status === 400 ||
						error.status === 413 ||
						error.message.includes('maxOutputTokens')) {
						
						// Provide specific error messages for different scenarios
						if (error.message.includes('content too large') || error.status === 413) {
							throw new Error('Content too large for AI processing. Please try with a smaller file or ask for a summary of specific sections.');
						} else if (error.message.includes('quota') || error.status === 429) {
							throw new Error('API rate limit reached. Please wait a moment and try again.');
						}
						
						throw error;
					}
					
					if (attempt === retries) {
						throw error;
					}
					
					// Exponential backoff: 2s, 4s, 8s
					const delay = Math.pow(2, attempt) * 1000;
					console.log(`[API RETRY] Waiting ${delay}ms before retry...`);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		};

		await conversationManager.handleModelResponse(
			botMessage,
			apiCallWithRetry,
			message,
			async () => {
				await conversationManager.stopTyping(message.author.id);
			},
		);
	} catch (error) {
		await conversationManager.stopTyping(message.author.id);
		console.error('Error in processConversation:', error);
		await errorHandler.handleError(error, message);
	}
}

// Utility functions
// (shuffleArray function removed as it was unused)

// Clear inactive conversations interval
const inactivityDuration = process.env.CONVERSATION_INACTIVITY_DURATION || 3 * 60 * 60 * 1000; // Default: 3 hours
setInterval(() => {
	conversationManager.clearInactiveConversations(inactivityDuration);
}, inactivityDuration);

// Enhanced error handling
process.on('unhandledRejection', (error) => {
	console.error('Unhandled Promise Rejection:', error);
	// Don't crash on Discord interaction errors
	if (error.code === 'InteractionAlreadyReplied' || error.message.includes('Unknown interaction')) {
		console.log('[DISCORD ERROR] Ignoring Discord interaction error - continuing...');
		return;
	}
	errorHandler.handleUnhandledRejection(error);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
	// Don't crash on Discord interaction errors
	if (error.code === 'InteractionAlreadyReplied' || error.message.includes('Unknown interaction')) {
		console.log('[DISCORD ERROR] Ignoring Discord interaction error - continuing...');
		return;
	}
	errorHandler.handleUncaughtException(error);
});

// Express app setup and server startup
app.get('/', (_req, res) => {
	res.send('CodeMarque – Powered by Google Gemini 2.5 Flash - Professional AI Discord Assistant is running!');
});

// Health check endpoint
app.get('/health', (_req, res) => {
	res.json({
		status: 'online',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		memory: process.memoryUsage()
	});
});

// Keep-alive ping endpoint
app.get('/ping', (_req, res) => {
	res.json({ 
		pong: true, 
		time: Date.now(),
		status: client.isReady() ? 'connected' : 'disconnected'
	});
});

app.listen(port, () => {
	console.log(`CodeMarque – Powered by Google Gemini 2.5 Flash is listening on port ${port}`);
});

// Self-ping to prevent sleeping (for free Replit accounts)
if (process.env.REPLIT_DEPLOYMENT_ID || process.env.REPL_SLUG) {
	const keepAlive = () => {
		const replitUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
		
		setInterval(async () => {
		try {
			const response = await fetch(`${replitUrl}/ping`);
			const data = await response.json();
			console.log(`[KEEP-ALIVE] Ping successful: ${data.pong ? 'PONG' : 'FAILED'}`);
		} catch (error) {
			console.log(`[KEEP-ALIVE] Ping failed: ${error.message}`);
		}
		}, 4 * 60 * 1000); // Ping every 4 minutes
	};
	
	// Start keep-alive after bot is ready
	client.once('ready', () => {
		setTimeout(keepAlive, 30000); // Wait 30 seconds before starting
		console.log('[KEEP-ALIVE] Self-ping system started');
	});
}

// Start the Discord bot
client.login(process.env.DISCORD_BOT_TOKEN);

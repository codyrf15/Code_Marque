const { config } = require('./config');
// Using Node.js built-in fetch (available in Node.js 18+)
const pdfParse = require('pdf-parse');
const { GoogleAIFileManager } = require('@google/generative-ai/server');

// Supported file types for multimodal analysis
const SUPPORTED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const SUPPORTED_VIDEO_TYPES = ['mp4', 'mov', 'avi', 'webm'];
const SUPPORTED_AUDIO_TYPES = ['mp3', 'wav', 'm4a', 'ogg'];
const SUPPORTED_DOCUMENT_TYPES = ['pdf', 'txt'];

// Helper function to wait for file to become ACTIVE
async function waitForFileActive(fileManager, fileUri, filename, maxWaitTime = 30000) {
	const startTime = Date.now();
	const pollInterval = 1000; // Check every 1 second
	
	while (Date.now() - startTime < maxWaitTime) {
		try {
			const fileInfo = await fileManager.getFile(fileUri.split('/').pop());
			console.log(`[FILES API] File ${filename} status: ${fileInfo.state}`);
			
			if (fileInfo.state === 'ACTIVE') {
				console.log(`[FILES API] File ${filename} is now ACTIVE and ready for use`);
				return fileInfo;
			}
			
			if (fileInfo.state === 'FAILED') {
				throw new Error(`File ${filename} processing failed`);
			}
			
			// Wait before next poll
			await new Promise(resolve => setTimeout(resolve, pollInterval));
		} catch (error) {
			console.error(`[FILES API] Error checking file status for ${filename}:`, error);
			throw error;
		}
	}
	
	throw new Error(`File ${filename} did not become ACTIVE within ${maxWaitTime/1000} seconds`);
}

// Helper function to upload audio files to Google Files API
async function uploadAudioToFilesAPI(audioBlob, filename, mimeType, apiKey) {
	try {
		console.log(`[FILES API] Uploading ${filename} to Google Files API...`);
		
		// Convert blob to buffer for Node.js
		const buffer = Buffer.from(await audioBlob.arrayBuffer());
		
		// Create GoogleAIFileManager instance with API key
		const fileManager = new GoogleAIFileManager(apiKey);
		
		// Upload file using the GoogleAIFileManager
		const uploadResponse = await fileManager.uploadFile(buffer, {
			mimeType: mimeType,
			displayName: filename
		});
		
		console.log(`[FILES API] Successfully uploaded ${filename} with URI: ${uploadResponse.file.uri}`);
		
		// Wait for file to become ACTIVE
		const activeFile = await waitForFileActive(fileManager, uploadResponse.file.uri, filename);
		return activeFile;
	} catch (error) {
		console.error(`[FILES API ERROR] Failed to upload ${filename}:`, error);
		throw error;
	}
}

// Helper function to upload video files to Google Files API
async function uploadVideoToFilesAPI(videoBlob, filename, mimeType, apiKey) {
	try {
		console.log(`[FILES API] Uploading video ${filename} to Google Files API...`);
		
		// Convert blob to buffer for Node.js
		const buffer = Buffer.from(await videoBlob.arrayBuffer());
		
		// Create GoogleAIFileManager instance with API key
		const fileManager = new GoogleAIFileManager(apiKey);
		
		// Upload video file using the GoogleAIFileManager
		const uploadResponse = await fileManager.uploadFile(buffer, {
			mimeType: mimeType,
			displayName: filename
		});
		
		console.log(`[FILES API] Successfully uploaded video ${filename} with URI: ${uploadResponse.file.uri}`);
		
		// Wait for file to become ACTIVE
		const activeFile = await waitForFileActive(fileManager, uploadResponse.file.uri, filename);
		return activeFile;
	} catch (error) {
		console.error(`[FILES API ERROR] Failed to upload video ${filename}:`, error);
		throw error;
	}
}

async function processAttachment(attachment) {
	const attachmentExtension = attachment.name.split('.').pop().toLowerCase();
	const maxFileSize = 30 * 1024 * 1024; // 30MB

	// Text files
	if (attachmentExtension === 'txt') {
		try {
			const response = await fetch(attachment.url);
			return {
				type: 'text',
				content: await response.text(),
				filename: attachment.name
			};
		} catch (error) {
			console.error('Error fetching text attachment:', error);
			throw new Error('Error processing text attachment');
		}
	} 
	// PDF files
	else if (attachmentExtension === 'pdf') {
		if (attachment.size > maxFileSize) {
			throw new Error('File size exceeds the maximum limit of 30MB');
		}

		try {
			const response = await fetch(attachment.url);
			const arrayBuffer = await response.arrayBuffer();
			const pdfBuffer = Buffer.from(arrayBuffer);

			const data = await pdfParse(pdfBuffer);
			return {
				type: 'document',
				content: data.text,
				filename: attachment.name,
				pages: data.numpages
			};
		} catch (error) {
			console.error('Error parsing PDF attachment:', error);
			if (error.message.includes('Could not parse')) {
				throw new Error('Invalid or corrupted PDF file');
			} else {
				throw new Error('Error processing PDF attachment');
			}
		}
	}
	// Image files - for Gemini vision analysis
	else if (SUPPORTED_IMAGE_TYPES.includes(attachmentExtension)) {
		if (attachment.size > maxFileSize) {
			throw new Error('Image file size exceeds the maximum limit of 30MB');
		}

		return {
			type: 'image',
			url: attachment.url,
			filename: attachment.name,
			size: attachment.size,
			mimeType: `image/${attachmentExtension === 'jpg' ? 'jpeg' : attachmentExtension}`
		};
	}
	// Video files - for Gemini video analysis  
	else if (SUPPORTED_VIDEO_TYPES.includes(attachmentExtension)) {
		if (attachment.size > 100 * 1024 * 1024) { // 100MB for videos
			throw new Error('Video file size exceeds the maximum limit of 100MB');
		}

		return {
			type: 'video',
			url: attachment.url,
			filename: attachment.name,
			size: attachment.size,
			mimeType: `video/${attachmentExtension}`
		};
	}
	// Audio files - for Gemini audio analysis
	else if (SUPPORTED_AUDIO_TYPES.includes(attachmentExtension)) {
		if (attachment.size > maxFileSize) {
			throw new Error('Audio file size exceeds the maximum limit of 30MB');
		}

		return {
			type: 'audio',
			url: attachment.url,
			filename: attachment.name,
			size: attachment.size,
			mimeType: `audio/${attachmentExtension}`
		};
	}
	else {
		throw new Error(`Unsupported file type: ${attachmentExtension}. Supported types: Images (${SUPPORTED_IMAGE_TYPES.join(', ')}), Videos (${SUPPORTED_VIDEO_TYPES.join(', ')}), Audio (${SUPPORTED_AUDIO_TYPES.join(', ')}), Documents (${SUPPORTED_DOCUMENT_TYPES.join(', ')})`);
	}
}

// Enhanced function to format multimodal content for Gemini
async function formatMultimodalContent(messageContent, attachments) {
	const parts = [];
	
	// Add text content first
	if (messageContent.trim()) {
		parts.push({
			text: messageContent
		});
	}

	// Process all attachments in parallel for optimal performance
	const attachmentPromises = attachments.map(async (attachment) => {
		switch (attachment.type) {
			case 'text':
			case 'document':
				return {
					text: `\n\n**File: ${attachment.filename}**\n${attachment.content}`
				};
			
			case 'image':
				try {
					// Fetch the image data from Discord's CDN
					const response = await fetch(attachment.url);
					if (!response.ok) {
						throw new Error(`Failed to fetch image: ${response.status}`);
					}
					
					const arrayBuffer = await response.arrayBuffer();
					const buffer = Buffer.from(arrayBuffer);
					const base64Data = buffer.toString('base64');
					
					console.log(`[IMAGE PROCESSING] Successfully processed ${attachment.filename} (${attachment.mimeType})`);
					
					// Return the image as inline data for Gemini
					return {
						inlineData: {
							data: base64Data,
							mimeType: attachment.mimeType
						}
					};
				} catch (error) {
					console.error(`[IMAGE PROCESSING ERROR] Failed to process ${attachment.filename}:`, error);
					return {
						text: `\n\n**Error processing image: ${attachment.filename}** - ${error.message}`
					};
				}
			
			case 'video':
				try {
					// Download video file from Discord (similar to audio processing)
					const response = await fetch(attachment.url);
					if (!response.ok) {
						throw new Error(`Failed to fetch video: ${response.status}`);
					}
					
					const videoBuffer = await response.arrayBuffer();
					const videoBlob = new Blob([videoBuffer], { type: attachment.mimeType });
					
					console.log(`[VIDEO PROCESSING] Downloaded ${attachment.filename} for Google Files API processing`);
					
					console.log(`[VIDEO PROCESSING] Video file prepared for Files API upload: ${attachment.filename}`);
					
					// Return both text info and video file data (similar to audio processing)
					return [
						{
							text: `\n\n**Video File**: ${attachment.filename} (${attachment.mimeType}, ${(attachment.size / 1024 / 1024).toFixed(2)}MB) - Processing with Google Files API for video analysis...`
						},
						{
							videoFile: {
								blob: videoBlob,
								filename: attachment.filename,
								mimeType: attachment.mimeType,
								originalUrl: attachment.url
							}
						}
					];
				} catch (error) {
					console.error(`[VIDEO PROCESSING ERROR] Failed to process ${attachment.filename}:`, error);
					return {
						text: `\n\n**Video Processing Error**: ${attachment.filename} could not be processed - ${error.message}`
					};
				}
			
			case 'audio':
				try {
					// Download audio file from Discord in parallel
					const response = await fetch(attachment.url);
					if (!response.ok) {
						throw new Error(`Failed to fetch audio: ${response.status}`);
					}
					
					const audioBuffer = await response.arrayBuffer();
					const audioBlob = new Blob([audioBuffer], { type: attachment.mimeType });
					
					console.log(`[AUDIO PROCESSING] Downloaded ${attachment.filename} for Google Files API processing`);
					
					console.log(`[AUDIO PROCESSING] Audio file prepared for Files API upload: ${attachment.filename}`);
					
					// Return both text info and audio file data
					return [
						{
							text: `\n\n**Audio File**: ${attachment.filename} (${attachment.mimeType}, ${(attachment.size / 1024 / 1024).toFixed(2)}MB) - Processing with Google Files API for audio analysis...`
						},
						{
							audioFile: {
								blob: audioBlob,
								filename: attachment.filename,
								mimeType: attachment.mimeType,
								originalUrl: attachment.url
							}
						}
					];
				} catch (error) {
					console.error(`[AUDIO PROCESSING ERROR] Failed to process ${attachment.filename}:`, error);
					return {
						text: `\n\n**Audio Processing Error**: ${attachment.filename} could not be processed - ${error.message}`
					};
				}
				
			default:
				return null;
		}
	});

	// Execute all attachment processing in parallel using Promise.allSettled for error tolerance
	const results = await Promise.allSettled(attachmentPromises);
	
	// Process results and flatten any nested arrays (for audio files)
	results.forEach((result, index) => {
		if (result.status === 'fulfilled' && result.value) {
			if (Array.isArray(result.value)) {
				// Handle audio files which return multiple parts
				parts.push(...result.value);
			} else {
				parts.push(result.value);
			}
		} else if (result.status === 'rejected') {
			console.error(`[ATTACHMENT PROCESSING ERROR] Failed to process attachment ${index}:`, result.reason);
			parts.push({
				text: `\n\n**Attachment Processing Error**: Failed to process attachment - ${result.reason.message}`
			});
		}
	});

	return parts;
}

// Function calling removed - using natural mermaid detection instead

// Check if message might need structured JSON output
function shouldUseJSONOutput(messageContent) {
	const jsonTriggers = [
		'list', 'table', 'structured',
		'json', 'format as', 'organize',
		'categories', 'breakdown', 'summary'
	];
	
	const lowerContent = messageContent.toLowerCase();
	return jsonTriggers.some(trigger => lowerContent.includes(trigger));
}

async function onMessageCreate(message, conversationQueue, errorHandler, conversationManager) {
	try {
		console.log(`[RECEIVED MESSAGE] Author: ${message.author.username}, Channel Type: ${message.channel.type}, Content: "${message.content}"`);
		
		// Ignore messages from bots
		if (message.author.bot) return;

		let shouldProcess = false;

		// For DMs, always process
		if (message.channel.type === 1) {
			shouldProcess = true;
		}
		// For guild channels, only process if bot is mentioned
		else if (message.channel.type !== 1) {
			if (message.mentions.users.has(message.client.user.id)) {
				shouldProcess = true;
			} else {
				return;
			}
		}

		if (shouldProcess) {
			// Handle file attachments with enhanced multimodal support
			let messageContent = message.content.trim();
			
			// Strip bot mention from message content for guild channels
			if (message.channel.type !== 1 && message.mentions.users.has(message.client.user.id)) {
				messageContent = messageContent.replace(/<@!?\d+>/g, '').trim();
			}

			let processedAttachments = [];
			let hasMultimodalContent = false;

			if (message.attachments.size > 0) {
				const attachmentProcessingPromises = message.attachments.map(async (attachment) => {
					try {
						const attachmentContent = await processAttachment(attachment);
						
						// Check if this is multimodal content (image, video, audio)
						if (['image', 'video', 'audio'].includes(attachmentContent.type)) {
							hasMultimodalContent = true;
						}
						
						return attachmentContent;
					} catch (error) {
						console.error('Error processing attachment:', error);
						await message.reply(`> \`Sorry, there was an error processing your attachment "${attachment.name}": ${error.message}. Please try again.\``);
						return null;
					}
				});

				const attachmentContents = await Promise.all(attachmentProcessingPromises);
				processedAttachments = attachmentContents.filter((content) => content !== null);
			}

			// If no content and no valid attachments, ask for input
			if (messageContent.trim() === '' && processedAttachments.length === 0) {
				await message.reply("> `It looks like you didn't say anything or upload any supported files. What would you like to talk about?`");
				return;
			}

			// Determine capabilities to use based on content analysis
			const capabilities = {
				jsonOutput: shouldUseJSONOutput(messageContent),
				multimodal: hasMultimodalContent,
				hasAttachments: processedAttachments.length > 0
			};

			console.log(`[CAPABILITY ANALYSIS] JSON Output: ${capabilities.jsonOutput}, Multimodal: ${capabilities.multimodal}, Attachments: ${capabilities.hasAttachments}`);

			// Format content for multimodal processing
			const formattedContent = await formatMultimodalContent(messageContent, processedAttachments);

			// Privacy notice for first-time users in public channels (not DMs)
			if (message.channel.type !== 1 && conversationManager.isNewConversation(message.author.id)) {
				await message.channel.send({ content: config.messages.privacyNotice });
			}

			// Queue the message for processing with enhanced metadata
			conversationQueue.push({ 
				message, 
				messageContent,
				processedAttachments,
				formattedContent,
				capabilities
			});
		}
	} catch (error) {
		await errorHandler.handleError(error, message);
	}
}

module.exports = { onMessageCreate, uploadAudioToFilesAPI, uploadVideoToFilesAPI };

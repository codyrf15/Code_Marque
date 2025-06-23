const { config } = require('./config');
// Using Node.js built-in fetch (available in Node.js 18+)
const pdfParse = require('pdf-parse');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const csv = require('csv-parser');
const yaml = require('js-yaml');
const xml2js = require('xml2js');
const { Readable } = require('stream');

// Supported file types for multimodal analysis
const SUPPORTED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const SUPPORTED_VIDEO_TYPES = ['mp4', 'mov', 'avi', 'webm'];
const SUPPORTED_AUDIO_TYPES = ['mp3', 'wav', 'm4a', 'ogg'];
const SUPPORTED_DOCUMENT_TYPES = ['pdf', 'txt', 'xlsx', 'xls', 'csv', 'docx', 'doc', 'json', 'xml', 'yaml', 'yml', 'md'];
const SUPPORTED_CODE_TYPES = ['js', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'ts', 'html', 'css', 'sql'];

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
	
	throw new Error(`File ${filename} did not becomescripts/start-with-docker.sh/1000} seconds`);
}

// Helper function to download files with timeout and retry logic
async function downloadFileWithRetry(url, filename, maxRetries = 3, timeoutMs = 60000) {
	const startTime = Date.now();
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const attemptStartTime = Date.now();
		try {
			console.log(`[FILE DOWNLOAD] Attempt ${attempt}/${maxRetries} downloading ${filename} (timeout: ${timeoutMs/1000}s)...`);
			
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
			
			const response = await fetch(url, {
				signal: controller.signal,
				headers: {
					'User-Agent': 'CodeMarque-Bot/1.0',
					'Accept': '*/*',
					'Accept-Encoding': 'gzip, deflate, br'
				}
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
			}
			
			const arrayBuffer = await response.arrayBuffer();
			const downloadTime = Date.now() - attemptStartTime;
			const totalTime = Date.now() - startTime;
			const fileSizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
			const speedMBps = (arrayBuffer.byteLength / 1024 / 1024 / (downloadTime / 1000)).toFixed(2);
			
			console.log(`[FILE DOWNLOAD] ✓ Downloaded ${filename} (${fileSizeMB}MB) in ${downloadTime}ms (${speedMBps} MB/s) - Total time: ${totalTime}ms`);
			
			return arrayBuffer;
		} catch (error) {
			const attemptTime = Date.now() - attemptStartTime;
			console.error(`[FILE DOWNLOAD] ✗ Attempt ${attempt} failed for ${filename} after ${attemptTime}ms:`, error.message);
			
			if (attempt === maxRetries) {
				const totalTime = Date.now() - startTime;
				if (error.name === 'AbortError') {
					throw new Error(`Download timeout after ${timeoutMs/1000} seconds (total time: ${totalTime}ms). The file may be too large or your connection too slow.`);
				} else if (error.message.includes('UND_ERR_CONNECT_TIMEOUT') || error.message.includes('ConnectTimeoutError')) {
					throw new Error(`Connection timeout after ${totalTime}ms. Please check your internet connection and try again.`);
				} else {
					throw error;
				}
			}
			
			// Wait before retry (exponential backoff)
			const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
			console.log(`[FILE DOWNLOAD] Waiting ${waitTime}ms before retry...`);
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}
	}
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

async function processAttachment(attachment, userRequest = '') {
	const attachmentExtension = attachment.name.split('.').pop().toLowerCase();
	const maxFileSize = 30 * 1024 * 1024; // 30MB

	// Text files
	if (attachmentExtension === 'txt') {
		try {
			console.log(`[TEXT PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024).toFixed(2)}KB)...`);
			
			// Use downloadFileWithRetry for text files (15 seconds should be plenty)
			const textBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				15000 // 15 second timeout
			);
			
			const textContent = Buffer.from(textBuffer).toString('utf8');
			console.log(`[TEXT PROCESSING] Successfully processed ${attachment.name}`);
			
			return {
				type: 'text',
				content: textContent,
				filename: attachment.name
			};
		} catch (error) {
			console.error('Error fetching text attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - please check your internet connection and try again.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			}
			
			throw new Error(`Error processing text attachment: ${errorMessage}`);
		}
	} 
	// PDF files
	else if (attachmentExtension === 'pdf') {
		if (attachment.size > maxFileSize) {
			throw new Error('File size exceeds the maximum limit of 30MB');
		}

		try {
			console.log(`[PDF PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024 / 1024).toFixed(2)}MB)...`);
			
			// Use downloadFileWithRetry for PDF files (45 seconds for potentially large documents)
			const pdfBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				45000 // 45 second timeout
			);

			const data = await pdfParse(Buffer.from(pdfBuffer));
			console.log(`[PDF PROCESSING] Successfully processed ${attachment.name} (${data.numpages} pages)`);
			
			return {
				type: 'document',
				content: data.text,
				filename: attachment.name,
				pages: data.numpages
			};
		} catch (error) {
			console.error('Error parsing PDF attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('Could not parse')) {
				errorMessage = 'Invalid or corrupted PDF file';
			} else if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - the PDF file is too large or your connection is too slow. Please try a smaller file or check your internet connection.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			} else {
				errorMessage = 'Error processing PDF attachment';
			}
			
			throw new Error(errorMessage);
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
	// Excel files
	else if (['xlsx', 'xls'].includes(attachmentExtension)) {
		if (attachment.size > maxFileSize) {
			throw new Error('Excel file size exceeds the maximum limit of 30MB');
		}

		try {
			console.log(`[EXCEL PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024 / 1024).toFixed(2)}MB)...`);
			
			const excelBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				45000 // 45 second timeout
			);

			// Parse Excel file using SheetJS
			const workbook = XLSX.read(Buffer.from(excelBuffer), { type: 'buffer' });
			
			// Process all worksheets with increased limits
			const worksheetData = [];
			const MAX_CONTENT_LENGTH = 300000; // 300KB limit (generous for Excel files)
			const MAX_ROWS_PER_SHEET = 1000; // Limit preview to first 1000 rows (generous)
			let totalContentLength = 0;
			
			console.log(`[EXCEL DEBUG] Processing ${workbook.SheetNames.length} worksheets`);
			
			workbook.SheetNames.forEach((sheetName, index) => {
				const worksheet = workbook.Sheets[sheetName];
				const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
				
				// Limit rows for large sheets to prevent API overload
				const limitedJsonData = jsonData.length > MAX_ROWS_PER_SHEET ? 
					jsonData.slice(0, MAX_ROWS_PER_SHEET) : jsonData;
				
				// Create CSV from limited data
				const limitedWorksheet = XLSX.utils.aoa_to_sheet(limitedJsonData);
				const csvData = XLSX.utils.sheet_to_csv(limitedWorksheet);
				const isLimited = jsonData.length > MAX_ROWS_PER_SHEET;
				
				worksheetData.push({
					name: sheetName,
					index: index + 1,
					rows: jsonData.length,
					previewRows: limitedJsonData.length,
					columns: jsonData.length > 0 ? Math.max(...jsonData.map(row => row.length)) : 0,
					csvData: csvData,
					isLimited: isLimited
				});
			});
			
			// Create a comprehensive text representation with size control
			let content = `Excel File: ${attachment.name}\n`;
			content += `Total Worksheets: ${workbook.SheetNames.length}\n\n`;
			
			for (let i = 0; i < worksheetData.length; i++) {
				const sheet = worksheetData[i];
				content += `=== Worksheet ${sheet.index}: "${sheet.name}" ===\n`;
				content += `Dimensions: ${sheet.rows} rows × ${sheet.columns} columns\n`;
				
				if (sheet.isLimited) {
					content += `⚠️ Large dataset - showing first ${sheet.previewRows} rows (${sheet.rows - sheet.previewRows} more rows available)\n\n`;
				} else {
					content += `\n`;
				}
				
				// Check content length before adding CSV data
				const proposedAddition = `Data:\n${sheet.csvData}\n\n`;
				if (totalContentLength + proposedAddition.length > MAX_CONTENT_LENGTH) {
					content += `📊 Data preview truncated to prevent API overload. Worksheet contains ${sheet.rows} rows of data.\n\n`;
					break;
				} else if (sheet.csvData.trim()) {
					content += proposedAddition;
					totalContentLength += proposedAddition.length;
				} else {
					content += `(Empty worksheet)\n\n`;
				}
			}
			
			// Add summary if content was truncated
			if (totalContentLength >= MAX_CONTENT_LENGTH) {
				content += `\n📋 **Summary**: Large Excel file processed. Some data truncated for optimal AI analysis. Total size: ${workbook.SheetNames.length} worksheets with detailed structure preserved.`;
			}

			console.log(`[EXCEL PROCESSING] Successfully processed ${attachment.name} (${workbook.SheetNames.length} sheets)`);
			
			return {
				type: 'spreadsheet',
				content: content,
				filename: attachment.name,
				worksheets: workbook.SheetNames.length,
				sheetsData: worksheetData
			};
		} catch (error) {
			console.error('Error parsing Excel attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - the Excel file is too large or your connection is too slow. Please try a smaller file or check your internet connection.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			} else {
				errorMessage = 'Error processing Excel attachment';
			}
			
			throw new Error(errorMessage);
		}
	}
	// CSV files - Universal Smart Extraction
	else if (attachmentExtension === 'csv') {
		try {
			console.log(`[CSV PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024).toFixed(2)}KB)...`);
			
			const csvBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				30000 // 30 second timeout
			);
			
			const csvContent = Buffer.from(csvBuffer).toString('utf8');
			const csvLines = csvContent.split('\n').filter(line => line.trim());
			
			console.log(`[CSV DEBUG] Original file: ${csvLines.length} rows, ${(csvContent.length/1024).toFixed(2)}KB`);
			
			// Use universal smart extraction
			const extractionResult = performSmartDataExtraction(csvContent, attachment.name, userRequest);
			
			// Apply content size limits for API safety
			let finalExtracted = extractionResult.extracted;
			let isLimited = false;
			
			if (finalExtracted.length > 0) {
				const sampleLength = finalExtracted[0]?.length || 10;
				const estimatedSize = finalExtracted.length * sampleLength;
				
				if (estimatedSize > 8000) { // 8KB safety limit
					const maxItems = Math.floor(8000 / sampleLength);
					finalExtracted = extractionResult.extracted.slice(0, maxItems);
					isLimited = true;
					console.log(`[UNIVERSAL EXTRACTION] Limited output to ${maxItems} items (from ${extractionResult.extracted.length} total)`);
				}
			}
			
			// Create formatted content
			const typeLabel = extractionResult.type.charAt(0).toUpperCase() + extractionResult.type.slice(1);
			const limitedNote = isLimited ? ` (showing first ${finalExtracted.length} of ${extractionResult.extracted.length})` : '';
			
			const contentText = extractionResult.extracted.length > 0 
				? `CSV File: ${attachment.name}\nRows: ${csvLines.length}\nSource: ${extractionResult.source}\n✅ Smart extraction: Found ${extractionResult.extracted.length} ${extractionResult.type}${limitedNote}\n\nExtracted ${typeLabel}:\n${finalExtracted.join('\n')}${isLimited ? `\n\n... and ${extractionResult.extracted.length - finalExtracted.length} more items` : ''}`
				: `CSV File: ${attachment.name}\nRows: ${csvLines.length}\n⚠️ No relevant data found for request: "${userRequest}"\n\nFull content:\n${csvContent.substring(0, 2000)}${csvContent.length > 2000 ? '...' : ''}`;
			
			console.log(`[CSV PROCESSING] Universal extraction complete - ${extractionResult.type}: ${finalExtracted.length} items, content size: ${(contentText.length/1024).toFixed(2)}KB`);
			
			return {
				type: 'csv',
				content: contentText,
				filename: attachment.name,
				rows: csvLines.length,
				extractionType: extractionResult.type,
				extractedCount: finalExtracted.length,
				isOptimized: true
			};
		} catch (error) {
			console.error('Error processing CSV attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - please check your internet connection and try again.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			}
			
			throw new Error(`Error processing CSV attachment: ${errorMessage}`);
		}
	}
	// Word documents
	else if (['docx', 'doc'].includes(attachmentExtension)) {
		if (attachment.size > maxFileSize) {
			throw new Error('Word document size exceeds the maximum limit of 30MB');
		}

		try {
			console.log(`[WORD PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024 / 1024).toFixed(2)}MB)...`);
			
			const wordBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				45000 // 45 second timeout
			);

			// Use mammoth to extract text from Word document
			const result = await mammoth.extractRawText({ buffer: Buffer.from(wordBuffer) });
			const extractedText = result.value;
			const messages = result.messages;
			
			// Log any conversion warnings
			if (messages.length > 0) {
				console.log(`[WORD PROCESSING] Conversion messages:`, messages.map(msg => msg.message));
			}
			
			console.log(`[WORD PROCESSING] Successfully processed ${attachment.name}`);
			
			return {
				type: 'document',
				content: extractedText,
				filename: attachment.name,
				conversionMessages: messages.length > 0 ? messages.map(msg => msg.message) : []
			};
		} catch (error) {
			console.error('Error processing Word attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - the Word document is too large or your connection is too slow. Please try a smaller file or check your internet connection.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			} else {
				errorMessage = 'Error processing Word document';
			}
			
			throw new Error(errorMessage);
		}
	}
	// JSON files
	else if (attachmentExtension === 'json') {
		try {
			console.log(`[JSON PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024).toFixed(2)}KB)...`);
			
			const jsonBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				15000 // 15 second timeout
			);
			
			const jsonText = Buffer.from(jsonBuffer).toString('utf8');
			
			// Validate and format JSON
			try {
				const parsedJson = JSON.parse(jsonText);
				const formattedJson = JSON.stringify(parsedJson, null, 2);
				
				console.log(`[JSON PROCESSING] Successfully processed ${attachment.name}`);
				
				return {
					type: 'structured',
					content: `JSON File: ${attachment.name}\n\nFormatted Content:\n${formattedJson}`,
					filename: attachment.name,
					format: 'json'
				};
			} catch (parseError) {
				// If invalid JSON, treat as text
				console.log(`[JSON PROCESSING] Invalid JSON format, treating as text: ${attachment.name}`);
				
				return {
					type: 'text',
					content: `JSON File (Invalid Format): ${attachment.name}\n\nRaw Content:\n${jsonText}`,
					filename: attachment.name
				};
			}
		} catch (error) {
			console.error('Error processing JSON attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - please check your internet connection and try again.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			}
			
			throw new Error(`Error processing JSON attachment: ${errorMessage}`);
		}
	}
	// XML files
	else if (attachmentExtension === 'xml') {
		try {
			console.log(`[XML PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024).toFixed(2)}KB)...`);
			
			const xmlBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				15000 // 15 second timeout
			);
			
			const xmlText = Buffer.from(xmlBuffer).toString('utf8');
			
			// Parse XML to JSON for better readability
			try {
				const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
				const parsedXml = await parser.parseStringPromise(xmlText);
				const formattedJson = JSON.stringify(parsedXml, null, 2);
				
				console.log(`[XML PROCESSING] Successfully processed ${attachment.name}`);
				
				return {
					type: 'structured',
					content: `XML File: ${attachment.name}\n\nParsed Structure (JSON):\n${formattedJson}\n\nOriginal XML:\n${xmlText}`,
					filename: attachment.name,
					format: 'xml'
				};
			} catch (parseError) {
				// If invalid XML, treat as text
				console.log(`[XML PROCESSING] Invalid XML format, treating as text: ${attachment.name}`);
				
				return {
					type: 'text',
					content: `XML File (Invalid Format): ${attachment.name}\n\nRaw Content:\n${xmlText}`,
					filename: attachment.name
				};
			}
		} catch (error) {
			console.error('Error processing XML attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - please check your internet connection and try again.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			}
			
			throw new Error(`Error processing XML attachment: ${errorMessage}`);
		}
	}
	// YAML files
	else if (['yaml', 'yml'].includes(attachmentExtension)) {
		try {
			console.log(`[YAML PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024).toFixed(2)}KB)...`);
			
			const yamlBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				15000 // 15 second timeout
			);
			
			const yamlText = Buffer.from(yamlBuffer).toString('utf8');
			
			// Parse YAML to JSON for better readability
			try {
				const parsedYaml = yaml.load(yamlText);
				const formattedJson = JSON.stringify(parsedYaml, null, 2);
				
				console.log(`[YAML PROCESSING] Successfully processed ${attachment.name}`);
				
				return {
					type: 'structured',
					content: `YAML File: ${attachment.name}\n\nParsed Structure (JSON):\n${formattedJson}\n\nOriginal YAML:\n${yamlText}`,
					filename: attachment.name,
					format: 'yaml'
				};
			} catch (parseError) {
				// If invalid YAML, treat as text
				console.log(`[YAML PROCESSING] Invalid YAML format, treating as text: ${attachment.name}`);
				
				return {
					type: 'text',
					content: `YAML File (Invalid Format): ${attachment.name}\n\nRaw Content:\n${yamlText}`,
					filename: attachment.name
				};
			}
		} catch (error) {
			console.error('Error processing YAML attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - please check your internet connection and try again.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			}
			
			throw new Error(`Error processing YAML attachment: ${errorMessage}`);
		}
	}
	// Markdown files
	else if (attachmentExtension === 'md') {
		try {
			console.log(`[MARKDOWN PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024).toFixed(2)}KB)...`);
			
			const markdownBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				15000 // 15 second timeout
			);
			
			const markdownContent = Buffer.from(markdownBuffer).toString('utf8');
			console.log(`[MARKDOWN PROCESSING] Successfully processed ${attachment.name}`);
			
			return {
				type: 'text',
				content: `Markdown File: ${attachment.name}\n\nContent:\n${markdownContent}`,
				filename: attachment.name,
				format: 'markdown'
			};
		} catch (error) {
			console.error('Error processing Markdown attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - please check your internet connection and try again.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			}
			
			throw new Error(`Error processing Markdown attachment: ${errorMessage}`);
		}
	}
	// Code files
	else if (SUPPORTED_CODE_TYPES.includes(attachmentExtension)) {
		try {
			console.log(`[CODE PROCESSING] Starting download of ${attachment.name} (${(attachment.size / 1024).toFixed(2)}KB)...`);
			
			const codeBuffer = await downloadFileWithRetry(
				attachment.url,
				attachment.name,
				3, // 3 retries
				15000 // 15 second timeout
			);
			
			const codeContent = Buffer.from(codeBuffer).toString('utf8');
			const lineCount = codeContent.split('\n').length;
			
			// Limit content for very large code files
			const MAX_CODE_CONTENT = 75000; // 75KB limit for code files (3x more generous)
			const MAX_CODE_LINES = 2000; // First 2000 lines (4x more generous)
			let finalContent = codeContent;
			let isLimited = false;
			
			if (codeContent.length > MAX_CODE_CONTENT || lineCount > MAX_CODE_LINES) {
				const lines = codeContent.split('\n');
				const limitedLines = lines.slice(0, MAX_CODE_LINES);
				finalContent = limitedLines.join('\n');
				isLimited = true;
				console.log(`[CODE PROCESSING] Large file detected - limiting to ${MAX_CODE_LINES} lines (original: ${lineCount} lines, ${(codeContent.length/1024).toFixed(2)}KB)`);
			}
			
			console.log(`[CODE PROCESSING] Successfully processed ${attachment.name} (${lineCount} lines)`);
			
			const contentText = isLimited ?
				`Code File: ${attachment.name}\nLanguage: ${attachmentExtension}\nLines: ${lineCount} (showing first ${MAX_CODE_LINES} lines)\n⚠️ Large file truncated for optimal processing\n\nContent:\n${finalContent}` :
				`Code File: ${attachment.name}\nLanguage: ${attachmentExtension}\nLines: ${lineCount}\n\nContent:\n${finalContent}`;
			
			return {
				type: 'code',
				content: contentText,
				filename: attachment.name,
				language: attachmentExtension,
				lines: lineCount,
				isLimited: isLimited
			};
		} catch (error) {
			console.error('Error processing code attachment:', error);
			
			let errorMessage = error.message;
			if (error.message.includes('timeout')) {
				errorMessage = `Download timeout - please check your internet connection and try again.`;
			} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
				errorMessage = `Network connection issue. Please check your internet connection and try again.`;
			}
			
			throw new Error(`Error processing code attachment: ${errorMessage}`);
		}
	}
	else {
		throw new Error(`Unsupported file type: ${attachmentExtension}. Supported types: Images (${SUPPORTED_IMAGE_TYPES.join(', ')}), Videos (${SUPPORTED_VIDEO_TYPES.join(', ')}), Audio (${SUPPORTED_AUDIO_TYPES.join(', ')}), Documents (${SUPPORTED_DOCUMENT_TYPES.join(', ')}), Code (${SUPPORTED_CODE_TYPES.join(', ')})`);
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
			case 'spreadsheet':
			case 'csv':
			case 'structured':
			case 'code':
				const formattedText = `\n\n**File: ${attachment.filename}**\n${attachment.content}`;
				console.log(`[API DEBUG] Formatted content for ${attachment.filename}: ${(formattedText.length/1024).toFixed(2)}KB`);
				return {
					text: formattedText
				};
			
			case 'image':
				try {
					// Download image file from Discord with timeout and retry logic
					console.log(`[IMAGE PROCESSING] Starting download of ${attachment.filename} (${(attachment.size / 1024 / 1024).toFixed(2)}MB)...`);
					
					// Use appropriate timeout for images (30 seconds) with retries
					const imageBuffer = await downloadFileWithRetry(
						attachment.url, 
						attachment.filename, 
						3, // 3 retries
						30000 // 30 second timeout (images are usually smaller than videos)
					);
					
					const buffer = Buffer.from(imageBuffer);
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
					
					// Provide more specific error messages
					let errorMessage = error.message;
					if (error.message.includes('timeout')) {
						errorMessage = `Download timeout - the image file is too large or your connection is too slow. Please try a smaller file or check your internet connection.`;
					} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
						errorMessage = `Network connection issue. Please check your internet connection and try again.`;
					}
					
					return {
						text: `\n\n**Image Processing Error**: ${attachment.filename} could not be processed - ${errorMessage}`
					};
				}
			
			case 'video':
				try {
					// Download video file from Discord with extended timeout and retry logic
					console.log(`[VIDEO PROCESSING] Starting download of ${attachment.filename} (${(attachment.size / 1024 / 1024).toFixed(2)}MB)...`);
					
					// Use longer timeout for videos (2 minutes) and more retries
					const videoBuffer = await downloadFileWithRetry(
						attachment.url, 
						attachment.filename, 
						3, // 3 retries
						120000 // 2 minute timeout
					);
					
					const videoBlob = new Blob([videoBuffer], { type: attachment.mimeType });
					
					console.log(`[VIDEO PROCESSING] Successfully downloaded ${attachment.filename} for Google Files API processing`);
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
					
					// Provide more specific error messages
					let errorMessage = error.message;
					if (error.message.includes('timeout')) {
						errorMessage = `Download timeout - the video file is too large or your connection is too slow. Please try a smaller file or check your internet connection.`;
					} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
						errorMessage = `Network connection issue. Please check your internet connection and try again.`;
					}
					
					return {
						text: `\n\n**Video Processing Error**: ${attachment.filename} could not be processed - ${errorMessage}`
					};
				}
			
			case 'audio':
				try {
					// Download audio file from Discord with timeout and retry logic
					console.log(`[AUDIO PROCESSING] Starting download of ${attachment.filename} (${(attachment.size / 1024 / 1024).toFixed(2)}MB)...`);
					
					// Use standard timeout for audio files (60 seconds)
					const audioBuffer = await downloadFileWithRetry(
						attachment.url, 
						attachment.filename, 
						3, // 3 retries
						60000 // 1 minute timeout
					);
					
					const audioBlob = new Blob([audioBuffer], { type: attachment.mimeType });
					
					console.log(`[AUDIO PROCESSING] Successfully downloaded ${attachment.filename} for Google Files API processing`);
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
					
					// Provide more specific error messages
					let errorMessage = error.message;
					if (error.message.includes('timeout')) {
						errorMessage = `Download timeout - the audio file is too large or your connection is too slow. Please try a smaller file or check your internet connection.`;
					} else if (error.message.includes('Connection timeout') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
						errorMessage = `Network connection issue. Please check your internet connection and try again.`;
					}
					
					return {
						text: `\n\n**Audio Processing Error**: ${attachment.filename} could not be processed - ${errorMessage}`
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

// Universal Smart Data Extraction - works with ANY structured data
function performSmartDataExtraction(data, filename, userRequest = '') {
	console.log(`[SMART EXTRACTION] Starting analysis for ${filename}`);
	
	// Parse user request for extraction hints - prioritize explicit requests
	const requestLower = userRequest.toLowerCase();
	const wantsNumbers = /\b(number|id|phone|zip|code|customer_id|price|amount|quantity)\b/i.test(requestLower) && !/\b(name)\b/i.test(requestLower);
	const wantsNames = /\b(name|first|last|full|customer|client|person|user|title)\b/i.test(requestLower);
	const wantsEmails = /\b(email|mail|address|contact)\b/i.test(requestLower) && !/\b(name)\b/i.test(requestLower);
	const wantsDates = /\b(date|time|created|updated|subscription|birth)\b/i.test(requestLower) && !/\b(name)\b/i.test(requestLower);
	
	console.log(`[SMART EXTRACTION] Request analysis: "${userRequest}" -> Names:${wantsNames}, Numbers:${wantsNumbers}, Emails:${wantsEmails}, Dates:${wantsDates}`);
	
	let extractedData = [];
	let extractionType = 'data';
	let sourceInfo = '';
	
	try {
		// Handle different data structures
		if (typeof data === 'string') {
			// Handle CSV-like string data
			const lines = data.split('\n').filter(line => line.trim());
			if (lines.length > 1) {
				const header = lines[0];
				const headerCols = header.split(',').map(col => col.trim().replace(/["']/g, ''));
				
				return extractFromTabularData(lines, headerCols, wantsNumbers, wantsNames, wantsEmails, wantsDates, filename);
			}
		}
		else if (Array.isArray(data)) {
			// Handle array of objects (from JSON, Excel worksheets, etc.)
			if (data.length > 0 && typeof data[0] === 'object') {
				const keys = Object.keys(data[0]);
				console.log(`[SMART EXTRACTION] Array of objects detected, keys: ${keys.join(', ')}`);
				
				return extractFromObjectArray(data, keys, wantsNumbers, wantsNames, wantsEmails, wantsDates, filename);
			}
		}
		else if (typeof data === 'object') {
			// Handle object structures (JSON, XML converted to objects)
			return extractFromObjectStructure(data, wantsNumbers, wantsNames, wantsEmails, wantsDates, filename);
		}
		
		// Fallback for unstructured data
		console.log(`[SMART EXTRACTION] No structured data found in ${filename}`);
		return {
			extracted: [],
			type: 'none',
			source: filename,
			message: 'No extractable structured data found'
		};
		
	} catch (error) {
		console.error(`[SMART EXTRACTION ERROR] Failed to extract from ${filename}:`, error);
		return {
			extracted: [],
			type: 'error',
			source: filename,
			message: `Extraction failed: ${error.message}`
		};
	}
}

// Extract from tabular data (CSV, Excel rows)
function extractFromTabularData(lines, headerCols, wantsNumbers, wantsNames, wantsEmails, wantsDates, filename) {
	console.log(`[TABULAR EXTRACTION] Analyzing ${lines.length} rows with columns: ${headerCols.join(', ')}`);
	
	// Find target column based on user request and column analysis
	let targetCol = 0;
	let extractionType = 'data';
	
	// Priority matching based on user request - names first when explicitly requested
	if (wantsNames) {
		const nameCol = headerCols.findIndex(col => /\b(name|first|last|full|customer|client|person|user|title)\b/i.test(col));
		if (nameCol !== -1) { targetCol = nameCol; extractionType = 'names'; }
	}
	if (wantsNumbers && extractionType === 'data') {
		const numberCol = headerCols.findIndex(col => /\b(id|number|phone|zip|code|customer_id|account|price|amount|quantity|total)\b/i.test(col));
		if (numberCol !== -1) { targetCol = numberCol; extractionType = 'numbers'; }
	}
	if (wantsEmails && extractionType === 'data') {
		const emailCol = headerCols.findIndex(col => /\b(email|mail|address|contact)\b/i.test(col));
		if (emailCol !== -1) { targetCol = emailCol; extractionType = 'emails'; }
	}
	if (wantsDates && extractionType === 'data') {
		const dateCol = headerCols.findIndex(col => /\b(date|time|created|updated|subscription|birth)\b/i.test(col));
		if (dateCol !== -1) { targetCol = dateCol; extractionType = 'dates'; }
	}
	
	console.log(`[TABULAR EXTRACTION] Using column "${headerCols[targetCol]}" (index ${targetCol}) for ${extractionType}`);
	
	// Extract data from target column
	const dataRows = lines.slice(1);
	const extracted = [];
	
	dataRows.forEach(row => {
		const cols = row.split(',');
		if (cols.length > targetCol && cols[targetCol]) {
			const value = cols[targetCol].trim().replace(/["']/g, '');
			if (value) extracted.push(value);
		}
	});
	
	return {
		extracted: extracted,
		type: extractionType,
		source: `${filename} - Column: ${headerCols[targetCol]}`,
		totalRows: dataRows.length
	};
}

// Extract from array of objects (JSON arrays, Excel worksheets)
function extractFromObjectArray(data, keys, wantsNumbers, wantsNames, wantsEmails, wantsDates, filename) {
	console.log(`[OBJECT ARRAY EXTRACTION] Analyzing ${data.length} objects with keys: ${keys.join(', ')}`);
	
	// Find target key based on user request
	let targetKey = keys[0];
	let extractionType = 'data';
	
	if (wantsNumbers) {
		const numberKey = keys.find(key => /\b(id|number|phone|zip|code|customer_id|account|price|amount|quantity)\b/i.test(key));
		if (numberKey) { targetKey = numberKey; extractionType = 'numbers'; }
	}
	if (wantsNames && extractionType === 'data') {
		const nameKey = keys.find(key => /\b(name|first|last|full|customer|client|person|user|title)\b/i.test(key));
		if (nameKey) { targetKey = nameKey; extractionType = 'names'; }
	}
	if (wantsEmails && extractionType === 'data') {
		const emailKey = keys.find(key => /\b(email|mail|address|contact)\b/i.test(key));
		if (emailKey) { targetKey = emailKey; extractionType = 'emails'; }
	}
	if (wantsDates && extractionType === 'data') {
		const dateKey = keys.find(key => /\b(date|time|created|updated|subscription|birth)\b/i.test(key));
		if (dateKey) { targetKey = dateKey; extractionType = 'dates'; }
	}
	
	console.log(`[OBJECT ARRAY EXTRACTION] Using key "${targetKey}" for ${extractionType}`);
	
	// Extract values from target key
	const extracted = data.map(obj => obj[targetKey])
		.filter(value => value !== undefined && value !== null && value !== '')
		.map(value => String(value).trim());
	
	return {
		extracted: extracted,
		type: extractionType,
		source: `${filename} - Key: ${targetKey}`,
		totalObjects: data.length
	};
}

// Extract from complex object structures (nested JSON, XML)
function extractFromObjectStructure(data, wantsNumbers, wantsNames, wantsEmails, wantsDates, filename) {
	console.log(`[OBJECT STRUCTURE EXTRACTION] Analyzing complex object structure`);
	
	const extracted = [];
	let extractionType = 'data';
	
	// Recursively search for relevant data
	function searchObject(obj, path = '') {
		for (const [key, value] of Object.entries(obj)) {
			const currentPath = path ? `${path}.${key}` : key;
			
			if (Array.isArray(value)) {
				// If it's an array of objects, extract from it
				if (value.length > 0 && typeof value[0] === 'object') {
					const arrayResult = extractFromObjectArray(value, Object.keys(value[0]), wantsNumbers, wantsNames, wantsEmails, wantsDates, `${filename}[${currentPath}]`);
					if (arrayResult.extracted.length > 0) {
						extracted.push(...arrayResult.extracted);
						extractionType = arrayResult.type;
					}
				}
			} else if (typeof value === 'object' && value !== null) {
				// Recursively search nested objects
				searchObject(value, currentPath);
			} else if (typeof value === 'string' || typeof value === 'number') {
				// Check if this value matches what we're looking for
				const keyLower = key.toLowerCase();
				const valueStr = String(value).trim();
				
				if (wantsNumbers && (/\b(id|number|phone|zip|code|account|price|amount)\b/i.test(keyLower) || /^\d+(\.\d+)?$/.test(valueStr))) {
					extracted.push(valueStr);
					extractionType = 'numbers';
				} else if (wantsNames && /\b(name|first|last|full|customer|client|person|user|title)\b/i.test(keyLower)) {
					extracted.push(valueStr);
					extractionType = 'names';
				} else if (wantsEmails && (/\b(email|mail|address|contact)\b/i.test(keyLower) || /@.*\./i.test(valueStr))) {
					extracted.push(valueStr);
					extractionType = 'emails';
				} else if (wantsDates && /\b(date|time|created|updated|subscription|birth)\b/i.test(keyLower)) {
					extracted.push(valueStr);
					extractionType = 'dates';
				}
			}
		}
	}
	
	searchObject(data);
	
	return {
		extracted: [...new Set(extracted)], // Remove duplicates
		type: extractionType,
		source: filename,
		totalFound: extracted.length
	};
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
						const attachmentContent = await processAttachment(attachment, messageContent);
						
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

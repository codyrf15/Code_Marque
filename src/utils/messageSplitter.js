const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * MessageSplitter - Intelligent message splitting utility for Discord
 * 
 * Key Features:
 * - Respects Discord's 2000 character limit
 * - Preserves code block integrity (never splits inside code blocks)
 * - Uses natural language boundaries for optimal readability
 * - Falls back to AttachmentBuilder for oversized code blocks
 * - Maintains Markdown formatting across splits
 * - Handles edge cases and malformed input gracefully
 */
class MessageSplitter {
    constructor(options = {}) {
        this.maxLength = options.maxLength || 2000;
        this.attachmentFallbackThreshold = options.attachmentFallbackThreshold || Math.max(this.maxLength * 0.8, 100); // Leave room for formatting
        this.tempDir = options.tempDir || './temp';
        this.fileExtensions = {
            javascript: 'js',
            typescript: 'ts', 
            python: 'py',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            csharp: 'cs',
            php: 'php',
            ruby: 'rb',
            go: 'go',
            rust: 'rs',
            swift: 'swift',
            kotlin: 'kt',
            sql: 'sql',
            html: 'html',
            css: 'css',
            json: 'json',
            xml: 'xml',
            yaml: 'yml',
            markdown: 'md',
            bash: 'sh',
            shell: 'sh',
            powershell: 'ps1'
        };

        // Ensure temp directory exists
        this.ensureTempDirectory();
    }

    /**
     * Main entry point for splitting messages
     * @param {string} content - The message content to split
     * @param {Object} options - Split options
     * @returns {Array} Array of message objects
     */
    async splitMessage(content, options = {}) {
        if (!content || typeof content !== 'string') {
            return [{ content: '', type: 'text' }];
        }

        // Always process content to identify code blocks and structure
        // Even short messages may contain code blocks that need special handling

        try {
            // Parse and identify all code blocks
            const parsedContent = this.parseCodeBlocks(content);
            
            // Split the content intelligently
            const messages = await this.processContentSegments(parsedContent, options);
            
            return messages.filter(msg => msg.content && msg.content.trim().length > 0);
        } catch (error) {
            console.error('[MessageSplitter] Error splitting message:', error);
            // Fallback to basic text splitting
            return this.createBasicTextSplit(content);
        }
    }

    /**
     * Parse content to identify and extract code blocks
     * @param {string} content - Content to parse
     * @returns {Array} Array of content segments with type metadata
     */
    parseCodeBlocks(content) {
        const segments = [];
        const codeBlockRegex = /```([^\n]*)\n?([\s\S]*?)```/g;
        
        let lastIndex = 0;
        let match;

        // Find all multi-line code blocks
        while ((match = codeBlockRegex.exec(content)) !== null) {
            // Add text before code block
            if (match.index > lastIndex) {
                const textBefore = content.slice(lastIndex, match.index);
                if (textBefore.trim()) {
                    segments.push({
                        type: 'text',
                        content: textBefore.trim(),
                        start: lastIndex,
                        end: match.index
                    });
                }
            }

            // Add code block
            const language = (match[1] || '').trim();
            const code = match[2] || '';
            segments.push({
                type: 'codeblock',
                content: match[0],
                language: language,
                code: code,
                start: match.index,
                end: match.index + match[0].length
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < content.length) {
            const remainingText = content.slice(lastIndex);
            if (remainingText.trim()) {
                segments.push({
                    type: 'text',
                    content: remainingText.trim(),
                    start: lastIndex,
                    end: content.length
                });
            }
        }

        // If no code blocks found, return the entire content as text
        if (segments.length === 0) {
            segments.push({
                type: 'text',
                content: content,
                start: 0,
                end: content.length
            });
        }

        return segments;
    }

    /**
     * Process content segments and create message splits
     * @param {Array} segments - Parsed content segments
     * @param {Object} options - Processing options
     * @returns {Array} Array of message objects
     */
    async processContentSegments(segments, options = {}) {
        const segmentPromises = segments.map(async (segment) => {
            if (segment.type === 'codeblock') {
                return await this.handleCodeBlock(segment, options);
            } else if (segment.type === 'text') {
                return this.handleTextSegment(segment.content);
            }
            return [];
        });

        const segmentResults = await Promise.all(segmentPromises);
        return segmentResults.flat();
    }

    /**
     * Handle code block segments - either inline or as attachment
     * @param {Object} segment - Code block segment
     * @param {Object} options - Processing options
     * @returns {Array} Array of message objects
     */
    async handleCodeBlock(segment, options = {}) {
        const { content, language, code } = segment;

        // Check if code block fits within Discord limits
        if (content.length <= this.attachmentFallbackThreshold) {
            return [{
                content: content,
                type: 'codeblock',
                language: language
            }];
        }

        // Code block is too large - create as attachment
        try {
            const attachment = await this.createCodeAttachment(code, language, options);
            return [{
                content: `\`\`\`${language}\n[Code too large - see attachment]\n\`\`\``,
                type: 'codeblock_attachment',
                attachment: attachment,
                language: language
            }];
        } catch (error) {
            console.error('[MessageSplitter] Failed to create code attachment:', error);
            // Fallback to splitting the code block
            return this.splitLargeCodeBlock(segment);
        }
    }

    /**
     * Create file attachment for large code blocks
     * @param {string} code - Code content
     * @param {string} language - Programming language
     * @param {Object} options - Options for file creation
     * @returns {AttachmentBuilder} Discord attachment
     */
    async createCodeAttachment(code, language, options = {}) {
        const timestamp = Date.now();
        const extension = this.fileExtensions[language.toLowerCase()] || 'txt';
        const filename = options.filename || `code_${timestamp}.${extension}`;
        const filepath = path.join(this.tempDir, filename);

        // Write code to temporary file
        await fs.promises.writeFile(filepath, code, 'utf8');

        // Create Discord attachment
        const attachment = new AttachmentBuilder(filepath, { 
            name: filename,
            description: `Code snippet (${language || 'text'})`
        });

        // Schedule file cleanup after a delay
        setTimeout(() => {
            this.cleanupTempFile(filepath);
        }, 60000); // Clean up after 1 minute

        return attachment;
    }

    /**
     * Split large code blocks into multiple messages
     * @param {Object} segment - Code block segment
     * @returns {Array} Array of message objects
     */
    splitLargeCodeBlock(segment) {
        const { language, code } = segment;
        const messages = [];
        const lines = code.split('\n');
        
        let currentChunk = '';
        let chunkNumber = 1;
        
        for (const line of lines) {
            const testChunk = `\`\`\`${language}\n${currentChunk}${currentChunk ? '\n' : ''}${line}\n\`\`\``;
            
            if (testChunk.length > this.maxLength && currentChunk.length > 0) {
                // Current chunk is full, close it
                messages.push({
                    content: `\`\`\`${language}\n${currentChunk}\n\`\`\``,
                    type: 'codeblock_split',
                    language: language,
                    partNumber: chunkNumber
                });
                
                currentChunk = line;
                chunkNumber++;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }

        // Add final chunk
        if (currentChunk.trim()) {
            messages.push({
                content: `\`\`\`${language}\n${currentChunk}\n\`\`\``,
                type: 'codeblock_split',
                language: language,
                partNumber: chunkNumber
            });
        }

        return messages;
    }

    /**
     * Handle text segments with natural language boundary detection
     * @param {string} text - Text content to split
     * @returns {Array} Array of message objects
     */
    handleTextSegment(text) {
        if (text.length <= this.maxLength) {
            return [{
                content: text,
                type: 'text'
            }];
        }

        return this.splitTextIntelligently(text);
    }

    /**
     * Split text using natural language boundaries
     * @param {string} text - Text to split
     * @returns {Array} Array of message objects
     */
    splitTextIntelligently(text) {
        const messages = [];
        let remaining = text.trim();

        while (remaining.length > this.maxLength) {
            const chunk = remaining.slice(0, this.maxLength);
            const breakPoint = this.findOptimalBreakPoint(chunk);
            
            const messageContent = remaining.slice(0, breakPoint).trim();
            if (messageContent) {
                messages.push({
                    content: messageContent,
                    type: 'text'
                });
            }

            remaining = remaining.slice(breakPoint).trim();
        }

        // Add remaining content
        if (remaining) {
            messages.push({
                content: remaining,
                type: 'text'
            });
        }

        return messages;
    }

    /**
     * Find optimal break point for text splitting
     * @param {string} text - Text chunk to analyze
     * @returns {number} Optimal break point index
     */
    findOptimalBreakPoint(text) {
        const length = text.length;
        
        // Look for paragraph breaks (best option)
        const lastParagraph = text.lastIndexOf('\n\n');
        if (lastParagraph > length * 0.4) {
            return lastParagraph + 2;
        }

        // Look for sentence endings
        const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
        let bestSentenceEnd = -1;
        
        for (const ender of sentenceEnders) {
            const pos = text.lastIndexOf(ender);
            if (pos > length * 0.5 && pos > bestSentenceEnd) {
                bestSentenceEnd = pos + ender.length;
            }
        }
        
        if (bestSentenceEnd > -1) {
            return bestSentenceEnd;
        }

        // Look for line breaks
        const lastNewline = text.lastIndexOf('\n');
        if (lastNewline > length * 0.3) {
            return lastNewline + 1;
        }

        // Look for word boundaries
        const lastSpace = text.lastIndexOf(' ');
        if (lastSpace > length * 0.3) {
            return lastSpace + 1;
        }

        // Fallback to character limit
        return length;
    }

    /**
     * Create basic text split as fallback
     * @param {string} content - Content to split
     * @returns {Array} Array of message objects
     */
    createBasicTextSplit(content) {
        const messages = [];
        let remaining = content;

        while (remaining.length > this.maxLength) {
            const chunk = remaining.slice(0, this.maxLength);
            const lastSpace = chunk.lastIndexOf(' ');
            const breakPoint = lastSpace > this.maxLength * 0.5 ? lastSpace : this.maxLength;

            messages.push({
                content: remaining.slice(0, breakPoint).trim(),
                type: 'text'
            });

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

    /**
     * Ensure temp directory exists
     */
    ensureTempDirectory() {
        try {
            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir, { recursive: true });
            }
        } catch (error) {
            console.error('[MessageSplitter] Failed to create temp directory:', error);
        }
    }

    /**
     * Clean up temporary file
     * @param {string} filepath - Path to file to clean up
     */
    cleanupTempFile(filepath) {
        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`[MessageSplitter] Cleaned up temp file: ${filepath}`);
            }
        } catch (error) {
            console.error(`[MessageSplitter] Failed to cleanup temp file ${filepath}:`, error);
        }
    }

    /**
     * Validate and sanitize message content
     * @param {string} content - Content to validate
     * @returns {string} Sanitized content
     */
    sanitizeContent(content) {
        if (!content || typeof content !== 'string') {
            return '';
        }

        // Remove potential Discord formatting issues
        return content
            // eslint-disable-next-line no-control-regex
            .replace(/\u0000/g, '') // Remove null characters
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
            .trim();
    }
}

module.exports = { MessageSplitter };
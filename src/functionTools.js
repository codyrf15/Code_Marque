// Discord Bot Function Tools for Gemini
// Based on Context7 best practices

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get current time and date
 */
function getCurrentTime() {
    // Returns the current date and time
    const now = new Date();
    return {
        datetime: now.toISOString(),
        formatted: now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        })
    };
}

/**
 * Calculate basic math operations
 */
function calculateMath(expression) {
    // Safely evaluates basic math expressions like '2 + 2', '10 * 5', etc.
    try {
        // Only allow basic math operations for security
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
        if (sanitized !== expression) {
            throw new Error('Only basic math operations are allowed');
        }
        
        const result = Function('"use strict"; return (' + sanitized + ')')();
        return {
            expression: expression,
            result: result,
            type: typeof result
        };
    } catch (error) {
        return {
            error: `Cannot calculate: ${error.message}`,
            expression: expression
        };
    }
}

/**
 * Generate a random number within a range
 */
function generateRandomNumber(min = 1, max = 100) {
    // Generates a random number between min and max (inclusive)
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    return {
        number: randomNum,
        range: `${min}-${max}`
    };
}

/**
 * Get Discord server information
 */
function getServerInfo(message) {
    // Gets information about the current Discord server/guild
    if (message.channel.type === 1) {
        return {
            type: 'Direct Message',
            info: 'This is a private conversation'
        };
    }
    
    const guild = message.guild;
    return {
        serverName: guild.name,
        serverID: guild.id,
        memberCount: guild.memberCount,
        createdAt: guild.createdAt.toLocaleDateString(),
        channels: guild.channels.cache.size,
        roles: guild.roles.cache.size
    };
}

/**
 * Format text in different styles
 */
function formatText(text, style = 'normal') {
    // Formats text in different Discord markdown styles
    const styles = {
        bold: `**${text}**`,
        italic: `*${text}*`,
        underline: `__${text}__`,
        strikethrough: `~~${text}~~`,
        code: `\`${text}\``,
        codeblock: `\`\`\`\n${text}\n\`\`\``,
        spoiler: `||${text}||`,
        normal: text
    };
    
    return {
        original: text,
        formatted: styles[style] || styles.normal,
        style: style
    };
}

/**
 * Count words and characters in text
 */
function analyzeText(text) {
    // Analyzes text to count words, characters, sentences, etc.
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);
    
    return {
        characters: text.length,
        charactersNoSpaces: text.replace(/\s/g, '').length,
        words: words.length,
        sentences: sentences.length,
        paragraphs: paragraphs.length,
        averageWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length * 100) / 100 : 0
    };
}

/**
 * Generate Mermaid diagrams as PNG images
 */
function generateMermaidDiagram(mermaidCode, theme = 'default', backgroundColor = 'white', filename = null) {
    // Generates a PNG image from Mermaid diagram syntax
    try {
        // Check if we're in an environment that supports Chrome (like Docker/CI)
        // First try to detect if Chrome dependencies are available
        try {
            execSync('which google-chrome-stable', { stdio: 'pipe' });
        } catch {
            try {
                execSync('which chromium-browser', { stdio: 'pipe' });
            } catch {
                // No Chrome found, return a helpful message
                return {
                    success: false,
                    error: 'Chrome/Chromium not available in this environment',
                    inputSyntax: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : ''),
                    troubleshooting: 'Mermaid diagram generation requires Chrome/Chromium. Install with: apt-get update && apt-get install -y chromium-browser, or use this feature in a Docker environment with Chrome support.',
                    fallbackSuggestion: 'You can copy the Mermaid code and use online tools like https://mermaid.live for diagram generation.'
                };
            }
        }
        
        // Create a temporary directory for diagram files
        const tempDir = path.join(os.tmpdir(), 'mermaid-diagrams');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate unique filename if not provided
        const timestamp = Date.now();
        const diagramName = filename || `diagram_${timestamp}`;
        const inputFile = path.join(tempDir, `${diagramName}.mmd`);
        const outputFile = path.join(tempDir, `${diagramName}.png`);
        
        // Write Mermaid code to temporary file
        fs.writeFileSync(inputFile, mermaidCode, 'utf8');
        
        // Build mmdc command with options, using system Chrome
        let command = `npx mmdc -i "${inputFile}" -o "${outputFile}" --puppeteerConfig '{"executablePath": "/usr/bin/chromium-browser"}'`;
        
        // Add theme if specified
        if (theme && theme !== 'default') {
            command += ` -t ${theme}`;
        }
        
        // Add background color if specified
        if (backgroundColor && backgroundColor !== 'white') {
            command += ` -b ${backgroundColor}`;
        }
        
        // Execute the mermaid CLI command
        console.log(`Executing: ${command}`);
        execSync(command, { stdio: 'pipe' });
        
        // Check if output file was created
        if (!fs.existsSync(outputFile)) {
            throw new Error('Failed to generate diagram - output file not created');
        }
        
        // Get file stats
        const stats = fs.statSync(outputFile);
        
        return {
            success: true,
            imagePath: outputFile,
            filename: `${diagramName}.png`,
            fileSize: stats.size,
            theme: theme,
            backgroundColor: backgroundColor,
            inputSyntax: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : '')
        };
        
    } catch (error) {
        console.error('Mermaid diagram generation error:', error);
        
        // Check if it's a Chrome-related error
        const isChromeError = error.message.includes('Chrome') || 
                             error.message.includes('libnss3') || 
                             error.message.includes('browser process');
        
        return {
            success: false,
            error: error.message,
            inputSyntax: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : ''),
            troubleshooting: isChromeError ? 
                'Chrome dependencies missing. Install with: apt-get update && apt-get install -y chromium-browser libnss3 libatk-bridge2.0-0 libdrm2' :
                'Check that the Mermaid syntax is valid. Common issues: missing diagram type declaration, invalid node connections, or unsupported diagram features.',
            fallbackSuggestion: 'You can copy the Mermaid code and use online tools like https://mermaid.live for diagram generation.'
        };
    }
}

// Export all tools for use in the Discord bot
const discordBotTools = [
    getCurrentTime,
    calculateMath,
    generateRandomNumber,
    getServerInfo,
    formatText,
    analyzeText,
    generateMermaidDiagram
];

module.exports = {
    discordBotTools,
    getCurrentTime,
    calculateMath,
    generateRandomNumber,
    getServerInfo,
    formatText,
    analyzeText,
    generateMermaidDiagram
}; 
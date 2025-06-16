// Discord Bot Function Tools for Gemini
// Based on Context7 best practices

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// const os = require('os'); // Reserved for future server info functions

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
 * Generate Mermaid diagrams as PNG images using Docker
 */
function generateMermaidDiagram(mermaidCode, theme = 'default', backgroundColor = 'white', filename = null) {
    // Generates a PNG image from Mermaid diagram syntax using Docker
    try {
        // Validate Mermaid code input
        if (!mermaidCode || typeof mermaidCode !== 'string' || mermaidCode.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid or empty Mermaid code provided',
                inputSyntax: mermaidCode ? mermaidCode.substring(0, 100) : 'undefined',
                troubleshooting: 'Please provide valid Mermaid diagram syntax. Example: "graph TD\nA-->B"'
            };
        }

        // Create a temporary directory for diagram files
        const tempDir = path.join(process.cwd(), 'temp', 'mermaid-diagrams');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate unique filename if not provided
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const diagramName = filename || `diagram_${timestamp}_${randomSuffix}`;
        const inputFile = path.join(tempDir, `${diagramName}.mmd`);
        const outputFile = path.join(tempDir, `${diagramName}.png`);
        
        // Write Mermaid code to temporary file
        fs.writeFileSync(inputFile, mermaidCode, 'utf8');
        
        // Build Docker command using minlag/mermaid-cli
        // Mount the temp directory and use Docker for isolated execution
        const dockerCmd = [
            'docker', 'run', '--rm',
            '-u', `${process.getuid()}:${process.getgid()}`, // Use current user's UID/GID
            '-v', `${tempDir}:/data`,
            '--security-opt', 'seccomp=unconfined', // Required for Chrome in Docker
            'minlag/mermaid-cli',
            '-i', `/data/${diagramName}.mmd`,
            '-o', `/data/${diagramName}.png`
        ];
        
        // Add theme if specified and not default
        if (theme && theme !== 'default') {
            dockerCmd.push('-t', theme);
        }
        
        // Add background color if specified and not white
        if (backgroundColor && backgroundColor !== 'white') {
            dockerCmd.push('-b', backgroundColor);
        }
        
        console.log(`[Mermaid] Executing Docker command: ${dockerCmd.join(' ')}`);
        
        try {
            // Execute the Docker command with timeout
            execSync(dockerCmd.join(' '), { 
                stdio: 'pipe',
                timeout: 30000, // 30 second timeout
                cwd: process.cwd()
            });
        } catch (dockerError) {
            // Check if Docker is available
            try {
                execSync('docker --version', { stdio: 'pipe' });
            } catch {
                return {
                    success: false,
                    error: 'Docker not available in this environment',
                    inputSyntax: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : ''),
                    troubleshooting: 'Mermaid diagram generation requires Docker. Install Docker or use online tools like https://mermaid.live for diagram generation.',
                    fallbackSuggestion: 'You can copy the Mermaid code and use https://mermaid.live to generate diagrams manually.'
                };
            }
            
            // Check if the Docker image exists
            try {
                execSync('docker image inspect minlag/mermaid-cli', { stdio: 'pipe' });
            } catch {
                // Try to pull the image
                try {
                    console.log('[Mermaid] Pulling minlag/mermaid-cli Docker image...');
                    execSync('docker pull minlag/mermaid-cli', { stdio: 'pipe' });
                    // Retry the original command
                    execSync(dockerCmd.join(' '), { 
                        stdio: 'pipe',
                        timeout: 30000,
                        cwd: process.cwd()
                    });
                } catch (pullError) {
                    return {
                        success: false,
                        error: `Failed to pull Docker image: ${pullError.message}`,
                        inputSyntax: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : ''),
                        troubleshooting: 'Could not pull minlag/mermaid-cli Docker image. Check internet connection and Docker daemon status.'
                    };
                }
            }
            
            // If we reach here, there was a different Docker execution error
            throw dockerError;
        }
        
        // Check if output file was created
        if (!fs.existsSync(outputFile)) {
            // Cleanup input file
            try { fs.unlinkSync(inputFile); } catch {}
            
            return {
                success: false,
                error: 'Failed to generate diagram - output file not created',
                inputSyntax: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : ''),
                troubleshooting: 'The Docker command executed but no PNG file was generated. Check Mermaid syntax for errors.',
                fallbackSuggestion: 'Validate your Mermaid syntax at https://mermaid.live'
            };
        }
        
        // Get file stats and read file for Discord attachment
        const stats = fs.statSync(outputFile);
        const imageBuffer = fs.readFileSync(outputFile);
        
        // Cleanup temporary files
        try {
            fs.unlinkSync(inputFile);
            // Note: Keep outputFile for now, it will be cleaned up later by Discord.js or a cleanup job
        } catch (cleanupError) {
            console.warn(`[Mermaid] Warning: Could not cleanup input file: ${cleanupError.message}`);
        }
        
        return {
            success: true,
            imagePath: outputFile,
            imageBuffer: imageBuffer, // For Discord.js AttachmentBuilder
            filename: `${diagramName}.png`,
            fileSize: stats.size,
            theme: theme,
            backgroundColor: backgroundColor,
            inputSyntax: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : ''),
            cleanup: () => {
                // Cleanup function for later use
                try {
                    if (fs.existsSync(outputFile)) {
                        fs.unlinkSync(outputFile);
                    }
                } catch (err) {
                    console.warn(`[Mermaid] Warning: Could not cleanup output file: ${err.message}`);
                }
            }
        };
        
    } catch (error) {
        console.error('[Mermaid] Diagram generation error:', error);
        
        // Enhanced error categorization
        let troubleshooting = 'Unknown error occurred during Mermaid diagram generation.';
        
        if (error.message.includes('timeout')) {
            troubleshooting = 'Diagram generation timed out. Try simplifying the diagram or check system resources.';
        } else if (error.message.includes('Chrome') || error.message.includes('chromium')) {
            troubleshooting = 'Chrome/Chromium browser issue in Docker. Ensure the container has proper security permissions.';
        } else if (error.message.includes('permission')) {
            troubleshooting = 'File permission error. Check that the temp directory is writable and Docker has proper volume mount permissions.';
        } else if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
            troubleshooting = 'Docker command not found. Install Docker or check PATH configuration.';
        } else if (error.message.includes('syntax') || error.message.includes('parse')) {
            troubleshooting = 'Invalid Mermaid syntax. Check diagram definition for syntax errors.';
        }
        
        return {
            success: false,
            error: error.message,
            inputSyntax: mermaidCode ? mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : '') : 'undefined',
            troubleshooting: troubleshooting,
            fallbackSuggestion: 'You can copy the Mermaid code and use online tools like https://mermaid.live for diagram generation.',
            errorDetails: {
                name: error.name,
                code: error.code,
                signal: error.signal
            }
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
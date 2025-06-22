const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Generate Mermaid diagrams as PNG images using Docker
 * Natural integration - called when mermaid code blocks detected in responses
 */
function generateMermaidDiagram(mermaidCode, theme = 'default', backgroundColor = 'white', filename = null) {
    try {
        // Validate Mermaid code input
        if (!mermaidCode || typeof mermaidCode !== 'string' || mermaidCode.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid or empty Mermaid code provided',
                inputSyntax: mermaidCode ? mermaidCode.substring(0, 100) : 'undefined',
                troubleshooting: 'Please provide valid Mermaid diagram syntax. Example: "graph TD\\nA-->B"'
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
        const dockerCmd = [
            'docker', 'run', '--rm',
            '-v', `${tempDir}:/data`,
            '--security-opt', 'seccomp=unconfined',
            'minlag/mermaid-cli',
            '-i', `/data/${diagramName}.mmd`,
            '-o', `/data/${diagramName}.png`
        ];
        
        // Add user mapping only if we can get the IDs (not in all environments)
        try {
            if (process.getuid && process.getgid) {
                const uid = process.getuid();
                const gid = process.getgid();
                dockerCmd.splice(3, 0, '-u', `${uid}:${gid}`);
            }
        } catch {
            console.log('[MERMAID] Running without user mapping (normal in some environments)');
        }
        
        // Add theme if specified and not default
        if (theme && theme !== 'default') {
            dockerCmd.push('-t', theme);
        }
        
        // Add background color if specified and not white
        if (backgroundColor && backgroundColor !== 'white') {
            dockerCmd.push('-b', backgroundColor);
        }
        
        console.log(`[MERMAID] Generating diagram: ${diagramName}`);
        
        try {
            // Execute the Docker command with timeout
            execSync(dockerCmd.join(' '), { 
                stdio: 'pipe',
                timeout: 30000,
                cwd: process.cwd()
            });
        } catch {
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
            
            // Check if the Docker image exists and pull if needed
            try {
                execSync('docker image inspect minlag/mermaid-cli', { stdio: 'pipe' });
            } catch {
                try {
                    console.log('[MERMAID] Pulling minlag/mermaid-cli Docker image...');
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
        
        // Get file stats for Discord attachment
        const stats = fs.statSync(outputFile);
        
        // Cleanup input file
        try {
            fs.unlinkSync(inputFile);
        } catch (cleanupError) {
            console.warn(`[MERMAID] Warning: Could not cleanup input file: ${cleanupError.message}`);
        }
        
        return {
            success: true,
            imagePath: outputFile,
            filename: `${diagramName}.png`,
            fileSize: stats.size,
            theme: theme,
            backgroundColor: backgroundColor,
            inputSyntax: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : ''),
            cleanup: () => {
                try {
                    if (fs.existsSync(outputFile)) {
                        fs.unlinkSync(outputFile);
                    }
                } catch (err) {
                    console.warn(`[MERMAID] Warning: Could not cleanup output file: ${err.message}`);
                }
            }
        };
        
    } catch (error) {
        console.error('[MERMAID] Diagram generation error:', error);
        
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

module.exports = {
    generateMermaidDiagram
};
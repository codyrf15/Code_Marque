const { generateMermaidDiagram } = require('../src/utils/mermaidGenerator');
const fs = require('fs');
const path = require('path');

// Test Mermaid diagram generation
async function testMermaidGeneration() {
    console.log('🧪 Testing Mermaid Docker Integration...\n');
    
    const testCases = [
        {
            name: 'Simple Flowchart',
            code: `graph TD
    A[Start] --> B{Is Docker Available?}
    B -->|Yes| C[Generate PNG]
    B -->|No| D[Use Fallback]
    C --> E[Display Image]
    D --> F[Show Link]`
        },
        {
            name: 'Sequence Diagram',
            code: `sequenceDiagram
    participant User
    participant Bot
    participant Docker
    User->>Bot: Send mermaid code
    Bot->>Docker: Generate diagram
    Docker-->>Bot: Return PNG
    Bot-->>User: Send image`
        },
        {
            name: 'Class Diagram',
            code: `classDiagram
    class MermaidGenerator {
        +generateDiagram()
        +checkDocker()
        -validateCode()
    }
    class DockerService {
        +runContainer()
        +pullImage()
    }
    MermaidGenerator --> DockerService`
        }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`📊 Test ${i + 1}: ${testCase.name}`);
        console.log('━'.repeat(50));
        
        try {
            const result = generateMermaidDiagram(testCase.code, 'default', 'white', `test_${i + 1}`);
            
            if (result.success) {
                console.log(`✅ Success: ${result.filename}`);
                console.log(`📁 Path: ${result.imagePath}`);
                console.log(`📏 Size: ${(result.fileSize / 1024).toFixed(2)} KB`);
                
                // Verify file exists
                if (fs.existsSync(result.imagePath)) {
                    console.log(`🔍 File verified: EXISTS`);
                    
                    // Optional: Clean up test files
                    if (result.cleanup) {
                        result.cleanup();
                        console.log(`🧹 Cleanup: DONE`);
                    }
                } else {
                    console.log(`❌ File verified: MISSING`);
                }
            } else {
                console.log(`❌ Failed: ${result.error}`);
                console.log(`💡 Troubleshooting: ${result.troubleshooting}`);
                if (result.fallbackSuggestion) {
                    console.log(`🔄 Fallback: ${result.fallbackSuggestion}`);
                }
            }
        } catch (error) {
            console.log(`💥 Exception: ${error.message}`);
        }
        
        console.log(); // Empty line
    }
    
    // Test Docker availability
    console.log('🐳 Docker Environment Check');
    console.log('━'.repeat(50));
    
    const { execSync } = require('child_process');
    
    try {
        const dockerVersion = execSync('docker --version', { encoding: 'utf8' });
        console.log(`✅ Docker installed: ${dockerVersion.trim()}`);
        
        try {
            execSync('docker image inspect minlag/mermaid-cli', { stdio: 'pipe' });
            console.log(`✅ Mermaid CLI image: AVAILABLE`);
        } catch (imageError) {
            console.log(`⚠️  Mermaid CLI image: NOT FOUND`);
            console.log(`💡 Run: docker pull minlag/mermaid-cli`);
        }
        
    } catch (dockerError) {
        console.log(`❌ Docker: NOT AVAILABLE`);
        console.log(`💡 Install Docker or use fallback: https://mermaid.live`);
    }
}

// Run test if called directly
if (require.main === module) {
    testMermaidGeneration().catch(console.error);
}

module.exports = { testMermaidGeneration };
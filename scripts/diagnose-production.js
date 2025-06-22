#!/usr/bin/env node

/**
 * Production Environment Diagnostic Tool
 * Helps identify why Mermaid Docker generation isn't working in production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generateMermaidDiagram } = require('../src/utils/mermaidGenerator');

console.log('🔍 CodeMarque Production Environment Diagnostics');
console.log('=' .repeat(60));

// Environment Information
console.log('\n📊 Environment Information:');
console.log('-'.repeat(30));
console.log(`Node.js Version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Working Directory: ${process.cwd()}`);
console.log(`User: ${process.env.USER || process.env.USERNAME || 'unknown'}`);

// Check for deployment environment indicators
const deploymentEnv = {
    replit: !!process.env.REPLIT_DEPLOYMENT_ID || !!process.env.REPL_SLUG,
    railway: !!process.env.RAILWAY_ENVIRONMENT,
    heroku: !!process.env.DYNO,
    vercel: !!process.env.VERCEL,
    netlify: !!process.env.NETLIFY,
    docker: fs.existsSync('/.dockerenv'),
    github_actions: !!process.env.GITHUB_ACTIONS
};

console.log('\n🌍 Deployment Environment:');
console.log('-'.repeat(30));
Object.entries(deploymentEnv).forEach(([env, detected]) => {
    console.log(`${detected ? '✅' : '❌'} ${env.toUpperCase()}: ${detected}`);
});

// Docker Availability Check
console.log('\n🐳 Docker Availability:');
console.log('-'.repeat(30));

try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf8', timeout: 5000 });
    console.log(`✅ Docker installed: ${dockerVersion.trim()}`);
    
    try {
        const dockerInfo = execSync('docker info', { encoding: 'utf8', timeout: 10000, stdio: 'pipe' });
        console.log('✅ Docker daemon running');
        
        // Check for Mermaid CLI image
        try {
            execSync('docker image inspect minlag/mermaid-cli', { stdio: 'pipe', timeout: 5000 });
            console.log('✅ Mermaid CLI image available');
        } catch {
            console.log('⚠️  Mermaid CLI image not found');
            console.log('💡 Run: docker pull minlag/mermaid-cli');
        }
        
    } catch (infoError) {
        console.log('❌ Docker daemon not running or inaccessible');
        console.log(`Error: ${infoError.message.split('\n')[0]}`);
    }
    
} catch (dockerError) {
    console.log('❌ Docker not installed or not in PATH');
    console.log(`Error: ${dockerError.message.split('\n')[0]}`);
}

// Alternative Container Runtimes
console.log('\n📦 Alternative Container Runtimes:');
console.log('-'.repeat(30));

const alternatives = ['podman', 'nerdctl', 'lima', 'containerd'];
alternatives.forEach(runtime => {
    try {
        const version = execSync(`${runtime} --version`, { encoding: 'utf8', timeout: 3000 });
        console.log(`✅ ${runtime}: ${version.split('\n')[0]}`);
    } catch {
        console.log(`❌ ${runtime}: Not available`);
    }
});

// File System Permissions
console.log('\n📁 File System Permissions:');
console.log('-'.repeat(30));

const tempDir = path.join(process.cwd(), 'temp', 'mermaid-diagrams');
try {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`✅ Created temp directory: ${tempDir}`);
    } else {
        console.log(`✅ Temp directory exists: ${tempDir}`);
    }
    
    // Test write permissions
    const testFile = path.join(tempDir, 'test-write.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Write permissions: OK');
    
} catch (fsError) {
    console.log('❌ File system issue:', fsError.message);
}

// Test Mermaid Generation
console.log('\n🎨 Mermaid Generation Test:');
console.log('-'.repeat(30));

const testMermaidCode = `graph TD
    A[Production Test] --> B{Docker Available?}
    B -->|Yes| C[Generate PNG]
    B -->|No| D[Use Fallback]`;

console.log('Testing Mermaid generation...');
const result = generateMermaidDiagram(testMermaidCode, 'default', 'white', 'production_test');

if (result.success) {
    console.log('✅ Mermaid generation: SUCCESS');
    console.log(`📁 File: ${result.filename}`);
    console.log(`📏 Size: ${(result.fileSize / 1024).toFixed(2)} KB`);
    
    // Cleanup
    if (result.cleanup) {
        result.cleanup();
        console.log('🧹 Cleanup: DONE');
    }
} else {
    console.log('❌ Mermaid generation: FAILED');
    console.log(`Error: ${result.error}`);
    console.log(`Troubleshooting: ${result.troubleshooting}`);
    if (result.fallbackSuggestion) {
        console.log(`Fallback: ${result.fallbackSuggestion}`);
    }
}

// System Resources
console.log('\n💾 System Resources:');
console.log('-'.repeat(30));

const memUsage = process.memoryUsage();
console.log(`Memory Usage:`);
console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

try {
    const uptime = process.uptime();
    console.log(`Process Uptime: ${(uptime / 60).toFixed(2)} minutes`);
} catch {
    console.log('Process Uptime: Unknown');
}

// Recommendations
console.log('\n💡 Recommendations:');
console.log('-'.repeat(30));

if (deploymentEnv.replit) {
    console.log('🔧 For Replit deployment:');
    console.log('   • Replit doesn\'t support Docker by default');
    console.log('   • Consider switching to Railway, Render, or VPS');
    console.log('   • Or use Docker-enabled hosting like DigitalOcean Apps');
} else if (!deploymentEnv.docker && !fs.existsSync('/.dockerenv')) {
    console.log('🔧 For non-Docker environments:');
    console.log('   • Install Docker on your server');
    console.log('   • Or use Docker-based hosting (Railway, Render, etc.)');
    console.log('   • Consider using our docker-compose.yml for deployment');
}

console.log('\n📝 Current Status:');
if (result.success) {
    console.log('✅ Mermaid diagrams will work automatically for users');
} else {
    console.log('⚠️  Mermaid diagrams will show fallback links (mermaid.live)');
    console.log('   Users can still create diagrams, just not automatically');
}

console.log('\n🎯 Next Steps:');
console.log('   1. If using Replit: Consider migrating to Docker-enabled hosting');
console.log('   2. If using VPS: Install Docker with our setup script');
console.log('   3. If using other platforms: Check Docker support in their docs');
console.log('   4. Test again after Docker installation');

console.log('\n' + '='.repeat(60));
console.log('🔍 Diagnostics complete!');
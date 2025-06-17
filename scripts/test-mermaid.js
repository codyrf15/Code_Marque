#!/usr/bin/env node
/**
 * Test script for Mermaid Docker integration
 * Tests the generateMermaidDiagram function with Docker
 */

const { generateMermaidDiagram } = require('../src/functionTools');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Mermaid Docker Integration...\n');

// Test 1: Basic flowchart
console.log('📊 Test 1: Basic Flowchart');
const basicFlowchart = `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]`;

const result1 = generateMermaidDiagram(basicFlowchart, 'default', 'white', 'test_flowchart');
console.log('Result:', result1.success ? '✅ SUCCESS' : '❌ FAILED');
if (result1.success) {
    console.log(`   📄 File: ${result1.filename}`);
    console.log(`   📏 Size: ${result1.fileSize} bytes`);
    console.log(`   🎨 Theme: ${result1.theme}`);
    console.log(`   📁 Path: ${result1.imagePath}`);
} else {
    console.log(`   ❌ Error: ${result1.error}`);
    console.log(`   💡 Troubleshooting: ${result1.troubleshooting}`);
    console.log(`   🔧 Fallback: ${result1.fallbackSuggestion}`);
}

console.log('\n' + '─'.repeat(50) + '\n');

// Test 2: Sequence diagram with dark theme
console.log('📊 Test 2: Sequence Diagram (Dark Theme)');
const sequenceDiagram = `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: I'm good thanks!
    A->>B: See you later!`;

const result2 = generateMermaidDiagram(sequenceDiagram, 'dark', 'transparent', 'test_sequence');
console.log('Result:', result2.success ? '✅ SUCCESS' : '❌ FAILED');
if (result2.success) {
    console.log(`   📄 File: ${result2.filename}`);
    console.log(`   📏 Size: ${result2.fileSize} bytes`);
    console.log(`   🎨 Theme: ${result2.theme}`);
    console.log(`   🌈 Background: ${result2.backgroundColor}`);
} else {
    console.log(`   ❌ Error: ${result2.error}`);
    console.log(`   💡 Troubleshooting: ${result2.troubleshooting}`);
}

console.log('\n' + '─'.repeat(50) + '\n');

// Test 3: Error handling - invalid syntax
console.log('📊 Test 3: Error Handling (Invalid Syntax)');
const invalidDiagram = `invalid syntax here
    this should fail`;

const result3 = generateMermaidDiagram(invalidDiagram, 'default', 'white', 'test_invalid');
console.log('Result:', result3.success ? '❌ UNEXPECTED SUCCESS' : '✅ CORRECTLY FAILED');
if (!result3.success) {
    console.log(`   ❌ Error: ${result3.error}`);
    console.log(`   💡 Troubleshooting: ${result3.troubleshooting}`);
}

console.log('\n' + '─'.repeat(50) + '\n');

// Test 4: Empty input handling
console.log('📊 Test 4: Empty Input Handling');
const result4 = generateMermaidDiagram('', 'default', 'white', 'test_empty');
console.log('Result:', result4.success ? '❌ UNEXPECTED SUCCESS' : '✅ CORRECTLY FAILED');
if (!result4.success) {
    console.log(`   ❌ Error: ${result4.error}`);
    console.log(`   💡 Troubleshooting: ${result4.troubleshooting}`);
}

console.log('\n' + '═'.repeat(50));
console.log('🧪 Mermaid Docker Integration Test Complete!');

// Summary
const successCount = [result1, result2].filter(r => r.success).length;
const totalValidTests = 2; // Only count valid diagram tests
console.log(`\n📊 Summary: ${successCount}/${totalValidTests} valid tests passed`);

if (successCount === totalValidTests) {
    console.log('🎉 All valid tests passed! Mermaid Docker integration is working correctly.');
} else {
    console.log('⚠️  Some tests failed. Check Docker installation and permissions.');
}

// Cleanup generated files after 5 seconds (optional)
setTimeout(() => {
    console.log('\n🧹 Cleaning up test files...');
    [result1, result2].forEach((result, index) => {
        if (result.success && result.cleanup) {
            try {
                result.cleanup();
                console.log(`   ✅ Cleaned up test file ${index + 1}`);
            } catch (err) {
                console.log(`   ⚠️  Could not cleanup test file ${index + 1}: ${err.message}`);
            }
        }
    });
    console.log('🧹 Cleanup complete!');
}, 5000); 
const { MessageSplitter } = require('../src/utils/messageSplitter');
const fs = require('fs');
const path = require('path');

describe('MessageSplitter', () => {
    let splitter;
    const testTempDir = './temp/test-code-attachments';

    beforeEach(() => {
        splitter = new MessageSplitter({
            maxLength: 100, // Use short limit for easier testing
            tempDir: testTempDir
        });
    });

    afterEach(() => {
        // Clean up test temp directory
        if (fs.existsSync(testTempDir)) {
            const files = fs.readdirSync(testTempDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(testTempDir, file));
            });
            fs.rmdirSync(testTempDir);
        }
    });

    describe('Basic functionality', () => {
        test('should return single message for short content', async () => {
            const content = 'This is a short message.';
            const result = await splitter.splitMessage(content);
            
            expect(result).toHaveLength(1);
            expect(result[0].content).toBe(content);
            expect(result[0].type).toBe('text');
        });

        test('should handle empty content', async () => {
            const result = await splitter.splitMessage('');
            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('');
        });

        test('should handle null/undefined content', async () => {
            const result1 = await splitter.splitMessage(null);
            const result2 = await splitter.splitMessage(undefined);
            
            expect(result1).toHaveLength(1);
            expect(result2).toHaveLength(1);
        });
    });

    describe('Text splitting', () => {
        test('should split long text at natural boundaries', async () => {
            const content = 'This is a long message that should be split. It has multiple sentences. And should break at sentence boundaries for optimal readability.';
            const result = await splitter.splitMessage(content);
            
            expect(result.length).toBeGreaterThan(1);
            result.forEach(msg => {
                expect(msg.content.length).toBeLessThanOrEqual(100);
                expect(msg.type).toBe('text');
            });
        });

        test('should split at paragraph breaks when available', async () => {
            const content = 'First paragraph with some content that is long enough to trigger splitting.\n\nSecond paragraph with more content that should cause a split because this text is definitely longer than 100 characters.';
            const result = await splitter.splitMessage(content);
            
            expect(result.length).toBeGreaterThan(1);
            // First split should end with first paragraph
            expect(result[0].content).toContain('First paragraph');
        });

        test('should split at word boundaries as fallback', async () => {
            const content = 'word '.repeat(30); // Creates long content without sentence breaks
            const result = await splitter.splitMessage(content);
            
            expect(result.length).toBeGreaterThan(1);
            result.forEach(msg => {
                expect(msg.content.length).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('Code block handling', () => {
        test('should preserve small code blocks', async () => {
            const content = 'Here is some code:\n```javascript\nconsole.log("hello");\n```\nEnd of message.';
            const result = await splitter.splitMessage(content);
            
            
            // Should find the code block
            const codeMessage = result.find(msg => msg.type === 'codeblock');
            expect(codeMessage).toBeDefined();
            expect(codeMessage.content).toContain('```javascript');
            expect(codeMessage.content).toContain('console.log');
        });

        test('should create attachment for large code blocks', async () => {
            const largeCode = 'console.log("line");\n'.repeat(20);
            const content = `Here is large code:\n\`\`\`javascript\n${largeCode}\`\`\`\nEnd.`;
            
            const result = await splitter.splitMessage(content);
            
            const attachmentMessage = result.find(msg => msg.type === 'codeblock_attachment');
            expect(attachmentMessage).toBeDefined();
            expect(attachmentMessage.attachment).toBeDefined();
            expect(attachmentMessage.attachment.name).toMatch(/\.js$/);
        });

        test('should split very large code blocks into multiple messages', async () => {
            const veryLargeCode = 'console.log("very long line of code");\n'.repeat(50);
            const content = `\`\`\`javascript\n${veryLargeCode}\`\`\``;
            
            // Force splitting by making attachmentFallbackThreshold very low and disabling temp dir
            splitter.attachmentFallbackThreshold = 50;
            splitter.tempDir = '/nonexistent/directory'; // Force attachment creation to fail
            
            const result = await splitter.splitMessage(content);
            
            const codeMessages = result.filter(msg => msg.type === 'codeblock_split');
            expect(codeMessages.length).toBeGreaterThan(1);
            
            codeMessages.forEach(msg => {
                expect(msg.content).toContain('```javascript');
                expect(msg.partNumber).toBeDefined();
            });
        });

        test('should handle multiple code blocks in one message', async () => {
            const content = `First block:
\`\`\`javascript
console.log("first");
\`\`\`

Second block:
\`\`\`python
print("second")
\`\`\``;
            
            const result = await splitter.splitMessage(content);
            
            const codeMessages = result.filter(msg => msg.type === 'codeblock');
            expect(codeMessages.length).toBe(2);
            
            expect(codeMessages[0].language).toBe('javascript');
            expect(codeMessages[1].language).toBe('python');
        });

        test('should handle code blocks without language specification', async () => {
            const content = 'Code without language:\n```\nsome code here\n```';
            const result = await splitter.splitMessage(content);
            
            const codeMessage = result.find(msg => msg.type === 'codeblock');
            expect(codeMessage).toBeDefined();
            expect(codeMessage.language).toBe('');
        });
    });

    describe('Mixed content handling', () => {
        test('should handle text and code blocks together', async () => {
            const content = `This is text before.

\`\`\`javascript
console.log("code");
\`\`\`

This is text after the code block.`;

            const result = await splitter.splitMessage(content);
            
            expect(result.length).toBeGreaterThanOrEqual(3);
            
            const textMessages = result.filter(msg => msg.type === 'text');
            const codeMessages = result.filter(msg => msg.type === 'codeblock');
            
            expect(textMessages.length).toBeGreaterThanOrEqual(2);
            expect(codeMessages.length).toBe(1);
        });

        test('should maintain proper order of mixed content', async () => {
            const content = `Start text
\`\`\`js
code1();
\`\`\`
Middle text
\`\`\`js
code2();
\`\`\`
End text`;

            const result = await splitter.splitMessage(content);
            
            // Check that order is preserved
            let foundStart = false;
            let foundCode1 = false;
            let foundMiddle = false;
            let foundCode2 = false;
            let foundEnd = false;

            result.forEach(msg => {
                if (msg.content.includes('Start text')) foundStart = true;
                if (msg.content.includes('code1()')) {
                    expect(foundStart).toBe(true);
                    foundCode1 = true;
                }
                if (msg.content.includes('Middle text')) {
                    expect(foundCode1).toBe(true);
                    foundMiddle = true;
                }
                if (msg.content.includes('code2()')) {
                    expect(foundMiddle).toBe(true);
                    foundCode2 = true;
                }
                if (msg.content.includes('End text')) {
                    expect(foundCode2).toBe(true);
                    foundEnd = true;
                }
            });

            expect(foundEnd).toBe(true);
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle malformed code blocks gracefully', async () => {
            const content = 'Start ```incomplete code block without end';
            const result = await splitter.splitMessage(content);
            
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('text');
        });

        test('should handle nested backticks', async () => {
            const content = 'Text with `inline code` and ```\ncode block\n```';
            const result = await splitter.splitMessage(content);
            
            expect(result.length).toBeGreaterThanOrEqual(1);
            // Should not break on inline code
            const textMsg = result.find(msg => msg.content.includes('`inline code`'));
            expect(textMsg).toBeDefined();
        });

        test('should sanitize content with special characters', async () => {
            const content = 'Text with\u0000null\u200Bzero-width\uFEFFbyte-order-mark';
            const sanitized = splitter.sanitizeContent(content);
            
            expect(sanitized).not.toContain('\u0000');
            expect(sanitized).not.toContain('\u200B');
            expect(sanitized).not.toContain('\uFEFF');
        });

        test('should handle very long single words', async () => {
            const veryLongWord = 'a'.repeat(50);
            const content = `Short text ${veryLongWord} more text that makes this message longer than limit`;
            const result = await splitter.splitMessage(content);
            
            expect(result.length).toBeGreaterThan(1);
            // Should not break the long word
            const wordMessage = result.find(msg => msg.content.includes(veryLongWord));
            expect(wordMessage).toBeDefined();
        });
    });

    describe('File attachment creation', () => {
        test('should create file with correct extension based on language', async () => {
            const code = 'print("Hello, world!")';
            const attachment = await splitter.createCodeAttachment(code, 'python');
            
            expect(attachment.name).toMatch(/\.py$/);
            expect(attachment.description).toContain('python');
        });

        test('should use .txt extension for unknown languages', async () => {
            const code = 'some unknown language code';
            const attachment = await splitter.createCodeAttachment(code, 'unknown');
            
            expect(attachment.name).toMatch(/\.txt$/);
        });

        test('should create valid file content', async () => {
            const code = 'console.log("test");';
            const attachment = await splitter.createCodeAttachment(code, 'javascript');
            
            // Verify file was created and has correct content
            const files = fs.readdirSync(testTempDir);
            expect(files.length).toBe(1);
            
            const filePath = path.join(testTempDir, files[0]);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            expect(fileContent).toBe(code);
        });
    });

    describe('Performance and reliability', () => {
        test('should handle large messages efficiently', async () => {
            const largeContent = 'Lorem ipsum dolor sit amet. '.repeat(1000);
            
            const startTime = Date.now();
            const result = await splitter.splitMessage(largeContent);
            const endTime = Date.now();
            
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
            expect(result.length).toBeGreaterThan(1);
            
            // Verify no message exceeds limit
            result.forEach(msg => {
                expect(msg.content.length).toBeLessThanOrEqual(100);
            });
        });

        test('should maintain message content integrity', async () => {
            const originalContent = 'Start. Middle content with details. End.';
            const result = await splitter.splitMessage(originalContent);
            
            const reassembled = result.map(msg => msg.content).join(' ').trim();
            // Remove extra spaces that might be added during splitting
            const normalizedReassembled = reassembled.replace(/\s+/g, ' ');
            const normalizedOriginal = originalContent.replace(/\s+/g, ' ');
            
            expect(normalizedReassembled).toBe(normalizedOriginal);
        });
    });
});
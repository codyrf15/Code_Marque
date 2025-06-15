// Test setup file
// Set environment variables for testing
process.env.GOOGLE_MODEL_NAME = 'gemini-2.5-flash-preview-05-20';
process.env.NODE_ENV = 'test';

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
});

afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});
module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/test/**/*.test.js'],
	moduleFileExtensions: ['js'],
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/**/*.spec.js'],
	coverageThreshold: {
		global: {
			branches: 15,
			functions: 20,
			lines: 15,
			statements: 15,
		},
	},
	setupFiles: ['dotenv/config'],
	setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
	testTimeout: 10000
};

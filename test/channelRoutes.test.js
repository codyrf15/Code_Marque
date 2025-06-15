const request = require('supertest');
const express = require('express');
const redisClient = require('../src/redisClient');
const channelRoutes = require('../src/channelRoutes');

const app = express();
app.use(express.json());
app.use('/api', channelRoutes);

describe('Channel Routes', () => {
	beforeAll(async () => {
		await redisClient.flushdb();
	});

	afterAll(async () => {
		// Upstash Redis doesn't require explicit connection closing
		// The HTTP-based client handles connections automatically
	});

	describe('POST /api/channels', () => {
		it('should add a channel ID to Redis', async () => {
			const channelId = '123456';

			const response = await request(app).post('/api/channels').send({ channelId }).expect(200);

			expect(response.body).toEqual({ message: 'Channel added successfully' });

			const isChannelAdded = await redisClient.sismember('allowed_channels', channelId);
			expect(isChannelAdded).toBe(1);
		});

	});

	describe('DELETE /api/channels/:channelId', () => {
		it('should remove a channel ID from Redis', async () => {
			const channelId = '123456';
			await redisClient.sadd('allowed_channels', channelId);

			const response = await request(app).delete(`/api/channels/${channelId}`).expect(200);

			expect(response.body).toEqual({ message: 'Channel removed successfully' });

			const isChannelRemoved = await redisClient.sismember('allowed_channels', channelId);
			expect(isChannelRemoved).toBe(0);
		});

	});
});

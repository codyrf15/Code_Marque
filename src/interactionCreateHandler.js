const { helpCommand } = require('./helpCommand');

async function onInteractionCreate(interaction, conversationManager, commandHandler, errorHandler) {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === 'help') {
		try {
			await helpCommand(interaction);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'clear') {
		try {
			console.log(`[INTERACTION] Clear command received from user ${interaction.user.id}`);
			await interaction.deferReply({ ephemeral: true });
			console.log(`[INTERACTION] Clear command deferred successfully`);
			
			// Set timeout to prevent Discord interaction timeout
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Clear command timeout')), 12000);
			});
			
			const commandPromise = commandHandler.clearCommand(interaction, conversationManager);
			
			await Promise.race([commandPromise, timeoutPromise]);
		} catch (error) {
			console.error(`[INTERACTION ERROR] Clear command failed:`, error);
			// Error handler will check interaction state before replying
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'save') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.saveCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'model') {
		try {
			console.log(`[INTERACTION] Model command received from user ${interaction.user.id}`);
			await interaction.deferReply({ ephemeral: true });
			console.log(`[INTERACTION] Reply deferred successfully`);
			
			// Set timeout to prevent Discord interaction timeout
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Command timeout')), 12000); // 12 seconds (before Discord's 15s limit)
			});
			
			const commandPromise = commandHandler.modelCommand(interaction, conversationManager);
			
			await Promise.race([commandPromise, timeoutPromise]);
		} catch (error) {
			console.error(`[INTERACTION ERROR] Model command failed:`, error);
			try {
				// Check if interaction is still valid before responding
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply('❌ An error occurred while changing the model. Please try again.');
				} else if (interaction.deferred) {
					await interaction.editReply('❌ An error occurred while changing the model. Please try again.');
				}
			} catch (replyError) {
				console.error(`[INTERACTION ERROR] Failed to send error reply (interaction may have timed out):`, replyError.message);
				// Don't call error handler for Discord timeout errors - just log them
				if (!replyError.message.includes('Unknown interaction')) {
					await errorHandler.handleError(error, interaction);
				}
			}
		}
		return;
	}

	if (interaction.commandName === 'prompt') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.promptCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'reset') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.resetCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'testerror') {
		try {
			await interaction.deferReply({ ephemeral: true });
			// Check if the user executing the command is the bot owner
			if (interaction.user.id !== process.env.DISCORD_USER_ID) {
				await interaction.editReply('Only the bot owner can use this command.');
				return;
			}
			// Trigger a test error
			throw new Error('This is a test error triggered by the /testerror command.');
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'settings') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.settingsCommand(interaction, conversationManager);
		} catch (error) {
			await interaction.editReply({
				content: 'An error occurred while processing the command.',
				ephemeral: true,
			});
			await errorHandler.handleError(error, interaction);
		}
		return;
	}
}

module.exports = { onInteractionCreate };

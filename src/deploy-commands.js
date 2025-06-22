require('dotenv').config();
const { SlashCommandBuilder, REST, Routes } = require('discord.js');

const commands = [
	new SlashCommandBuilder().setName('clear').setDescription('Clears the conversation history.').setDMPermission(true),
	new SlashCommandBuilder()
		.setName('save')
		.setDescription('Saves the current conversation and sends it to your inbox.')
		.setDMPermission(true),
	new SlashCommandBuilder()
		.setName('model')
		.setDescription('Change the model used by the bot.')
		.addStringOption((option) =>
			option
				.setName('name')
				.setDescription('The name of the model.')
				.setRequired(true)
				.addChoices(
					{ name: 'Gemini 2.5 Flash (Default)', value: 'gemini-2.5-flash-preview-05-20' },
					{ name: 'Gemini 2.0 Flash Experimental', value: 'gemini-2.0-flash-exp' },
					{ name: 'Gemini 1.5 Flash Latest', value: 'gemini-1.5-flash-latest' },
					{ name: 'Gemini 1.5 Pro Latest', value: 'gemini-1.5-pro-latest' },
					{ name: 'Gemini 1.5 Flash-8B (Fast)', value: 'gemini-1.5-flash-8b-latest' },
				),
		)
		.setDMPermission(true),
	new SlashCommandBuilder()
		.setName('prompt')
		.setDescription('Change the system prompt used by the bot.')
		.addStringOption((option) =>
			option
				.setName('name')
				.setDescription('The name of the prompt.')
				.setRequired(true)
				.addChoices(
					{ name: 'CodeMarque – Powered by Google Gemini 2.5 Flash', value: 'codemarque' },
				),
		)
		.setDMPermission(true),
	new SlashCommandBuilder().setName('reset').setDescription('Reset the model and prompt to the default settings.').setDMPermission(true),
	new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays the list of available commands and their usage.')
		.setDMPermission(true),
	new SlashCommandBuilder()
		.setName('testerror')
		.setDescription('Triggers a test error to check the error notification webhook.')
		.setDMPermission(false),
	new SlashCommandBuilder().setName('settings').setDescription('Displays your current model and prompt settings.').setDMPermission(true),
	new SlashCommandBuilder()
		.setName('diagnostic')
		.setDescription('Run production environment diagnostics (Owner Only).')
		.setDMPermission(true),
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error('Error deploying slash commands:', error);
	}
})();
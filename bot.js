require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, PermissionFlagsBits } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot en ligne !'));
app.listen(PORT, () => console.log(`Serveur HTTP sur le port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  // Commande !config
  if (message.content === '!config') {
    const category = await message.guild.channels.create({
      name: 'TICKETS',
      type: ChannelType.GuildCategory,
    });

    const ticketChannel = await message.guild.channels.create({
      name: 'ouvrir-ticket',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: message.guild.id,
          deny: [PermissionsBitField.Flags.SendMessages],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ]
    });

    const supportRole = await message.guild.roles.create({
      name: 'Support',
      color: 'Blue',
      permissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
    });

    const embed = new EmbedBuilder()
      .setTitle('Support')
      .setDescription('Clique sur le bouton pour ouvrir un ticket.')
      .setColor('Green');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('🎫 Créer un ticket')
        .setStyle(ButtonStyle.Primary)
    );

    ticketChannel.send({ embeds: [embed], components: [row] });

    message.reply('Configuration terminée !');
  }
});

// Gestion des boutons
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const { guild, user, customId } = interaction;

  if (customId === 'create_ticket') {
    const existing = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase()}`);
    if (existing) return interaction.reply({ content: 'Tu as déjà un ticket ouvert.', ephemeral: true });

    const supportRole = guild.roles.cache.find(r => r.name === 'Support');

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: interaction.channel.parentId,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: supportRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('Ticket ouvert')
      .setDescription('Explique ton problème, un membre du support te répondra.')
      .setColor('Blue');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `<@${user.id}> <@&${supportRole.id}>`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `Ticket créé: ${channel}`, ephemeral: true });
  }

  if (customId === 'close_ticket') {
    const channel = interaction.channel;
    await channel.send('Fermeture du ticket dans 5 secondes...');
    setTimeout(() => channel.delete(), 5000);
  }
});

client.login(process.env.TOKEN);

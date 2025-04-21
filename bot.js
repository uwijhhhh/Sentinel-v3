const { Client, GatewayIntentBits, Partials, Collection, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

const PREFIX = '!';

const supportRoleName = 'Support';
const ticketCategoryName = 'TICKETS';

// Express HTTP server
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('Bot en ligne.');
});
app.listen(port, () => {
  console.log(`Serveur HTTP lancé sur http://localhost:${port}`);
});

// CONFIG AUTO
client.on('messageCreate', async message => {
  if (message.content === '!config') {
    const guild = message.guild;

    let supportRole = guild.roles.cache.find(r => r.name === supportRoleName);
    if (!supportRole) {
      supportRole = await guild.roles.create({
        name: supportRoleName,
        color: 'Blue',
        reason: 'Rôle support auto-créé'
      });
    }

    let ticketCategory = guild.channels.cache.find(c => c.name === ticketCategoryName && c.type === ChannelType.GuildCategory);
    if (!ticketCategory) {
      ticketCategory = await guild.channels.create({
        name: ticketCategoryName,
        type: ChannelType.GuildCategory
      });
    }

    const ticketChannel = await guild.channels.create({
      name: 'créer-un-ticket',
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.SendMessages] },
        { id: supportRole.id, allow: [PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('Besoin d\'aide ?')
      .setDescription('Clique sur le bouton ci-dessous pour créer un ticket.')
      .setColor('Blue');

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('🎫 Créer un ticket')
        .setStyle(ButtonStyle.Primary)
    );

    await ticketChannel.send({ embeds: [embed], components: [button] });
    message.reply('Configuration terminée.');
  }
});

// Gestion des tickets
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_ticket') {
    const guild = interaction.guild;
    const user = interaction.user;

    const ticketChannel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: guild.channels.cache.find(c => c.name === ticketCategoryName && c.type === ChannelType.GuildCategory)?.id,
      permissionOverwrites: [
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: guild.roles.cache.find(r => r.name === supportRoleName)?.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    ticketChannel.send({
      content: `<@${user.id}> un membre du staff va vous répondre sous peu.`,
      components: [closeButton]
    });

    interaction.reply({ content: 'Ticket créé.', ephemeral: true });
  }

  if (interaction.customId === 'close_ticket') {
    const channel = interaction.channel;
    await channel.send('Ticket fermé. Ce salon sera supprimé dans 5 secondes...');
    setTimeout(() => {
      channel.delete().catch(console.error);
    }, 5000);
  }
});

// Connexion du bot
client.login(process.env.TOKEN);

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// === CONFIGURATION MANUELLE ===
const SUPPORT_ROLE_ID = '123456789012345678'; // à remplacer
const TICKET_CATEGORY_ID = '123456789012345678'; // à remplacer

client.on('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'config') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const channel = await message.guild.channels.create({
      name: 'ouvrir-un-ticket',
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: message.guild.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
          deny: [PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    const bouton = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('🎫 Créer un ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(bouton);

    await channel.send({ content: 'Besoin d\'aide ? Clique sur le bouton ci-dessous pour créer un ticket.', components: [row] });

    message.reply('Système de ticket configuré !');
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_ticket') {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        },
        {
          id: SUPPORT_ROLE_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        }
      ]
    });

    ticketChannel.send(`Bonjour ${interaction.user}, un membre du support va bientôt vous répondre.`);
    interaction.reply({ content: 'Ticket créé avec succès !', ephemeral: true });
  }
});

client.login(process.env.TOKEN);

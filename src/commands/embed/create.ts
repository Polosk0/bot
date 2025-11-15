import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js';
import { Command } from '../../types/command';

export const embed: Command = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Créer un message embed personnalisé')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Créer un embed avancé')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Canal où envoyer l\'embed')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('Titre de l\'embed')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Description de l\'embed')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('Couleur (hex: #FF0000 ou nom: red, blue, green, etc.)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('thumbnail')
            .setDescription('URL de la miniature')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('image')
            .setDescription('URL de l\'image principale')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('footer')
            .setDescription('Texte du footer')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('author-name')
            .setDescription('Nom de l\'auteur')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('author-icon')
            .setDescription('URL de l\'icône de l\'auteur')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('timestamp')
            .setDescription('Afficher l\'horodatage')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('json')
        .setDescription('Créer un embed à partir de JSON')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Canal où envoyer l\'embed')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
          option
            .setName('json')
            .setDescription('JSON de l\'embed (format Discord)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('file')
        .setDescription('Créer un embed à partir d\'un fichier JSON')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Canal où envoyer l\'embed')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addAttachmentOption(option =>
          option
            .setName('file')
            .setDescription('Fichier JSON contenant l\'embed')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('fields')
        .setDescription('Créer un embed avec des champs')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Canal où envoyer l\'embed')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('Titre de l\'embed')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Description de l\'embed')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field1')
            .setDescription('Champ 1 (format: Nom|Valeur|inline)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field2')
            .setDescription('Champ 2 (format: Nom|Valeur|inline)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field3')
            .setDescription('Champ 3 (format: Nom|Valeur|inline)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field4')
            .setDescription('Champ 4 (format: Nom|Valeur|inline)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field5')
            .setDescription('Champ 5 (format: Nom|Valeur|inline)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('Couleur de l\'embed')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  category: 'embed',

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'create') {
        await handleCreateEmbed(interaction);
      } else if (subcommand === 'json') {
        await handleJsonEmbed(interaction);
      } else if (subcommand === 'file') {
        await handleFileEmbed(interaction);
      } else if (subcommand === 'fields') {
        await handleFieldsEmbed(interaction);
      }

    } catch (error) {
      console.error('Erreur lors de la création de l\'embed:', error);

      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de la création de l\'embed.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};

async function handleCreateEmbed(interaction: ChatInputCommandInteraction) {
  const channel = (interaction as any).options.getChannel('channel') as TextChannel;
  const title = (interaction as any).options.getString('title');
  const description = (interaction as any).options.getString('description');
  const colorInput = (interaction as any).options.getString('color');
  const thumbnail = (interaction as any).options.getString('thumbnail');
  const image = (interaction as any).options.getString('image');
  const footer = (interaction as any).options.getString('footer');
  const authorName = (interaction as any).options.getString('author-name');
  const authorIcon = (interaction as any).options.getString('author-icon');
  const showTimestamp = (interaction as any).options.getBoolean('timestamp') ?? false;

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: '❌ Canal invalide.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Créer l'embed
  const embed = new EmbedBuilder();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (footer) embed.setFooter({ text: footer });
  if (authorName) embed.setAuthor({ name: authorName, iconURL: authorIcon || undefined });
  if (showTimestamp) embed.setTimestamp();

  // Gérer la couleur
  if (colorInput) {
    const colorMap: { [key: string]: number } = {
      'red': 0xff0000,
      'rouge': 0xff0000,
      'blue': 0x0000ff,
      'bleu': 0x0000ff,
      'green': 0x00ff00,
      'vert': 0x00ff00,
      'yellow': 0xffff00,
      'jaune': 0xffff00,
      'orange': 0xffa500,
      'purple': 0x800080,
      'violet': 0x800080,
      'pink': 0xffc0cb,
      'rose': 0xffc0cb,
      'black': 0x000000,
      'noir': 0x000000,
      'white': 0xffffff,
      'blanc': 0xffffff,
      'gray': 0x808080,
      'gris': 0x808080
    };

    if (colorInput.startsWith('#')) {
      embed.setColor(parseInt(colorInput.replace('#', ''), 16));
    } else {
      const color = colorMap[colorInput.toLowerCase()];
      if (color !== undefined) {
        embed.setColor(color);
      } else {
        embed.setColor(0x0099ff);
      }
    }
  } else {
    embed.setColor(0x0099ff);
  }

  // Envoyer l'embed
  await channel.send({ embeds: [embed] });

  await interaction.reply({
    content: `✅ Embed créé avec succès dans ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleJsonEmbed(interaction: ChatInputCommandInteraction) {
  const channel = (interaction as any).options.getChannel('channel') as TextChannel;
  const jsonInput = (interaction as any).options.getString('json');

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: '❌ Canal invalide.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    const embedData = JSON.parse(jsonInput);
    const embed = new EmbedBuilder(embedData);
    
    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: `✅ Embed créé avec succès dans ${channel}`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    await interaction.reply({
      content: '❌ JSON invalide. Vérifiez le format.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleFileEmbed(interaction: ChatInputCommandInteraction) {
  const channel = (interaction as any).options.getChannel('channel') as TextChannel;
  const attachment = (interaction as any).options.getAttachment('file');

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: '❌ Canal invalide.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!attachment) {
    await interaction.reply({
      content: '❌ Aucun fichier fourni.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Vérifier que c'est un fichier JSON
  if (!attachment.name?.toLowerCase().endsWith('.json')) {
    await interaction.reply({
      content: '❌ Le fichier doit être au format JSON (.json).',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    // Télécharger et lire le fichier
    const response = await fetch(attachment.url);
    if (!response.ok) {
      throw new Error('Impossible de télécharger le fichier');
    }

    const jsonContent = await response.text();
    const embedData = JSON.parse(jsonContent);

    // Vérifier que c'est bien un format d'embed Discord
    if (!embedData.embeds || !Array.isArray(embedData.embeds) || embedData.embeds.length === 0) {
      await interaction.reply({
        content: '❌ Le fichier JSON doit contenir un objet avec un tableau "embeds".',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Envoyer l'embed
    await channel.send(embedData);

    await interaction.reply({
      content: `✅ Embed créé avec succès depuis le fichier \`${attachment.name}\` dans ${channel}`,
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Erreur lors du traitement du fichier JSON:', error);
    
    if (error instanceof SyntaxError) {
      await interaction.reply({
        content: '❌ Le fichier JSON est mal formaté. Vérifiez la syntaxe.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Erreur lors de la lecture du fichier. Vérifiez que le fichier est accessible.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleFieldsEmbed(interaction: ChatInputCommandInteraction) {
  const channel = (interaction as any).options.getChannel('channel') as TextChannel;
  const title = (interaction as any).options.getString('title');
  const description = (interaction as any).options.getString('description');
  const colorInput = (interaction as any).options.getString('color');

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: '❌ Canal invalide.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!title) {
    await interaction.reply({
      content: '❌ Le titre est requis.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(colorInput ? parseInt(colorInput.replace('#', ''), 16) : 0x0099ff);

  if (description) {
    embed.setDescription(description);
  }

  // Ajouter les champs
  for (let i = 1; i <= 5; i++) {
    const fieldData = (interaction as any).options.getString(`field${i}`);
    if (fieldData) {
      const parts = fieldData.split('|');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts[1].trim();
        const inline = parts[2]?.toLowerCase() === 'true' || parts[2]?.toLowerCase() === 'inline';
        
        embed.addFields({ name, value, inline });
      }
    }
  }

  embed.setTimestamp();

  await channel.send({ embeds: [embed] });

  await interaction.reply({
    content: `✅ Embed créé avec succès dans ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}
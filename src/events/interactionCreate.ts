import { 
  Events, 
  Interaction, 
  ChatInputCommandInteraction,
  ButtonInteraction, 
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  EmbedBuilder,
  Collection,
  TextChannel,
  GuildMember,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { logger } from '../utils/logger';
import { TicketManager } from '../managers/ticketManager';
import { DatabaseManager } from '../database/databaseManager';
import { LogManager } from '../managers/logManager';
import { WebhookManager } from '../managers/webhookManager';

export const name = Events.InteractionCreate;

async function handleCommandInteraction(interaction: ChatInputCommandInteraction) {
  const client = interaction.client;
  const command = (client as any).commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Commande inconnue: ${interaction.commandName}`);
    return;
  }

  // Vérifier les permissions
  if (command.permissions && interaction.memberPermissions) {
    const hasPermission = command.permissions.every((permission: any) => 
      interaction.memberPermissions!.has(permission)
    );

    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }

  // Vérifier le cooldown
  if (command.cooldown) {
    const cooldowns = (client as any).cooldowns;
    
    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name)!;
    const cooldownAmount = command.cooldown * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        await interaction.reply({
          content: `⏰ Veuillez attendre ${timeLeft.toFixed(1)} seconde(s) avant de réutiliser la commande \`${command.data.name}\`.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
  }

  try {
    await command.execute(interaction);
    logger.info(`Commande ${interaction.commandName} exécutée par ${interaction.user.tag}`);
  } catch (error) {
    logger.error(`Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);
    
    const errorMessage = {
      content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
      flags: MessageFlags.Ephemeral as any
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  
  logger.info(`[BUTTON] Interaction reçue: ${customId} par ${interaction.user.tag}`);

  if (customId === 'verification_help') {
    await handleVerificationHelp(interaction);
  } else if (customId === 'open_verification_website') {
    await handleOpenWebsite(interaction);
  } else if (customId === 'close_ticket') {
    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({
        content: '❌ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const ticketManager = new TicketManager();
    const success = await ticketManager.closeTicket(
      interaction.channel as TextChannel,
      interaction.member as GuildMember
    );

    if (success) {
      await interaction.reply({
        content: '✅ Ticket fermé avec succès.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Impossible de fermer le ticket.',
        flags: MessageFlags.Ephemeral
      });
    }
  } else if (customId === 'vouch_create_modal') {
    await handleVouchCreateModal(interaction);
  } else if (customId.startsWith('vouch_add_photo_')) {
    await handleVouchAddPhoto(interaction);
  } else if (customId.startsWith('verify_accept_')) {
    logger.info(`[VERIFY] Bouton accept détecté pour: ${customId}`);
    await handleVerifyAccept(interaction);
  } else if (customId.startsWith('verify_reject_')) {
    logger.info(`[VERIFY] Bouton reject détecté pour: ${customId}`);
    await handleVerifyReject(interaction);
  } else {
    logger.warn(`[BUTTON] CustomId non reconnu: ${customId}`);
  }
}

async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
  const customId = interaction.customId;

  if (customId === 'ticket_create') {
    const category = interaction.values[0] as 'refund' | 'boxing';
    
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: '❌ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const ticketManager = new TicketManager();
    const ticket = await ticketManager.createTicket(
      interaction.guild,
      interaction.member as GuildMember,
      category
    );

    if (ticket) {
      await interaction.reply({
        content: `✅ Ticket ${category} créé avec succès !`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Impossible de créer le ticket. Vous en avez peut-être déjà un ouvert.',
        flags: MessageFlags.Ephemeral
      });
    }
  } else if (customId === 'discovery_select') {
    const discoveryType = interaction.values[0] as 'friend' | 'ad' | 'other';
    
    let modal: ModalBuilder;
    
    if (discoveryType === 'friend') {
      modal = new ModalBuilder()
        .setCustomId('discovery_friend')
        .setTitle('Découverte via un ami');
      
      const pseudoInput = new TextInputBuilder()
        .setCustomId('friend_pseudo')
        .setLabel('Pseudo de votre ami')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Entrez le pseudo Discord de votre ami')
        .setRequired(true)
        .setMaxLength(100);
      
      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(pseudoInput);
      modal.addComponents(row);
      
    } else if (discoveryType === 'ad') {
      modal = new ModalBuilder()
        .setCustomId('discovery_ad')
        .setTitle('Découverte via une publicité');
      
      const serverInput = new TextInputBuilder()
        .setCustomId('ad_server')
        .setLabel('Nom du serveur')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Entrez le nom du serveur où vous nous avez vu')
        .setRequired(true)
        .setMaxLength(100);
      
      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(serverInput);
      modal.addComponents(row);
      
    } else {
      modal = new ModalBuilder()
        .setCustomId('discovery_other')
        .setTitle('Autre moyen de découverte');
      
      const reasonInput = new TextInputBuilder()
        .setCustomId('other_reason')
        .setLabel('Précisez votre raison')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Expliquez comment vous nous avez découverts...')
        .setRequired(true)
        .setMaxLength(500);
      
      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
      modal.addComponents(row);
    }
    
    await interaction.showModal(modal);
  }
}

async function handleModalSubmitInteraction(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;
  
  if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.reply({
      content: '❌ Une erreur est survenue.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  const textChannel = interaction.channel as TextChannel;
  
  if (customId === 'discovery_friend') {
    const pseudo = interaction.fields.getTextInputValue('friend_pseudo');
    
    const publicEmbed = new EmbedBuilder()
      .setTitle('👥 Découverte via un ami')
      .setDescription(`${interaction.user} nous a découverts **via un ami**`)
      .addFields({
        name: '👤 Pseudo de l\'ami',
        value: pseudo,
        inline: false
      })
      .setColor('#5865F2')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({
        text: '€mynona Market • Formulaire de découverte'
      });
    
    await textChannel.send({ embeds: [publicEmbed] });
    
    await interaction.reply({
      content: '✅ Votre réponse a été enregistrée et publiée dans le canal !',
      flags: MessageFlags.Ephemeral
    });
    
    logger.info(`[DISCOVERY] ${interaction.user.tag} a répondu: D'un ami (${pseudo})`);
    
  } else if (customId === 'discovery_ad') {
    const server = interaction.fields.getTextInputValue('ad_server');
    
    const publicEmbed = new EmbedBuilder()
      .setTitle('📢 Découverte via une publicité')
      .setDescription(`${interaction.user} nous a découverts **via une publicité**`)
      .addFields({
        name: '🏢 Serveur',
        value: server,
        inline: false
      })
      .setColor('#5865F2')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({
        text: '€mynona Market • Formulaire de découverte'
      });
    
    await textChannel.send({ embeds: [publicEmbed] });
    
    await interaction.reply({
      content: '✅ Votre réponse a été enregistrée et publiée dans le canal !',
      flags: MessageFlags.Ephemeral
    });
    
    logger.info(`[DISCOVERY] ${interaction.user.tag} a répondu: D'une pub (${server})`);
    
  } else if (customId === 'discovery_other') {
    const reason = interaction.fields.getTextInputValue('other_reason');
    
    const publicEmbed = new EmbedBuilder()
      .setTitle('💭 Autre moyen de découverte')
      .setDescription(`${interaction.user} nous a découverts **autrement**`)
      .addFields({
        name: '📝 Détails',
        value: reason,
        inline: false
      })
      .setColor('#5865F2')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({
        text: '€mynona Market • Formulaire de découverte'
      });
    
    await textChannel.send({ embeds: [publicEmbed] });
    
    await interaction.reply({
      content: '✅ Votre réponse a été enregistrée et publiée dans le canal !',
      flags: MessageFlags.Ephemeral
    });
    
    logger.info(`[DISCOVERY] ${interaction.user.tag} a répondu: Autres (${reason.substring(0, 50)}...)`);
  } else if (customId === 'vouch_submit') {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Cette fonctionnalité n\'est disponible que dans un serveur.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const site = interaction.fields.getTextInputValue('vouch_site');
    const amount = interaction.fields.getTextInputValue('vouch_amount');
    const comment = interaction.fields.getTextInputValue('vouch_comment');

    const vouchChannel = interaction.guild.channels.cache.find(
      (ch) => ch.name === '▸📝・avis' && ch.isTextBased()
    ) as TextChannel | undefined;

    if (!vouchChannel) {
      await interaction.reply({
        content: '❌ Le canal "▸📝・avis" est introuvable. Contactez un administrateur.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    const vouchEmbed = new EmbedBuilder()
      .setTitle('⭐ Nouvel Avis')
      .setDescription(`**Client :** ${interaction.user}`)
      .addFields(
        { name: '🌐 Site / Plateforme', value: site, inline: true },
        { name: '💰 Montant', value: amount, inline: true },
        { name: '💬 Commentaire', value: comment, inline: false }
      )
      .setColor('#ffd700')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({
        text: `Avis publié par ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    const sentMessage = await vouchChannel.send({ embeds: [vouchEmbed] });

    const databaseManager = new DatabaseManager();
    const vouchId = Date.now().toString();
    databaseManager.setVouch({
      id: vouchId,
      userId: interaction.user.id,
      targetUserId: interaction.user.id,
      message: `[${site}] ${amount} - ${comment}`,
      rating: 5,
      createdAt: new Date(),
      approved: true,
      approvedBy: interaction.user.id
    });

    await LogManager.logMessage({
      type: 'warn',
      userId: interaction.user.id,
      reason: `Vouch créé: ${site}`,
      data: {
        site: site,
        amount: amount
      }
    });

    const photoButton = new ButtonBuilder()
      .setCustomId(`vouch_add_photo_${sentMessage.id}`)
      .setLabel('Ajouter une photo')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📷');

    const photoRow = new ActionRowBuilder<ButtonBuilder>().addComponents(photoButton);

    await interaction.reply({
      content: `✅ Votre avis a été publié dans ${vouchChannel} !\n\n📷 *Cliquez sur le bouton ci-dessous pour ajouter une photo à votre avis.*`,
      components: [photoRow],
      flags: MessageFlags.Ephemeral
    });

    logger.info(`[VOUCH] Avis créé par ${interaction.user.tag} - ${site}`);
  } else if (customId.startsWith('vouch_photo_')) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Cette fonctionnalité n\'est disponible que dans un serveur.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const messageId = customId.replace('vouch_photo_', '');
    const photoUrl = interaction.fields.getTextInputValue('photo_url');

    try {
      const vouchChannel = interaction.guild.channels.cache.find(
        (ch) => ch.name === '▸📝・avis' && ch.isTextBased()
      ) as TextChannel | undefined;

      if (!vouchChannel) {
        await interaction.reply({
          content: '❌ Le canal "▸📝・avis" est introuvable.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const targetMessage = await vouchChannel.messages.fetch(messageId);
      
      if (!targetMessage) {
        await interaction.reply({
          content: '❌ Message d\'avis introuvable.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const existingEmbed = targetMessage.embeds[0];
      if (!existingEmbed) {
        await interaction.reply({
          content: '❌ Embed introuvable sur le message.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const updatedEmbed = EmbedBuilder.from(existingEmbed).setImage(photoUrl);

      await targetMessage.edit({ embeds: [updatedEmbed] });

      await interaction.reply({
        content: '✅ Photo ajoutée à votre avis avec succès !',
        flags: MessageFlags.Ephemeral
      });

      logger.info(`[VOUCH] Photo ajoutée à l'avis ${messageId} par ${interaction.user.tag}`);
    } catch (error) {
      logger.error('[VOUCH] Erreur lors de l\'ajout de la photo:', error);
      await interaction.reply({
        content: '❌ Erreur lors de l\'ajout de la photo. Vérifiez que l\'URL est valide et accessible.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleVouchCreateModal(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ Cette fonctionnalité n\'est disponible que dans un serveur.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId('vouch_submit')
    .setTitle('⭐ Publier un Avis');

  const siteInput = new TextInputBuilder()
    .setCustomId('vouch_site')
    .setLabel('Site / Plateforme')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Discord, Telegram, etc.')
    .setRequired(true)
    .setMaxLength(100);

  const amountInput = new TextInputBuilder()
    .setCustomId('vouch_amount')
    .setLabel('Montant')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 50€, 100$, etc.')
    .setRequired(true)
    .setMaxLength(50);

  const commentInput = new TextInputBuilder()
    .setCustomId('vouch_comment')
    .setLabel('Commentaire')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Décrivez votre expérience avec notre service...')
    .setRequired(true)
    .setMaxLength(1000);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(siteInput);
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput);
  const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(commentInput);

  modal.addComponents(firstRow, secondRow, thirdRow);

  await interaction.showModal(modal);
}

async function handleVouchAddPhoto(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ Cette fonctionnalité n\'est disponible que dans un serveur.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const messageId = interaction.customId.replace('vouch_add_photo_', '');

  const modal = new ModalBuilder()
    .setCustomId(`vouch_photo_${messageId}`)
    .setTitle('📷 Ajouter une photo à votre avis');

  const photoUrlInput = new TextInputBuilder()
    .setCustomId('photo_url')
    .setLabel('URL de la photo')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Collez l\'URL de votre image (lien direct)')
    .setRequired(true)
    .setMaxLength(500);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(photoUrlInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleVerificationHelp(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: '❌ Une erreur est survenue.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('❓ Aide - Vérification')
    .setDescription('Vous avez besoin d\'aide pour la vérification ? Voici toutes les informations dont vous avez besoin.')
    .addFields(
      { 
        name: '📋 Étapes détaillées', 
        value: 
          '**Étape 1 :** Cliquez sur le bouton "Se Vérifier"\n' +
          `**Étape 2 :** Vous serez redirigé vers ${process.env.WEB_VERIFICATION_URL || 'http://localhost:3000'}/verify\n` +
          '**Étape 3 :** Connectez-vous avec votre compte Discord\n' +
          '**Étape 4 :** Complétez le processus de vérification\n' +
          '**Étape 5 :** Attendez la validation (quelques secondes)\n' +
          '**Étape 6 :** Revenez sur Discord et profitez du serveur !', 
        inline: false 
      },
      { 
        name: '⚠️ Problèmes courants', 
        value: 
          '• **Le lien ne s\'ouvre pas ?** Vérifiez que les pop-ups ne sont pas bloquées\n' +
          '• **Pas de rôle après vérification ?** Attendez quelques secondes ou contactez le support', 
        inline: false 
      },
      { 
        name: '🔒 Sécurité', 
        value: 
          '✅ Vos données sont cryptées\n' +
          '✅ Aucune information sensible n\'est stockée\n' +
          '✅ Conforme aux normes de sécurité\n' +
          '✅ Validation en temps réel', 
        inline: true 
      },
      { 
        name: '⏱️ Durée', 
        value: 
          '⏰ 2-3 minutes maximum\n' +
          '⚡ Validation instantanée\n' +
          '🔄 Processus automatique', 
        inline: true 
      },
      { 
        name: '💬 Support', 
        value: 'Si vous avez toujours des problèmes, n\'hésitez pas à ouvrir un ticket ou à contacter un membre du staff.', 
        inline: false 
      }
    )
    .setColor('#5865F2')
    .setThumbnail(interaction.guild.iconURL())
    .setFooter({ 
      text: '€mynona Market • Support vérification',
      iconURL: interaction.guild.iconURL() || undefined
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function handleOpenWebsite(interaction: ButtonInteraction) {
  await interaction.reply({
    content: `🌐 Redirection vers ${process.env.WEB_VERIFICATION_URL || 'http://localhost:3000'}/verify`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleVerifyAccept(interaction: ButtonInteraction) {
  logger.info(`[VERIFY] handleVerifyAccept appelé par ${interaction.user.tag}`);
  
  if (!interaction.guild || !interaction.member) {
    logger.error('[VERIFY] ❌ Pas de guild ou member');
    await interaction.reply({
      content: '❌ Une erreur est survenue.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!interaction.memberPermissions?.has('Administrator')) {
    logger.warn(`[VERIFY] ❌ ${interaction.user.tag} n'a pas les permissions administrateur`);
    await interaction.reply({
      content: '❌ Vous devez être administrateur pour vérifier des membres.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const userId = interaction.customId.replace('verify_accept_', '');
  logger.info(`[VERIFY] UserId extrait: ${userId}`);
  
  const databaseManager = new DatabaseManager();
  const config = databaseManager.getServerConfig(interaction.guild.id);
  
  logger.info(`[VERIFY] Config trouvée: ${config ? 'Oui' : 'Non'}`);
  if (config) {
    logger.info(`[VERIFY] verifiedRoleId: ${config.verifiedRoleId}`);
    logger.info(`[VERIFY] unverifiedRoleId: ${config.unverifiedRoleId}`);
  }

  if (!config || !config.verifiedRoleId) {
    await interaction.reply({
      content: '❌ Configuration de vérification non trouvée. Utilisez /verify setup',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    logger.info(`[VERIFY] Tentative de fetch du membre: ${userId}`);
    const member = await interaction.guild.members.fetch(userId).catch(err => {
      logger.error(`[VERIFY] ❌ Erreur lors du fetch du membre:`, err);
      return null;
    });
    
    if (!member) {
      logger.error(`[VERIFY] ❌ Membre non trouvé: ${userId}`);
      await interaction.reply({
        content: '❌ Membre non trouvé sur le serveur.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    logger.info(`[VERIFY] Membre trouvé: ${member.user.tag}`);
    
    const verifiedRole = interaction.guild.roles.cache.get(config.verifiedRoleId);

    if (!verifiedRole) {
      logger.error(`[VERIFY] ❌ Rôle vérifié non trouvé: ${config.verifiedRoleId}`);
      await interaction.reply({
        content: '❌ Rôle vérifié non trouvé.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    logger.info(`[VERIFY] Rôle vérifié trouvé: ${verifiedRole.name} (${verifiedRole.id})`);

    if (member.roles.cache.has(verifiedRole.id)) {
      logger.info(`[VERIFY] ⚠️ Membre déjà vérifié`);
      await interaction.reply({
        content: '✅ Cet utilisateur est déjà vérifié.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    logger.info(`[VERIFY] Attribution du rôle ${verifiedRole.name} à ${member.user.tag}...`);
    
    const botMember = await interaction.guild.members.fetch(interaction.client.user!.id);
    const botHighestRole = botMember.roles.highest;
    const targetRolePosition = verifiedRole.position;
    
    logger.info(`[VERIFY] Position du rôle bot: ${botHighestRole.position}, Position du rôle cible: ${targetRolePosition}`);
    
    if (botHighestRole.position <= targetRolePosition) {
      logger.error(`[VERIFY] ❌ Le bot ne peut pas attribuer ce rôle (position trop basse)`);
      await interaction.reply({
        content: `❌ Le bot ne peut pas attribuer ce rôle. Le rôle du bot doit être plus haut que le rôle vérifié dans la hiérarchie Discord.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    if (!interaction.guild.members.me?.permissions.has('ManageRoles')) {
      logger.error(`[VERIFY] ❌ Le bot n'a pas la permission ManageRoles`);
      await interaction.reply({
        content: `❌ Le bot n'a pas la permission de gérer les rôles. Vérifiez les permissions du bot.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    await member.roles.add(verifiedRole).catch(err => {
      logger.error(`[VERIFY] ❌ Erreur lors de l'ajout du rôle:`, err);
      throw err;
    });
    logger.info(`[VERIFY] ✅ Rôle attribué avec succès`);

    if (config.unverifiedRoleId) {
      const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
      if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
        logger.info(`[VERIFY] Suppression du rôle non vérifié: ${unverifiedRole.name}`);
        await member.roles.remove(unverifiedRole).catch(err => {
          logger.error(`[VERIFY] ⚠️ Erreur lors de la suppression du rôle non vérifié:`, err);
        });
      }
    }

    await LogManager.logMessage({
      type: 'verification',
      userId: member.id,
      moderatorId: interaction.user.id,
      data: {
        roleId: verifiedRole.id,
        method: 'webhook_manual',
        platform: 'Discord'
      }
    });

    await WebhookManager.sendVerificationSuccess({
      userId: member.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      avatar: member.user.avatar || undefined,
      guildId: interaction.guild.id
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Vérification Approuvée')
      .setDescription(`${member.user} a été vérifié avec succès par ${interaction.user}.`)
      .addFields(
        { name: '👤 Utilisateur', value: `${member.user.tag}`, inline: true },
        { name: '🆔 ID', value: member.user.id, inline: true },
        { name: '✅ Rôle', value: `<@&${verifiedRole.id}>`, inline: true },
        { name: '👮 Modérateur', value: `${interaction.user.tag}`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setColor('#00ff00')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });

    logger.info(`Utilisateur ${member.user.tag} (${member.id}) vérifié manuellement par ${interaction.user.tag}`);

  } catch (error) {
    logger.error('Erreur lors de la vérification manuelle:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de la vérification.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleVerifyReject(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: '❌ Une erreur est survenue.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({
      content: '❌ Vous devez être administrateur pour refuser des vérifications.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const userId = interaction.customId.replace('verify_reject_', '');

  try {
    const user = await interaction.client.users.fetch(userId).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle('❌ Vérification Refusée')
      .setDescription(`La vérification de ${user ? user.tag : 'l\'utilisateur'} a été refusée par ${interaction.user}.`)
      .addFields(
        { name: '👤 Utilisateur', value: user ? `${user.tag} (${user.id})` : userId, inline: true },
        { name: '👮 Modérateur', value: `${interaction.user.tag}`, inline: true }
      )
      .setColor('#ff0000')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });

    logger.info(`Vérification refusée pour ${user ? user.tag : userId} par ${interaction.user.tag}`);

  } catch (error) {
    logger.error('Erreur lors du refus de vérification:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleAutorole(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: '❌ Une erreur est survenue.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const member = interaction.member as GuildMember;
  const roleId = interaction.customId.replace('autorole_', '');
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    await interaction.reply({
      content: '❌ Rôle introuvable.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(role);
      await interaction.reply({
        content: `✅ Rôle ${role.name} retiré.`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      await member.roles.add(role);
      await interaction.reply({
        content: `✅ Rôle ${role.name} attribué.`,
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    logger.error('Erreur lors de la gestion du rôle:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de la gestion du rôle.',
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function execute(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    await handleCommandInteraction(interaction);
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  } else if (interaction.isStringSelectMenu()) {
    await handleSelectMenuInteraction(interaction);
  } else if (interaction.isModalSubmit()) {
    await handleModalSubmitInteraction(interaction);
  }
}
import { AttachmentBuilder } from 'discord.js';

export class AdvancedCaptchaGenerator {
    /**
     * Génère un captcha mathématique complexe avec opérations multiples
     */
    static generateComplexMath(): { code: string; text: string; type: string } {
        const operations = ['+', '-', '*', '/'];
        const num1 = Math.floor(Math.random() * 50) + 1;
        const num2 = Math.floor(Math.random() * 20) + 1;
        const num3 = Math.floor(Math.random() * 10) + 1;
        
        const operation1 = operations[Math.floor(Math.random() * operations.length)];
        const operation2 = operations[Math.floor(Math.random() * operations.length)];
        
        let result: number;
        let question: string;
        
        // Générer une expression complexe
        if (Math.random() > 0.5) {
            // (a op1 b) op2 c
            const temp = AdvancedCaptchaGenerator.calculate(num1, num2, operation1);
            result = AdvancedCaptchaGenerator.calculate(temp, num3, operation2);
            question = `(${num1} ${operation1} ${num2}) ${operation2} ${num3}`;
        } else {
            // a op1 (b op2 c)
            const temp = AdvancedCaptchaGenerator.calculate(num2, num3, operation2);
            result = AdvancedCaptchaGenerator.calculate(num1, temp, operation1);
            question = `${num1} ${operation1} (${num2} ${operation2} ${num3})`;
        }
        
        const text = `🧮 **Vérification Mathématique Avancée**\n\n` +
                    `**Expression :** \`${question}\`\n\n` +
                    `💡 **Calculez le résultat et répondez avec le nombre uniquement**\n` +
                    `⏰ **Temps :** 3 minutes\n` +
                    `🔄 **Tentatives :** 2 maximum\n` +
                    `🛡️ **Sécurité :** Détection anti-bot activée\n\n` +
                    `✅ Tapez votre réponse dans ce canal !`;
        
        return {
            code: result.toString(),
            text: text,
            type: 'complex_math'
        };
    }

    /**
     * Génère un captcha de séquence de couleurs
     */
    static generateColorSequence(): { code: string; text: string; type: string } {
        const colors = [
            { name: 'ROUGE', emoji: '🔴', code: 'R' },
            { name: 'BLEU', emoji: '🔵', code: 'B' },
            { name: 'VERT', emoji: '🟢', code: 'V' },
            { name: 'JAUNE', emoji: '🟡', code: 'J' },
            { name: 'ORANGE', emoji: '🟠', code: 'O' },
            { name: 'VIOLET', emoji: '🟣', code: 'P' },
            { name: 'ROSE', emoji: '🩷', code: 'S' },
            { name: 'MARRON', emoji: '🤎', code: 'M' }
        ];
        
        // Générer une séquence de 4 couleurs
        const sequence = [];
        for (let i = 0; i < 4; i++) {
            sequence.push(colors[Math.floor(Math.random() * colors.length)]);
        }
        
        const code = sequence.map(c => c.code).join('');
        const display = sequence.map(c => c.emoji).join(' ');
        
        const text = `🎨 **Séquence de Couleurs**\n\n` +
                    `**Mémorisez cette séquence :**\n` +
                    `${display}\n\n` +
                    `**Maintenant, tapez les lettres correspondantes dans l'ordre :**\n` +
                    `💡 **Exemple :** Si vous voyez 🔴🔵🟢🟡, tapez \`RBVJ\`\n\n` +
                    `⏰ **Temps :** 2 minutes\n` +
                    `🔄 **Tentatives :** 2 maximum\n` +
                    `🛡️ **Sécurité :** Détection anti-bot activée\n\n` +
                    `✅ Tapez la séquence dans ce canal !`;
        
        return {
            code: code,
            text: text,
            type: 'color_sequence'
        };
    }

    /**
     * Génère un captcha de mots mélangés
     */
    static generateWordScramble(): { code: string; text: string; type: string } {
        const words = [
            'DISCORD', 'BOT', 'SERVEUR', 'VERIFICATION', 'SECURITE',
            'ADMINISTRATEUR', 'MODERATEUR', 'UTILISATEUR', 'COMMANDE',
            'EMBED', 'ROLE', 'CHANNEL', 'MESSAGE', 'REACTION'
        ];
        
        const word = words[Math.floor(Math.random() * words.length)];
        const scrambled = AdvancedCaptchaGenerator.scrambleWord(word);
        
        const text = `🔤 **Mots Mélangés**\n\n` +
                    `**Le mot suivant est mélangé, trouvez le mot original :**\n` +
                    `\`\`\`\n${scrambled}\n\`\`\`\n\n` +
                    `💡 **Le mot original est :** \`${word}\`\n` +
                    `**Tapez le mot en MAJUSCULES**\n\n` +
                    `⏰ **Temps :** 2 minutes\n` +
                    `🔄 **Tentatives :** 2 maximum\n` +
                    `🛡️ **Sécurité :** Détection anti-bot activée\n\n` +
                    `✅ Tapez le mot dans ce canal !`;
        
        return {
            code: word,
            text: text,
            type: 'word_scramble'
        };
    }

    /**
     * Génère un captcha de calcul de pourcentage
     */
    static generatePercentage(): { code: string; text: string; type: string } {
        const base = Math.floor(Math.random() * 200) + 50; // 50-250
        const percentage = Math.floor(Math.random() * 50) + 10; // 10-60%
        const result = Math.round((base * percentage) / 100);
        
        const text = `📊 **Calcul de Pourcentage**\n\n` +
                    `**Question :** ${percentage}% de ${base} = ?\n\n` +
                    `💡 **Répondez avec le nombre uniquement**\n` +
                    `⏰ **Temps :** 2 minutes\n` +
                    `🔄 **Tentatives :** 2 maximum\n` +
                    `🛡️ **Sécurité :** Détection anti-bot activée\n\n` +
                    `✅ Tapez votre réponse dans ce canal !`;
        
        return {
            code: result.toString(),
            text: text,
            type: 'percentage'
        };
    }

    /**
     * Génère un captcha de logique numérique
     */
    static generateLogicSequence(): { code: string; text: string; type: string } {
        const sequences = [
            { pattern: [2, 4, 6, 8], answer: '10', description: 'Nombres pairs' },
            { pattern: [1, 4, 9, 16], answer: '25', description: 'Carrés parfaits' },
            { pattern: [1, 1, 2, 3], answer: '5', description: 'Suite de Fibonacci' },
            { pattern: [3, 6, 12, 24], answer: '48', description: 'Multiplication par 2' },
            { pattern: [5, 10, 20, 40], answer: '80', description: 'Multiplication par 2' }
        ];
        
        const selected = sequences[Math.floor(Math.random() * sequences.length)];
        const display = selected.pattern.join(', ');
        
        const text = `🧩 **Logique Numérique**\n\n` +
                    `**Trouvez le nombre suivant dans cette séquence :**\n` +
                    `\`${display}, ?\`\n\n` +
                    `💡 **Indice :** ${selected.description}\n` +
                    `**Répondez avec le nombre uniquement**\n\n` +
                    `⏰ **Temps :** 3 minutes\n` +
                    `🔄 **Tentatives :** 2 maximum\n` +
                    `🛡️ **Sécurité :** Détection anti-bot activée\n\n` +
                    `✅ Tapez votre réponse dans ce canal !`;
        
        return {
            code: selected.answer,
            text: text,
            type: 'logic_sequence'
        };
    }

    /**
     * Génère un captcha de calcul de temps
     */
    static generateTimeCalculation(): { code: string; text: string; type: string } {
        const hours = Math.floor(Math.random() * 12) + 1;
        const minutes = Math.floor(Math.random() * 60);
        const addHours = Math.floor(Math.random() * 5) + 1;
        const addMinutes = Math.floor(Math.random() * 60);
        
        const totalMinutes = (hours * 60) + minutes + (addHours * 60) + addMinutes;
        const resultHours = Math.floor(totalMinutes / 60) % 24;
        const resultMinutes = totalMinutes % 60;
        
        const time1 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const time2 = `${addHours}h ${addMinutes}min`;
        const result = `${resultHours.toString().padStart(2, '0')}:${resultMinutes.toString().padStart(2, '0')}`;
        
        const text = `⏰ **Calcul de Temps**\n\n` +
                    `**Question :** Il est ${time1}, dans ${time2}, quelle heure sera-t-il ?\n\n` +
                    `💡 **Répondez au format HH:MM (exemple: 14:30)**\n` +
                    `⏰ **Temps :** 3 minutes\n` +
                    `🔄 **Tentatives :** 2 maximum\n` +
                    `🛡️ **Sécurité :** Détection anti-bot activée\n\n` +
                    `✅ Tapez votre réponse dans ce canal !`;
        
        return {
            code: result,
            text: text,
            type: 'time_calculation'
        };
    }

    /**
     * Génère un captcha aléatoire parmi tous les types avancés
     */
    static generateRandomAdvanced(): { code: string; text: string; type: string } {
        const types = [
            AdvancedCaptchaGenerator.generateComplexMath,
            AdvancedCaptchaGenerator.generateColorSequence,
            AdvancedCaptchaGenerator.generateWordScramble,
            AdvancedCaptchaGenerator.generatePercentage,
            AdvancedCaptchaGenerator.generateLogicSequence,
            AdvancedCaptchaGenerator.generateTimeCalculation
        ];
        
        const selectedType = types[Math.floor(Math.random() * types.length)];
        return selectedType();
    }

    /**
     * Valide une réponse avec des vérifications anti-bot
     */
    static validateAdvancedCaptcha(userAnswer: string, correctCode: string, type: string): {
        isValid: boolean;
        reason?: string;
        suspiciousActivity?: boolean;
    } {
        if (!userAnswer || !correctCode) {
            return { isValid: false, reason: 'Réponse vide' };
        }

        const cleanAnswer = userAnswer.trim().toUpperCase();
        const cleanCode = correctCode.trim().toUpperCase();

        // Vérifications anti-bot
        const suspiciousPatterns = [
            /^(.)\1+$/, // Répétition de caractères (aaaa, 1111)
            /^[0-9]{1,3}$/, // Réponse trop courte pour un calcul complexe
            /^(yes|no|oui|non|ok|test)$/i, // Réponses génériques
            /^(admin|mod|bot|discord)$/i, // Mots interdits
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(cleanAnswer)) {
                return { 
                    isValid: false, 
                    reason: 'Activité suspecte détectée',
                    suspiciousActivity: true 
                };
            }
        }

        // Validation spécifique par type
        switch (type) {
            case 'time_calculation':
                // Vérifier le format HH:MM
                if (!/^\d{1,2}:\d{2}$/.test(cleanAnswer)) {
                    return { isValid: false, reason: 'Format de temps invalide' };
                }
                break;
            
            case 'complex_math':
            case 'percentage':
            case 'logic_sequence':
                // Vérifier que c'est un nombre
                if (!/^\d+$/.test(cleanAnswer)) {
                    return { isValid: false, reason: 'Réponse numérique attendue' };
                }
                break;
        }

        return { isValid: cleanAnswer === cleanCode };
    }

    /**
     * Génère un message d'erreur avancé
     */
    static getAdvancedErrorMessage(attempts: number, maxAttempts: number = 2, suspicious: boolean = false): string {
        const remaining = maxAttempts - attempts;
        
        if (suspicious) {
            return `🚨 **Activité Suspecte Détectée !**\n\n` +
                   `Votre réponse semble être générée par un bot.\n` +
                   `Il vous reste **${remaining}** tentative${remaining > 1 ? 's' : ''}.\n` +
                   `⚠️ **Attention :** D'autres tentatives suspectes entraîneront un bannissement temporaire.`;
        }
        
        if (remaining <= 0) {
            return `❌ **Trop de tentatives !**\n\n` +
                   `Vous avez épuisé toutes vos tentatives de vérification.\n` +
                   `🛡️ **Sécurité :** Votre compte a été temporairement restreint.\n` +
                   `Contactez un administrateur pour obtenir de l'aide.`;
        }
        
        return `❌ **Réponse incorrecte !**\n\n` +
               `Il vous reste **${remaining}** tentative${remaining > 1 ? 's' : ''}.\n` +
               `🛡️ **Sécurité :** Détection anti-bot activée.\n` +
               `Veuillez réessayer avec plus de précision.`;
    }

    /**
     * Génère un message de succès avancé
     */
    static getAdvancedSuccessMessage(): string {
        return `✅ **Vérification Réussie !**\n\n` +
               `🛡️ **Sécurité confirmée** - Vous n'êtes pas un bot !\n` +
               `🎉 **Bienvenue sur le serveur !**\n` +
               `Vous pouvez maintenant accéder à tous les canaux.\n\n` +
               `💡 **Conseil :** Gardez votre compte sécurisé !`;
    }

    // Méthodes utilitaires
    private static calculate(a: number, b: number, operation: string): number {
        switch (operation) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return Math.round(a / b);
            default: return a + b;
        }
    }

    private static scrambleWord(word: string): string {
        const letters = word.split('');
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        return letters.join('');
    }
}


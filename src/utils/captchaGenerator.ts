import { AttachmentBuilder } from 'discord.js';

export class CaptchaGenerator {
    /**
     * Génère un code captcha simple (texte uniquement)
     * Alternative à canvas pour éviter les problèmes de compilation
     */
    static generateCaptcha(): { code: string; text: string } {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Générer un code de 6 caractères
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Créer un texte stylisé pour Discord
        const text = `🔐 **Code de Vérification**\n\n` +
                    `Veuillez taper le code suivant :\n` +
                    `\`\`\`\n${code}\n\`\`\`\n\n` +
                    `⏰ **Temps limité :** 5 minutes\n` +
                    `❌ **Tentatives :** 3 maximum\n\n` +
                    `💡 **Astuce :** Le code est sensible à la casse !`;
        
        return { code, text };
    }

    /**
     * Génère un code captcha avec des caractères mélangés
     */
    static generateMixedCaptcha(): { code: string; text: string } {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Générer un code de 5 caractères
        for (let i = 0; i < 5; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Mélanger les caractères pour plus de sécurité
        const shuffledCode = code.split('').sort(() => Math.random() - 0.5).join('');
        
        const text = `🛡️ **Vérification Anti-Bot**\n\n` +
                    `**Code à saisir :** \`${shuffledCode}\`\n\n` +
                    `⚠️ **Important :**\n` +
                    `• Respectez la casse (majuscules/minuscules)\n` +
                    `• Vous avez 5 minutes pour répondre\n` +
                    `• Maximum 3 tentatives autorisées\n\n` +
                    `✅ Tapez le code dans ce canal pour continuer !`;
        
        return { code: shuffledCode, text };
    }

    /**
     * Génère un captcha mathématique simple
     */
    static generateMathCaptcha(): { code: string; text: string } {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operations = ['+', '-', '*'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        let result: number;
        let question: string;
        
        switch (operation) {
            case '+':
                result = num1 + num2;
                question = `${num1} + ${num2}`;
                break;
            case '-':
                result = num1 - num2;
                question = `${num1} - ${num2}`;
                break;
            case '*':
                result = num1 * num2;
                question = `${num1} × ${num2}`;
                break;
            default:
                result = num1 + num2;
                question = `${num1} + ${num2}`;
        }
        
        const text = `🧮 **Vérification Mathématique**\n\n` +
                    `**Question :** Combien font \`${question}\` ?\n\n` +
                    `💡 **Répondez avec le nombre uniquement**\n` +
                    `⏰ **Temps :** 5 minutes\n` +
                    `🔄 **Tentatives :** 3 maximum\n\n` +
                    `✅ Tapez votre réponse dans ce canal !`;
        
        return { code: result.toString(), text };
    }

    /**
     * Génère un captcha avec des couleurs
     */
    static generateColorCaptcha(): { code: string; text: string } {
        const colors = [
            { name: 'ROUGE', emoji: '🔴', code: 'R' },
            { name: 'BLEU', emoji: '🔵', code: 'B' },
            { name: 'VERT', emoji: '🟢', code: 'V' },
            { name: 'JAUNE', emoji: '🟡', code: 'J' },
            { name: 'ORANGE', emoji: '🟠', code: 'O' },
            { name: 'VIOLET', emoji: '🟣', code: 'P' }
        ];
        
        const selectedColor = colors[Math.floor(Math.random() * colors.length)];
        
        const text = `🎨 **Vérification de Couleur**\n\n` +
                    `**Question :** Quelle est cette couleur ?\n` +
                    `${selectedColor.emoji} **${selectedColor.name}**\n\n` +
                    `💡 **Répondez avec la lettre correspondante :** \`${selectedColor.code}\`\n\n` +
                    `⏰ **Temps :** 5 minutes\n` +
                    `🔄 **Tentatives :** 3 maximum\n\n` +
                    `✅ Tapez \`${selectedColor.code}\` dans ce canal !`;
        
        return { code: selectedColor.code, text };
    }

    /**
     * Génère un captcha aléatoire parmi les types disponibles
     */
    static generateRandomCaptcha(): { code: string; text: string; type: string } {
        const types = [
            { name: 'simple', generator: this.generateCaptcha },
            { name: 'mixed', generator: this.generateMixedCaptcha },
            { name: 'math', generator: this.generateMathCaptcha },
            { name: 'color', generator: this.generateColorCaptcha }
        ];
        
        const selectedType = types[Math.floor(Math.random() * types.length)];
        const result = selectedType.generator();
        
        return {
            code: result.code,
            text: result.text,
            type: selectedType.name
        };
    }

    /**
     * Valide une réponse de captcha
     */
    static validateCaptcha(userAnswer: string, correctCode: string): boolean {
        if (!userAnswer || !correctCode) return false;
        
        // Nettoyer la réponse utilisateur
        const cleanAnswer = userAnswer.trim().toUpperCase();
        const cleanCode = correctCode.trim().toUpperCase();
        
        return cleanAnswer === cleanCode;
    }

    /**
     * Génère un message d'erreur pour captcha incorrect
     */
    static getErrorMessage(attempts: number, maxAttempts: number = 3): string {
        const remaining = maxAttempts - attempts;
        
        if (remaining <= 0) {
            return `❌ **Trop de tentatives !**\n\n` +
                   `Vous avez épuisé toutes vos tentatives de vérification.\n` +
                   `Contactez un administrateur pour obtenir de l'aide.`;
        }
        
        return `❌ **Code incorrect !**\n\n` +
               `Il vous reste **${remaining}** tentative${remaining > 1 ? 's' : ''}.\n` +
               `Veuillez réessayer avec le bon code.`;
    }

    /**
     * Génère un message de succès
     */
    static getSuccessMessage(): string {
        return `✅ **Vérification réussie !**\n\n` +
               `Bienvenue sur le serveur ! Vous pouvez maintenant accéder à tous les canaux.\n` +
               `🎉 Profitez de votre séjour !`;
    }
}
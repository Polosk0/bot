import { createCanvas, loadImage } from 'canvas';

export class CaptchaImageGenerator {
    /**
     * Génère une image de captcha résolu avec un design moderne
     */
    static async generateSolvedCaptchaImage(): Promise<Buffer> {
        const canvas = createCanvas(400, 150);
        const ctx = canvas.getContext('2d');

        // Fond dégradé
        const gradient = ctx.createLinearGradient(0, 0, 400, 150);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 150);

        // Ajouter des éléments décoratifs
        this.addDecorativeElements(ctx);

        // Texte principal
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CAPTCHA RÉSOLU', 200, 50);

        // Code de vérification
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#00ff00';
        ctx.fillText('✓ VERIFIED', 200, 90);

        // Message de confirmation
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Vérification automatique activée', 200, 120);

        return canvas.toBuffer('image/png');
    }

    /**
     * Génère une image de captcha avec un design de sécurité
     */
    static async generateSecurityCaptchaImage(): Promise<Buffer> {
        const canvas = createCanvas(400, 150);
        const ctx = canvas.getContext('2d');

        // Fond sombre
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 400, 150);

        // Bordure verte
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, 396, 146);

        // Icône de sécurité
        ctx.fillStyle = '#00ff00';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', 200, 60);

        // Texte de sécurité
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SÉCURITÉ ACTIVÉE', 200, 90);

        // Message de confirmation
        ctx.font = '14px Arial';
        ctx.fillStyle = '#00ff00';
        ctx.fillText('Vérification web sécurisée', 200, 115);

        return canvas.toBuffer('image/png');
    }

    /**
     * Génère une image de captcha avec un design moderne
     */
    static async generateModernCaptchaImage(): Promise<Buffer> {
        const canvas = createCanvas(400, 150);
        const ctx = canvas.getContext('2d');

        // Fond avec pattern
        this.createPatternBackground(ctx);

        // Cercle de vérification
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(200, 75, 30, 0, 2 * Math.PI);
        ctx.fill();

        // Icône de vérification
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(185, 75);
        ctx.lineTo(195, 85);
        ctx.lineTo(215, 65);
        ctx.stroke();

        // Texte principal
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VÉRIFICATION RÉUSSIE', 200, 120);

        return canvas.toBuffer('image/png');
    }

    /**
     * Ajoute des éléments décoratifs à l'image
     */
    private static addDecorativeElements(ctx: any): void {
        // Lignes décoratives
        for (let i = 0; i < 20; i++) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
            ctx.lineWidth = Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(Math.random() * 400, Math.random() * 150);
            ctx.lineTo(Math.random() * 400, Math.random() * 150);
            ctx.stroke();
        }

        // Points décoratifs
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
            ctx.beginPath();
            ctx.arc(Math.random() * 400, Math.random() * 150, Math.random() * 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    /**
     * Crée un fond avec pattern
     */
    private static createPatternBackground(ctx: any): void {
        // Fond dégradé
        const gradient = ctx.createLinearGradient(0, 0, 400, 150);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#34495e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 150);

        // Pattern de sécurité
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 400; x += 20) {
            for (let y = 0; y < 150; y += 20) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + 10, y + 10);
                ctx.stroke();
            }
        }
    }

    /**
     * Génère une image de captcha aléatoire
     */
    static async generateRandomCaptchaImage(): Promise<Buffer> {
        const types = [
            this.generateSolvedCaptchaImage,
            this.generateSecurityCaptchaImage,
            this.generateModernCaptchaImage
        ];

        const selectedType = types[Math.floor(Math.random() * types.length)];
        return await selectedType();
    }
}

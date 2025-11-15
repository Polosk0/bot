import 'dotenv/config';
import axios from 'axios';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const APPLICATION_ID = process.env.DISCORD_CLIENT_ID || process.env.APPLICATION_ID;
const ACTIVITY_URL = process.env.ACTIVITY_URL || process.env.WEB_VERIFICATION_URL || 'http://localhost:3000';

if (!DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN manquant dans le .env');
    process.exit(1);
}

if (!APPLICATION_ID) {
    console.error('❌ DISCORD_CLIENT_ID ou APPLICATION_ID manquant dans le .env');
    process.exit(1);
}

async function registerActivityCommand() {
    try {
        console.log('📝 Enregistrement de la commande d\'entrée pour l\'activité Discord...');
        console.log(`   Application ID: ${APPLICATION_ID}`);
        console.log(`   Activity URL: ${ACTIVITY_URL}`);

        const commandData = {
            name: 'verify',
            type: 1,
            description: 'Lancer l\'activité de vérification',
            integration_types: [0, 1],
            contexts: [0, 1, 2]
        };

        console.log('\n🔍 Vérification des commandes existantes...');
        const existingCommandsResponse = await axios.get(
            `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`,
            {
                headers: {
                    'Authorization': `Bot ${DISCORD_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const existingCommands = existingCommandsResponse.data;
        console.log(`   ${existingCommands.length} commande(s) trouvée(s)`);

        const existingActivityCommand = existingCommands.find((cmd: any) => 
            cmd.name === 'verify' && 
            cmd.integration_types && 
            cmd.integration_types.includes(0) && 
            cmd.integration_types.includes(1)
        );

        let response;
        if (existingActivityCommand) {
            console.log(`\n🔄 Mise à jour de la commande d'entrée existante (ID: ${existingActivityCommand.id})...`);
            response = await axios.patch(
                `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands/${existingActivityCommand.id}`,
                commandData,
                {
                    headers: {
                        'Authorization': `Bot ${DISCORD_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        } else {
            console.log('\n➕ Création d\'une nouvelle commande d\'entrée...');
            response = await axios.post(
                `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`,
                commandData,
                {
                    headers: {
                        'Authorization': `Bot ${DISCORD_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        console.log('\n✅ Commande d\'entrée enregistrée avec succès !');
        console.log(`   Commande ID: ${response.data.id}`);
        console.log(`   Nom: ${response.data.name}`);
        console.log(`   Type: ${response.data.type}`);
        console.log(`   Integration Types: ${response.data.integration_types?.join(', ') || 'N/A'}`);
        console.log(`   Contexts: ${response.data.contexts?.join(', ') || 'N/A'}`);
        console.log('\n💡 Vérifications à faire dans le Developer Portal:');
        console.log(`   1. URL d'activité configurée: ${ACTIVITY_URL}`);
        console.log(`   2. "Utiliser la dérogation d'URL d'Activité" doit être coché`);
        console.log(`   3. La commande "/verify" doit apparaître dans la liste des commandes`);

    } catch (error: any) {
        if (error.response) {
            console.error('\n❌ Erreur lors de l\'enregistrement de la commande:');
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
            
            if (error.response.status === 400) {
                console.error('\n💡 Vérifiez que:');
                console.error('   - DISCORD_TOKEN est valide');
                console.error('   - DISCORD_CLIENT_ID correspond à l\'application');
                console.error('   - Les permissions du bot sont correctes');
            }
        } else {
            console.error('❌ Erreur:', error.message);
        }
        process.exit(1);
    }
}

registerActivityCommand();


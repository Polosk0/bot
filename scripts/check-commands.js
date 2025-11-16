const { readdirSync } = require('fs');
const { join } = require('path');

const commandsPath = join(__dirname, '../dist/commands');
const commandFolders = readdirSync(commandsPath);

console.log('🔍 Vérification des commandes compilées...\n');

let totalCommands = 0;

for (const folder of commandFolders) {
  const commandFiles = readdirSync(join(commandsPath, folder)).filter(file => 
    file.endsWith('.js') && !file.endsWith('.d.ts')
  );

  if (commandFiles.length > 0) {
    console.log(`📁 ${folder}/`);
    commandFiles.forEach(file => {
      const commandName = file.replace('.js', '');
      console.log(`   ✓ ${commandName}`);
      totalCommands++;
    });
    console.log('');
  }
}

console.log(`✅ Total: ${totalCommands} commandes trouvées dans dist/commands/`);


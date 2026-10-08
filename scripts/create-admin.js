import readline from 'node:readline';
import { configuration } from '../backend/config.js';
import { createAdministrator } from '../backend/services/auth.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));
try {
  const username = await ask('Usuário administrador: ');
  const originalWrite = rl._writeToOutput.bind(rl);
  let hidden = false;
  rl._writeToOutput = function (value) {
    if (!hidden) originalWrite(value);
  };
  process.stdout.write('Senha (mínimo 12 caracteres, não será exibida): ');
  hidden = true;
  const password = await ask('');
  hidden = true;
  process.stdout.write('\n');
  process.stdout.write('Confirme a senha: ');
  hidden = true;
  const confirmation = await ask('');
  hidden = true;
  process.stdout.write('\n');
  if (password !== confirmation) throw new Error('As senhas não conferem.');
  await createAdministrator(configuration(), username, password);
  console.log('Administrador configurado. A senha foi armazenada somente como hash scrypt.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
}

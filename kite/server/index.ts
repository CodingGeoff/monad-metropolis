import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const port = Number(process.env.PORT ?? 4174);
const app = createApp({ staticDir: path.join(root, 'dist') });

app.listen(port, '0.0.0.0', () => {
  console.log(`Kite API listening on 0.0.0.0:${port}`);
});

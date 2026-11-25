const { spawnSync } = require('node:child_process');

const args = [require.resolve('@nestjs/cli/bin/nest.js'), 'start'];
if (process.argv[2] === 'run:dev') args.push('--watch');
const processo = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (processo.error) throw processo.error;
process.exitCode = processo.status ?? 1;

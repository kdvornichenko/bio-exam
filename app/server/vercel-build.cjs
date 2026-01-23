const { execSync } = require('child_process');
const path = require('path');

function run(cmd, cwd) {
  console.log(`Running: ${cmd} in ${cwd}`);
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env }
  });
}

try {
  // Скрипт запускается из app/server (Root Directory в Vercel)
  const serverDir = process.cwd();
  const rootDir = path.resolve(serverDir, '../..');

  console.log('Server directory:', serverDir);
  console.log('Root directory:', rootDir);

  console.log('Building @bio-exam/rbac...');
  run('yarn workspace @bio-exam/rbac build', rootDir);

  console.log('Building @bio-exam/server...');
  run('yarn workspace @bio-exam/server build', rootDir);

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

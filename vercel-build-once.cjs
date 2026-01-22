const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const lockFile = path.join(__dirname, '.vercel-build.lock')

// Проверяем, не запущена ли уже сборка
if (fs.existsSync(lockFile)) {
	console.log('Build already in progress or completed, skipping...')
	process.exit(0)
}

// Создаем lock файл
fs.writeFileSync(lockFile, Date.now().toString())

function run(cmd) {
	console.log(`Running: ${cmd}`)
	execSync(cmd, { stdio: 'inherit' })
}

try {
	console.log('Building @bio-exam/rbac...')
	run('yarn workspace @bio-exam/rbac build')

	console.log('Building @bio-exam/server...')
	run('yarn workspace @bio-exam/server build')

	console.log('Copying build artifacts to root dist...')
	// Создаем корневую директорию dist, если её нет
	if (!fs.existsSync('dist')) {
		fs.mkdirSync('dist')
	}

	// Копируем содержимое app/server/dist в корневой dist
	// Используем shell команду для рекурсивного копирования на Vercel (Linux)
	try {
		execSync('cp -rv app/server/dist/* dist/', { stdio: 'inherit' })
		console.log('Artifacts copied to root dist successfully!')
	} catch (cpError) {
		console.error('Failed to copy artifacts to root dist:', cpError.message)
		// Не выходим с ошибкой, если это локальный запуск на Windows,
		// но на Vercel это должно сработать
	}

	console.log('Build completed successfully!')
} catch (error) {
	console.error('Build failed:', error.message)
	if (fs.existsSync(lockFile)) {
		fs.unlinkSync(lockFile)
	}
	process.exit(1)
}

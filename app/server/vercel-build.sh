#!/bin/bash
set -e

# Переходим в корень монорепы
cd ../..

# Устанавливаем зависимости для всей монорепы
yarn install

# Собираем пакет rbac
yarn workspace @bio-exam/rbac build

# Переходим обратно в server
cd app/server

# Собираем server
yarn build

echo "Build completed successfully"

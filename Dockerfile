# Multi-stage Dockerfile para Laravel (PHP 8.2 + Nginx) e build de assets (Vite)

# 1) Builder de assets (Node)
FROM node:18-alpine AS node-builder
WORKDIR /app

# Dependências do frontend
COPY package.json package-lock.json* ./
RUN npm ci

# Código do projeto (inclui resources e vite.config)
COPY . .
# Build dos assets para produção (gera public/build)
RUN npm run build


# 2) Builder de dependências PHP (Composer)
FROM composer:2 AS composer-builder
WORKDIR /app

# Dependências PHP
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress


# 3) Imagem final: PHP + Nginx (webdevops/php-nginx)
FROM webdevops/php-nginx:8.2-alpine
ENV WEB_DOCUMENT_ROOT=/var/www/html/public
WORKDIR /var/www/html

# Copia código da aplicação
COPY --chown=application:application . .

# Copia vendor e assets gerados nos estágios anteriores
COPY --from=composer-builder /app/vendor ./vendor
COPY --from=node-builder /app/public/build ./public/build

# Opcional: criar link de storage (não falha se já existir)
RUN php -r "file_exists('.env') ?: copy('.env.example', '.env');" \
    && php -r "@mkdir('storage/app/public', 0777, true);" \
    && php artisan storage:link || true

# A imagem webdevops já inicia Nginx+PHP via supervisord
# Porta padrão: 80
EXPOSE 80
# Multi-stage Dockerfile para Laravel (PHP 8.2 + Nginx) e build de assets (Vite)

# 1) Builder de assets (Node)
FROM node:18-alpine AS node-builder
WORKDIR /app

# Dependências do frontend
COPY package.json package-lock.json* ./
RUN npm ci

# Código do projeto (inclui resources e vite.config)
COPY . .
# Build dos assets para produção (gera public/build)
RUN npm run build


# 2) Builder de dependências PHP (Composer)
FROM composer:2 AS composer-builder
WORKDIR /app

# Dependências PHP
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress


# 3) Imagem final: PHP + Nginx (webdevops/php-nginx)
FROM webdevops/php-nginx:8.2-alpine
ENV WEB_DOCUMENT_ROOT=/var/www/html/public
WORKDIR /var/www/html

# Copia código da aplicação
COPY --chown=application:application . .

# Copia vendor e assets gerados nos estágios anteriores
COPY --from=composer-builder /app/vendor ./vendor
COPY --from=node-builder /app/public/build ./public/build

# A imagem webdevops já inicia Nginx+PHP via supervisord
EXPOSE 80
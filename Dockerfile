# ===============================
# Etapa 1: Build do frontend React/Vite
# ===============================
FROM node:20 AS frontend
WORKDIR /app

# Copia dependências e instala
COPY package*.json vite.config.* tsconfig.* ./
COPY resources resources
RUN npm ci && npm run build

# ===============================
# Etapa 2: Backend PHP (Laravel)
# ===============================
FROM php:8.2-cli

# Instala dependências do sistema e extensões PHP
RUN apt-get update && apt-get install -y \
    git curl unzip zip libzip-dev libpng-dev libonig-dev libjpeg-dev libfreetype6-dev libexif-dev \
    libicu-dev libxml2-dev libssl-dev libmcrypt-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql zip gd exif bcmath intl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Instala o Composer globalmente
RUN curl -sS https://getcomposer.org/installer | php && \
    mv composer.phar /usr/local/bin/composer

WORKDIR /var/www

# Copia o código fonte do Laravel
COPY . .

# Copia os assets gerados pelo build do frontend
COPY --from=frontend /app/public/build ./public/build

# Cria banco SQLite vazio (se necessário)
RUN mkdir -p database && touch database/database.sqlite

# ⚙️ Corrige permissões e garante ambiente limpo antes do composer install
RUN chown -R www-data:www-data /var/www && chmod -R 775 /var/www

# 🔍 Adicione debug temporário para verificar erro real do Composer
RUN php -v && composer -V

# 🧩 Instala dependências PHP com log detalhado
RUN COMPOSER_ALLOW_SUPERUSER=1 composer install -vvv --no-dev --prefer-dist --no-interaction --no-progress --ignore-platform-reqs

# Ajusta permissões finais
RUN chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

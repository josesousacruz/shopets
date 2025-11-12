# ===============================
# Etapa 1: Build do frontend React/Vite
# ===============================
FROM node:20 AS frontend
WORKDIR /app
COPY package*.json vite.config.* tsconfig.* ./
COPY resources resources
RUN npm install && npm run build

# ===============================
# Etapa 2: Backend PHP (Laravel)
# ===============================
FROM php:8.2-cli
RUN apt-get update && apt-get install -y \
    git curl unzip zip libzip-dev libpng-dev libonig-dev libjpeg-dev libfreetype6-dev libexif-dev \
    libicu-dev libxml2-dev libssl-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql zip gd exif bcmath intl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN curl -sS https://getcomposer.org/installer | php && \
    mv composer.phar /usr/local/bin/composer

WORKDIR /var/www
COPY . .

# ✅ Ajustado — copia do diretório correto do Vite
COPY --from=frontend /app/public/build ./public/build

RUN mkdir -p database && touch database/database.sqlite
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --ignore-platform-reqs --no-scripts


RUN chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

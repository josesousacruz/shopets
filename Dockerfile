# ===============================
# Etapa 1: Build do frontend React/Vite
# ===============================
FROM node:20 AS frontend

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos do frontend (para não reconstruir o backend à toa)
COPY package*.json vite.config.* tsconfig.* ./
COPY resources resources

# Instala e builda o React/Vite
RUN npm install && npm run build


# ===============================
# Etapa 2: Backend PHP (Laravel)
# ===============================
FROM php:8.2-cli

# Instala dependências do sistema e extensões PHP necessárias
RUN apt-get update && apt-get install -y \
    git curl unzip zip libzip-dev libpng-dev libonig-dev libjpeg-dev libfreetype6-dev libexif-dev \
    libicu-dev libxml2-dev libssl-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql zip gd exif bcmath intl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Instala Composer globalmente
RUN curl -sS https://getcomposer.org/installer | php && \
    mv composer.phar /usr/local/bin/composer

# Define o diretório de trabalho
WORKDIR /var/www

# Copia o código do Laravel
COPY . .

# Copia o build gerado pelo Node para o Laravel (public/build)
COPY --from=frontend /app/dist ./public/build

# Cria banco sqlite (se usado)
RUN mkdir -p database && touch database/database.sqlite

# Instala dependências PHP (sem pacotes de dev)
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --ignore-platform-reqs

# Permissões adequadas
RUN chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

# Exposição da porta do servidor Laravel
EXPOSE 8000

# Comando de inicialização
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

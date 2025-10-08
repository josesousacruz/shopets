# Base: PHP com Node.js embutido
FROM php:8.2-cli

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    git curl unzip zip libzip-dev libpng-dev libonig-dev libjpeg-dev libfreetype6-dev libexif-dev \
    nodejs npm \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql zip gd exif

# Instala Composer
RUN curl -sS https://getcomposer.org/installer | php && \
    mv composer.phar /usr/local/bin/composer

# Define o diretório de trabalho
WORKDIR /var/www

# Copia o projeto Laravel
COPY . .

# Cria o banco sqlite, se não existir
RUN mkdir -p database && touch database/database.sqlite

# Instala dependências PHP (sem dev)
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress

# Não executa comandos artisan em build (serão feitos em runtime)

# Instala dependências JS e builda com Vite
RUN npm install && npm run build

# Permissões corretas
RUN chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

# Caches serão gerados em runtime

# Expõe a porta onde Laravel irá escutar
EXPOSE 8000

# Comando final
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
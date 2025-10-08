# Base: PHP com Node.js embutido
FROM php:8.2-cli

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    git curl unzip zip libzip-dev libpng-dev libonig-dev \
    nodejs npm \
    && docker-php-ext-install pdo pdo_mysql zip gd

# Instala Composer
RUN curl -sS https://getcomposer.org/installer | php && \
    mv composer.phar /usr/local/bin/composer

# Define o diretório de trabalho
WORKDIR /var/www

# Copia o projeto Laravel
COPY . .

# Cria o banco sqlite, se não existir
RUN mkdir -p database && touch database/database.sqlite

# Instala dependências PHP
RUN composer install

# Gera APP_KEY
RUN php artisan key:generate --force

# Executa migrações (se desejar)
RUN php artisan migrate --force

# Instala dependências JS e builda com Vite
RUN npm install && npm run build

# Permissões corretas
RUN chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

# Gera caches do Laravel
RUN php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache

# Expõe a porta onde Laravel irá escutar
EXPOSE 8000

# Comando final
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
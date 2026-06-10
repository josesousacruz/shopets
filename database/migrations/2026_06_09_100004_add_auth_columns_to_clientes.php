<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // A coluna `email` ja existe em clientes (string(150) com index nao-unico).
        // Substituimos o index por um unique e adicionamos as colunas de auth.
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropIndex('clientes_email_index');
        });

        Schema::table('clientes', function (Blueprint $table) {
            $table->unique('email', 'clientes_email_unique');

            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->string('password')->nullable()->after('email_verified_at');
            $table->enum('origem', ['pdv', 'ecommerce', 'ambos'])->default('pdv')->after('password');
            $table->boolean('aceita_marketing')->default(false)->after('origem');
            $table->rememberToken();
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropUnique('clientes_email_unique');
            $table->dropColumn([
                'email_verified_at', 'password',
                'origem', 'aceita_marketing', 'remember_token',
            ]);
            $table->index('email', 'clientes_email_index');
        });
    }
};

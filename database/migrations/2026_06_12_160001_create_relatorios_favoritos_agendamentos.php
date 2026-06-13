<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relatorios_favoritos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->string('slug', 60);
            $t->string('nome', 120);
            $t->json('filtros')->nullable();
            $t->timestamps();
            $t->index(['user_id', 'slug']);
        });

        Schema::create('relatorios_agendamentos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('favorito_id')->nullable()->constrained('relatorios_favoritos')->nullOnDelete();
            $t->string('slug', 60);
            $t->json('filtros')->nullable();
            $t->string('frequencia', 20)->default('mensal'); // diaria, semanal, mensal
            $t->string('emails'); // separados por vírgula
            $t->string('formato', 10)->default('csv');
            $t->date('proxima_execucao');
            $t->boolean('ativo')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relatorios_agendamentos');
        Schema::dropIfExists('relatorios_favoritos');
    }
};

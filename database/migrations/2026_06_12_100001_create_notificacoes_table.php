<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificacoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('id_empresa')->nullable()->constrained('configuracoes_empresa')->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $t->string('tipo', 40);
            $t->string('titulo', 160);
            $t->text('mensagem')->nullable();
            $t->json('payload')->nullable();
            $t->string('link', 255)->nullable();
            $t->timestamp('lida_em')->nullable();
            $t->timestamps();

            $t->index(['user_id', 'lida_em']);
            $t->index(['id_empresa', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificacoes');
    }
};

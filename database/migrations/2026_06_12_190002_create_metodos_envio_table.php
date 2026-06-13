<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metodos_envio', function (Blueprint $t) {
            $t->id();
            $t->string('nome', 100);
            $t->enum('tipo', ['tabela', 'correios', 'melhor_envio', 'frete_gratis'])->default('tabela');
            $t->json('config')->nullable();
            $t->boolean('ativo')->default(true);
            $t->unsignedInteger('ordem')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metodos_envio');
    }
};

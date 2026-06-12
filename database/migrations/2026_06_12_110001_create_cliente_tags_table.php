<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cliente_tags', function (Blueprint $t) {
            $t->id();
            $t->foreignId('id_empresa')->nullable()->constrained('configuracoes_empresa')->cascadeOnDelete();
            $t->string('nome', 60);
            $t->string('cor', 7)->default('#0F766E');
            $t->timestamps();
            $t->unique(['id_empresa', 'nome']);
        });

        Schema::create('cliente_tag', function (Blueprint $t) {
            $t->foreignId('id_cliente')->constrained('clientes', 'id_cliente')->cascadeOnDelete();
            $t->foreignId('tag_id')->constrained('cliente_tags')->cascadeOnDelete();
            $t->primary(['id_cliente', 'tag_id']);
        });

        Schema::create('cliente_notas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('id_cliente')->constrained('clientes', 'id_cliente')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->text('texto');
            $t->timestamps();
            $t->index('id_cliente');
        });

        Schema::create('segmentos_clientes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('id_empresa')->nullable()->constrained('configuracoes_empresa')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('nome', 80);
            $t->json('filtros');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('segmentos_clientes');
        Schema::dropIfExists('cliente_notas');
        Schema::dropIfExists('cliente_tag');
        Schema::dropIfExists('cliente_tags');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('templates_email', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 60)->unique();
            $t->string('nome', 120);
            $t->string('assunto', 200);
            $t->text('corpo_html');
            $t->json('variaveis')->nullable(); // lista de placeholders disponíveis
            $t->boolean('ativo')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('templates_email');
    }
};

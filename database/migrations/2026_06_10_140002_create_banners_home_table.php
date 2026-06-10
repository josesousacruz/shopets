<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('banners_home', function (Blueprint $table) {
            $table->id('id_banner');
            $table->unsignedBigInteger('id_empresa')->default(1);
            $table->string('titulo');
            $table->string('subtitulo')->nullable();
            $table->string('imagem_path')->nullable();
            $table->string('link')->nullable();
            $table->integer('ordem')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamp('vigencia_de')->nullable();
            $table->timestamp('vigencia_ate')->nullable();
            $table->timestamps();

            $table->index(['ativo', 'ordem']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banners_home');
    }
};

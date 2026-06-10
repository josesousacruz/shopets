<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->string('slug', 150)->nullable()->unique();
            $table->text('descricao_seo')->nullable();
            $table->string('imagem_path')->nullable();
            $table->unsignedInteger('ordem')->default(0);
            $table->boolean('visivel_ecommerce')->default(true);
            $table->unsignedBigInteger('id_categoria_pai')->nullable();
            $table->foreign('id_categoria_pai')
                  ->references('id_categoria')->on('categorias')
                  ->nullOnDelete();
            $table->index('ordem');
        });
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropForeign(['id_categoria_pai']);
            $table->dropIndex(['ordem']);
            $table->dropColumn([
                'slug', 'descricao_seo', 'imagem_path',
                'ordem', 'visivel_ecommerce', 'id_categoria_pai',
            ]);
        });
    }
};

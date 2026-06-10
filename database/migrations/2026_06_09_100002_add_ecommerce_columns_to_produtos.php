<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->string('slug', 220)->nullable()->unique();
            $table->string('descricao_curta', 500)->nullable();
            $table->text('descricao_longa')->nullable();
            $table->unsignedInteger('peso_gramas')->nullable();
            $table->decimal('altura_cm', 6, 2)->nullable();
            $table->decimal('largura_cm', 6, 2)->nullable();
            $table->decimal('comprimento_cm', 6, 2)->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 320)->nullable();
            $table->string('og_image_path')->nullable();
            $table->boolean('destaque')->default(false);
            $table->boolean('novo')->default(false);
            $table->boolean('em_promocao')->default(false);
            $table->decimal('preco_promocional', 10, 2)->nullable();
            $table->boolean('visivel_ecommerce')->default(false);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE produtos ADD FULLTEXT INDEX produtos_fulltext_idx (nome, descricao_curta, descricao_longa)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE produtos DROP INDEX produtos_fulltext_idx');
        }

        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn([
                'slug', 'descricao_curta', 'descricao_longa',
                'peso_gramas', 'altura_cm', 'largura_cm', 'comprimento_cm',
                'meta_title', 'meta_description', 'og_image_path',
                'destaque', 'novo', 'em_promocao', 'preco_promocional',
                'visivel_ecommerce',
            ]);
        });
    }
};

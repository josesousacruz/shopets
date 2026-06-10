<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            if (! Schema::hasColumn('pedidos', 'etiqueta_url')) {
                $table->string('etiqueta_url')->nullable()->after('codigo_rastreio');
            }
            if (! Schema::hasColumn('pedidos', 'id_cupom')) {
                $table->unsignedBigInteger('id_cupom')->nullable()->after('etiqueta_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            if (Schema::hasColumn('pedidos', 'etiqueta_url')) {
                $table->dropColumn('etiqueta_url');
            }
            if (Schema::hasColumn('pedidos', 'id_cupom')) {
                $table->dropColumn('id_cupom');
            }
        });
    }
};

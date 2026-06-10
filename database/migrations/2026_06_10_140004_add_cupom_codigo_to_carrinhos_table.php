<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('carrinhos', function (Blueprint $table) {
            if (! Schema::hasColumn('carrinhos', 'cupom_codigo')) {
                $table->string('cupom_codigo')->nullable()->after('id_cliente');
            }
        });
    }

    public function down(): void
    {
        Schema::table('carrinhos', function (Blueprint $table) {
            if (Schema::hasColumn('carrinhos', 'cupom_codigo')) {
                $table->dropColumn('cupom_codigo');
            }
        });
    }
};

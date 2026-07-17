<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendas', function (Blueprint $t) {
            if (! Schema::hasColumn('vendas', 'nfce_chave')) {
                $t->string('nfce_chave', 60)->nullable();
                $t->string('nfce_numero', 20)->nullable();
                $t->string('nfce_danfce_url', 255)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $t) {
            $t->dropColumn(['nfce_chave', 'nfce_numero', 'nfce_danfce_url']);
        });
    }
};

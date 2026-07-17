<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'payment_driver')) {
                // fake (padrão/simulado) | yapay
                $t->string('payment_driver', 20)->default('fake');
                $t->text('yapay_token_account')->nullable(); // cast 'encrypted'
                // true = sandbox/homologação (padrão), false = produção real.
                $t->boolean('yapay_sandbox')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn(['payment_driver', 'yapay_token_account', 'yapay_sandbox']);
        });
    }
};

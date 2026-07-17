<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'mercadopago_webhook_secret')) {
                // Secret de assinatura do webhook (x-signature), obtido no painel do MP
                // (Suas integrações → Webhooks). Cast 'encrypted' + write-only na API.
                $t->text('mercadopago_webhook_secret')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn('mercadopago_webhook_secret');
        });
    }
};

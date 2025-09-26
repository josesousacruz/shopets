<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pagamentos_venda', function (Blueprint $table) {
            $table->id('id_pagamento');
            $table->foreignId('id_venda')->constrained('vendas', 'id_venda')->onDelete('cascade');
            $table->foreignId('id_forma_pagamento')->constrained('formas_pagamento', 'id_forma_pagamento')->onDelete('restrict');
            $table->decimal('valor_pagamento', 10, 2);
            $table->integer('numero_parcelas')->default(1);
            $table->decimal('valor_parcela', 10, 2);
            $table->string('numero_transacao', 100)->nullable();
            $table->string('numero_autorizacao', 50)->nullable();
            $table->enum('status_pagamento', ['pendente', 'aprovado', 'rejeitado', 'cancelado'])->default('pendente');
            $table->timestamp('data_pagamento')->useCurrent();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index('id_venda');
            $table->index('id_forma_pagamento');
            $table->index('status_pagamento');
            $table->index('data_pagamento');
            $table->index('numero_transacao');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pagamentos_venda');
    }
};
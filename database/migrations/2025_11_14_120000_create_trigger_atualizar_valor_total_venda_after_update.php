<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Executar apenas em MySQL/MariaDB
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        // Criar trigger BEFORE UPDATE em vendas para recalcular subtotal/total via SET NEW.*
        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_valor_total_venda_before_update');
        DB::unprepared('
            CREATE TRIGGER tr_atualizar_valor_total_venda_before_update
            BEFORE UPDATE ON vendas
            FOR EACH ROW
            BEGIN
                SET NEW.valor_subtotal = (
                    SELECT COALESCE(SUM(valor_total_item), 0)
                    FROM itens_venda
                    WHERE id_venda = NEW.id_venda
                );
                SET NEW.valor_total = NEW.valor_subtotal + NEW.valor_acrescimo - NEW.valor_desconto;
            END
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_valor_total_venda_before_update');
    }
};
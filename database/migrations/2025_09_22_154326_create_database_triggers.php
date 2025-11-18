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
        // Só executar triggers em bancos MySQL/MariaDB
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        // Trigger 1: Atualizar estoque automaticamente após venda
        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_estoque_venda');
        DB::unprepared('
            CREATE TRIGGER tr_atualizar_estoque_venda
            AFTER INSERT ON itens_venda
            FOR EACH ROW
            BEGIN
                UPDATE produtos 
                SET estoque_atual = estoque_atual - NEW.quantidade
                WHERE id_produto = NEW.id_produto;
                
                INSERT INTO movimentacoes_estoque (
                    id_produto, id_usuario, id_item_venda, tipo_movimentacao, 
                    quantidade, valor_unitario, data_movimentacao, created_at, updated_at
                ) VALUES (
                    NEW.id_produto, 1, NEW.id_item, "venda", 
                    NEW.quantidade, NEW.preco_unitario, NOW(), NOW(), NOW()
                );
            END
        ');

        // Trigger 2: Calcular pontos de fidelidade automaticamente
        DB::unprepared('DROP TRIGGER IF EXISTS tr_calcular_pontos_fidelidade');
        DB::unprepared('
            CREATE TRIGGER tr_calcular_pontos_fidelidade
            AFTER UPDATE ON vendas
            FOR EACH ROW
            BEGIN
                IF NEW.status = "finalizada" AND OLD.status != "finalizada" AND NEW.id_cliente IS NOT NULL THEN
                    UPDATE clientes 
                    SET pontos_fidelidade = pontos_fidelidade + (NEW.valor_total * 0.01)
                    WHERE id_cliente = NEW.id_cliente;
                END IF;
            END
        ');

        // Trigger 3: Verificar estoque mínimo
        DB::unprepared('DROP TRIGGER IF EXISTS tr_verificar_estoque_minimo');
        DB::unprepared('
            CREATE TRIGGER tr_verificar_estoque_minimo
            AFTER UPDATE ON produtos
            FOR EACH ROW
            BEGIN
                IF NEW.estoque_atual <= NEW.estoque_minimo THEN
                    INSERT INTO movimentacoes_estoque (
                        id_produto, id_usuario, tipo_movimentacao, quantidade, 
                        observacoes, data_movimentacao, created_at, updated_at
                    ) VALUES (
                        NEW.id_produto, 1, "ajuste", 0, 
                        CONCAT("ALERTA: Estoque abaixo do mínimo. Atual: ", NEW.estoque_atual, " Mínimo: ", NEW.estoque_minimo),
                        NOW(), NOW(), NOW()
                    );
                END IF;
            END
        ');

        // Trigger 4: Atualizar valores da venda (subtotal, desconto e total)
        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_valor_total_venda');
        DB::unprepared('
            CREATE TRIGGER tr_atualizar_valor_total_venda
            AFTER INSERT ON itens_venda
            FOR EACH ROW
            BEGIN
                UPDATE vendas 
                SET valor_subtotal = (
                    SELECT COALESCE(SUM(preco_unitario * quantidade), 0) 
                    FROM itens_venda 
                    WHERE id_venda = NEW.id_venda
                ),
                valor_desconto = (
                    SELECT COALESCE(SUM(desconto_item), 0)
                    FROM itens_venda
                    WHERE id_venda = NEW.id_venda
                ),
                valor_total = valor_subtotal + valor_acrescimo - valor_desconto
                WHERE id_venda = NEW.id_venda;
            END
        ');

        // Trigger 5: Validar limite de crédito do cliente
        DB::unprepared('DROP TRIGGER IF EXISTS tr_validar_limite_credito');
        DB::unprepared('
            CREATE TRIGGER tr_validar_limite_credito
            BEFORE INSERT ON vendas
            FOR EACH ROW
            BEGIN
                DECLARE limite_disponivel DECIMAL(10,2);
                
                IF NEW.id_cliente IS NOT NULL THEN
                    SELECT (limite_credito - credito_utilizado) INTO limite_disponivel
                    FROM clientes 
                    WHERE id_cliente = NEW.id_cliente;
                    
                    IF limite_disponivel < NEW.valor_total THEN
                        SIGNAL SQLSTATE "45000" 
                        SET MESSAGE_TEXT = "Limite de crédito insuficiente para esta venda";
                    END IF;
                END IF;
            END
        ');

        // Trigger 6: Atualizar crédito utilizado do cliente
        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_credito_cliente');
        DB::unprepared('
            CREATE TRIGGER tr_atualizar_credito_cliente
            AFTER UPDATE ON vendas
            FOR EACH ROW
            BEGIN
                IF NEW.status = "finalizada" AND OLD.status != "finalizada" AND NEW.id_cliente IS NOT NULL THEN
                    UPDATE clientes 
                    SET credito_utilizado = credito_utilizado + NEW.valor_total
                    WHERE id_cliente = NEW.id_cliente;
                END IF;
                
                IF NEW.status = "cancelada" AND OLD.status = "finalizada" AND NEW.id_cliente IS NOT NULL THEN
                    UPDATE clientes 
                    SET credito_utilizado = credito_utilizado - NEW.valor_total
                    WHERE id_cliente = NEW.id_cliente;
                END IF;
            END
        ');

        // Trigger 7: Gerar número sequencial de venda
        DB::unprepared('DROP TRIGGER IF EXISTS tr_gerar_numero_venda');
        DB::unprepared('
            CREATE TRIGGER tr_gerar_numero_venda
            BEFORE INSERT ON vendas
            FOR EACH ROW
            BEGIN
                DECLARE next_number INT;
                DECLARE formatted_number VARCHAR(20);
                
                SELECT COALESCE(MAX(CAST(SUBSTRING(numero_venda, 5) AS UNSIGNED)), 0) + 1 
                INTO next_number
                FROM vendas 
                WHERE numero_venda LIKE CONCAT(YEAR(CURDATE()), "%");
                
                SET formatted_number = CONCAT(YEAR(CURDATE()), LPAD(next_number, 6, "0"));
                SET NEW.numero_venda = formatted_number;
            END
        ');

        // Trigger 8: Fluxo de caixa para vendas finalizadas
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_venda');
        DB::unprepared('
            CREATE TRIGGER tr_fluxo_caixa_venda
            AFTER UPDATE ON vendas
            FOR EACH ROW
            BEGIN
                IF NEW.status = "finalizada" AND OLD.status != "finalizada" THEN
                    INSERT INTO fluxo_caixa (
                        user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                    ) VALUES (
                        NEW.id_usuario, NEW.id_pdv, "entrada", NEW.valor_total, 
                        CONCAT("Venda #", NEW.numero_venda), "venda", NOW(), NOW()
                    );
                END IF;
            END
        ');

        // Trigger 9: Fluxo de caixa para pagamento de contas a pagar
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_conta_pagar');
        DB::unprepared('
            CREATE TRIGGER tr_fluxo_caixa_conta_pagar
            AFTER UPDATE ON contas_pagar
            FOR EACH ROW
            BEGIN
                IF NEW.status = "pago" AND OLD.status != "pago" AND NEW.data_pagamento IS NOT NULL THEN
                    INSERT INTO fluxo_caixa (
                        user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                    ) VALUES (
                        NEW.user_id, NEW.id_pdv, "saida", NEW.valor_pago, 
                        CONCAT("Pagamento - ", NEW.descricao), "despesa", NOW(), NOW()
                    );
                END IF;
            END
        ');

        // Trigger 10: Fluxo de caixa para recebimento de contas a receber
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_conta_receber');
        DB::unprepared('
            CREATE TRIGGER tr_fluxo_caixa_conta_receber
            AFTER UPDATE ON contas_receber
            FOR EACH ROW
            BEGIN
                IF NEW.status = "recebido" AND OLD.status != "recebido" AND NEW.data_recebimento IS NOT NULL THEN
                    INSERT INTO fluxo_caixa (
                        user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                    ) VALUES (
                        NEW.user_id, NEW.id_pdv, "entrada", NEW.valor_recebido, 
                        CONCAT("Recebimento - ", NEW.descricao), "receita", NOW(), NOW()
                    );
                END IF;
            END
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Só executar em bancos MySQL/MariaDB
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_estoque_venda');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_calcular_pontos_fidelidade');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_verificar_estoque_minimo');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_valor_total_venda');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_validar_limite_credito');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_credito_cliente');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_gerar_numero_venda');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_venda');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_conta_pagar');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_conta_receber');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Só executar triggers em bancos MySQL/MariaDB
        if (DB::connection()->getDriverName() !== 'mysql') {
            Log::info('Migration skipped: Database is not MySQL/MariaDB');
            return;
        }

        Log::info('Starting stock triggers migration...');

        try {
            // Verificar se trigger antiga existe
            $oldTriggerExists = $this->triggerExists('tr_atualizar_estoque_venda');
            Log::info('Old trigger exists: ' . ($oldTriggerExists ? 'YES' : 'NO'));

            // Remover a trigger antiga de estoque
            DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_estoque_venda');
            Log::info('Old trigger dropped successfully');

            // Verificar se foi removida
            if ($this->triggerExists('tr_atualizar_estoque_venda')) {
                throw new \Exception('Failed to drop old trigger tr_atualizar_estoque_venda');
            }

            // Nova trigger: Atualizar estoque apenas quando venda for finalizada
            DB::unprepared('
                CREATE TRIGGER tr_atualizar_estoque_venda_finalizada
                AFTER UPDATE ON vendas
                FOR EACH ROW
                BEGIN
                    -- Quando venda é finalizada, debitar estoque de todos os itens
                    IF NEW.status = "finalizada" AND OLD.status != "finalizada" THEN
                        -- Atualizar estoque dos produtos
                        UPDATE produtos p
                        INNER JOIN itens_venda iv ON p.id_produto = iv.id_produto
                        SET p.estoque_atual = p.estoque_atual - iv.quantidade
                        WHERE iv.id_venda = NEW.id_venda;
                        
                        -- Inserir movimentações de estoque para todos os itens
                        INSERT INTO movimentacoes_estoque (
                            id_produto, id_usuario, id_item_venda, tipo_movimentacao, 
                            quantidade, valor_unitario, data_movimentacao, created_at, updated_at
                        )
                        SELECT 
                            iv.id_produto, NEW.id_usuario, iv.id_item, "venda", 
                            iv.quantidade, iv.preco_unitario, NOW(), NOW(), NOW()
                        FROM itens_venda iv
                        WHERE iv.id_venda = NEW.id_venda;
                    END IF;
                    
                    -- Quando venda é cancelada (de finalizada para cancelada), devolver estoque
                    IF NEW.status = "cancelada" AND OLD.status = "finalizada" THEN
                        -- Devolver estoque dos produtos
                        UPDATE produtos p
                        INNER JOIN itens_venda iv ON p.id_produto = iv.id_produto
                        SET p.estoque_atual = p.estoque_atual + iv.quantidade
                        WHERE iv.id_venda = NEW.id_venda;
                        
                        -- Inserir movimentações de estoque de devolução
                        INSERT INTO movimentacoes_estoque (
                            id_produto, id_usuario, id_item_venda, tipo_movimentacao, 
                            quantidade, valor_unitario, data_movimentacao, observacoes, created_at, updated_at
                        )
                        SELECT 
                            iv.id_produto, NEW.id_usuario, iv.id_item, "devolucao", 
                            iv.quantidade, iv.preco_unitario, NOW(), 
                            CONCAT("Devolução por cancelamento da venda #", NEW.numero_venda), NOW(), NOW()
                        FROM itens_venda iv
                        WHERE iv.id_venda = NEW.id_venda;
                    END IF;
                END
            ');
            Log::info('Main stock trigger created successfully');

            // Verificar se a trigger foi criada
            if (!$this->triggerExists('tr_atualizar_estoque_venda_finalizada')) {
                throw new \Exception('Failed to create trigger tr_atualizar_estoque_venda_finalizada');
            }

            // Trigger para remover itens da venda (quando venda ainda não está finalizada)
            DB::unprepared('
                CREATE TRIGGER tr_remover_item_venda_nao_finalizada
                AFTER DELETE ON itens_venda
                FOR EACH ROW
                BEGIN
                    DECLARE venda_status VARCHAR(20);
                    
                    -- Verificar status da venda
                    SELECT status INTO venda_status
                    FROM vendas 
                    WHERE id_venda = OLD.id_venda;
                    
                    -- Se a venda já foi finalizada, não permitir remoção de itens
                    IF venda_status = "finalizada" THEN
                        SIGNAL SQLSTATE "45000" 
                        SET MESSAGE_TEXT = "Não é possível remover itens de uma venda finalizada";
                    END IF;
                END
            ');
            Log::info('Protection trigger created successfully');

            // Verificar se a trigger foi criada
            if (!$this->triggerExists('tr_remover_item_venda_nao_finalizada')) {
                throw new \Exception('Failed to create trigger tr_remover_item_venda_nao_finalizada');
            }

            // Verificação final - listar todas as triggers criadas
            $triggers = $this->listStockTriggers();
            Log::info('Migration completed successfully. Created triggers: ' . implode(', ', $triggers));

        } catch (\Exception $e) {
            Log::error('Stock triggers migration failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Verificar se uma trigger existe
     */
    private function triggerExists(string $triggerName): bool
    {
        $result = DB::select("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?", [$triggerName]);
        return count($result) > 0;
    }

    /**
     * Listar todas as triggers relacionadas ao estoque
     */
    private function listStockTriggers(): array
    {
        $rows = DB::select("SHOW TRIGGERS");
        $names = array_column($rows, 'Trigger');
        return array_values(array_filter($names, function ($t) {
            return str_contains($t, 'estoque') || str_contains($t, 'venda');
        }));
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

        // Remover as novas triggers
        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_estoque_venda_finalizada');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_remover_item_venda_nao_finalizada');

        // Recriar a trigger original
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
    }
};

<?php

namespace App\Services\Financeiro;

use App\Models\PlanoConta;
use Illuminate\Support\Collection;
use RuntimeException;

class PlanoContaInvalidoException extends RuntimeException {}

class PlanoContasService
{
    /** Retorna a árvore aninhada (raízes → filhos). */
    public function tree(): array
    {
        $todos = PlanoConta::orderBy('codigo')->get();

        return $this->montar($todos, null);
    }

    private function montar(Collection $todos, ?int $parentId): array
    {
        return $todos
            ->where('parent_id', $parentId)
            ->map(fn (PlanoConta $c) => [
                'id' => $c->id,
                'codigo' => $c->codigo,
                'nome' => $c->nome,
                'tipo' => $c->tipo,
                'ativo' => $c->ativo,
                'parent_id' => $c->parent_id,
                'filhos' => $this->montar($todos, $c->id),
            ])
            ->values()
            ->all();
    }

    public function criar(array $data): PlanoConta
    {
        $tipo = $data['tipo'] ?? null;
        if (! empty($data['parent_id'])) {
            $pai = PlanoConta::findOrFail($data['parent_id']);
            $tipo = $pai->tipo; // filho herda o tipo do pai
        }

        return PlanoConta::create([
            'id_empresa' => $data['id_empresa'] ?? null,
            'parent_id' => $data['parent_id'] ?? null,
            'tipo' => $tipo,
            'codigo' => $data['codigo'],
            'nome' => $data['nome'],
            'ativo' => $data['ativo'] ?? true,
        ]);
    }

    /** Move um nó para um novo pai (ou raiz), evitando ciclos. */
    public function mover(PlanoConta $conta, ?int $novoParentId): PlanoConta
    {
        if ($novoParentId !== null) {
            if ($novoParentId === $conta->id) {
                throw new PlanoContaInvalidoException('Uma conta não pode ser pai de si mesma.');
            }
            $descendentes = $this->idsDescendentes($conta);
            if (in_array($novoParentId, $descendentes, true)) {
                throw new PlanoContaInvalidoException('Não é possível mover para um descendente.');
            }
            $novoPai = PlanoConta::findOrFail($novoParentId);
            $conta->tipo = $novoPai->tipo;
        }

        $conta->parent_id = $novoParentId;
        $conta->save();

        return $conta->refresh();
    }

    /** Desativa a conta e toda a subárvore. */
    public function desativar(PlanoConta $conta): void
    {
        $ids = array_merge([$conta->id], $this->idsDescendentes($conta));
        PlanoConta::whereIn('id', $ids)->update(['ativo' => false]);
    }

    /** @return array<int,int> */
    private function idsDescendentes(PlanoConta $conta): array
    {
        $todos = PlanoConta::get(['id', 'parent_id']);
        $resultado = [];
        $stack = [$conta->id];
        while ($stack) {
            $atual = array_pop($stack);
            foreach ($todos->where('parent_id', $atual) as $filho) {
                $resultado[] = $filho->id;
                $stack[] = $filho->id;
            }
        }

        return $resultado;
    }
}

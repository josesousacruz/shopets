<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Http\Requests\Painel\ClienteStoreRequest;
use App\Http\Requests\Painel\ClienteUpdateRequest;
use App\Mail\ClienteCriadoSenha;
use App\Models\Cliente;
use App\Models\ClienteNota;
use App\Models\ClienteTag;
use App\Models\Cupom;
use App\Models\SegmentoCliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use League\Csv\Writer;

class ClienteAdminController extends Controller
{
    public function index(Request $request)
    {
        $q = Cliente::query()->withCount('pedidos');

        if ($busca = $request->query('q')) {
            $digits = preg_replace('/\D/', '', $busca);
            $q->where(function ($w) use ($busca, $digits) {
                $w->where('nome', 'like', "%{$busca}%")
                  ->orWhere('email', 'like', "%{$busca}%");
                if ($digits !== '') $w->orWhere('cpf_cnpj', 'like', "%{$digits}%");
            });
        }

        match ($request->query('status')) {
            'ativo' => $q->where('ativo', 1),
            'inativo' => $q->where('ativo', 0),
            'sem_compras' => $q->doesntHave('pedidos'),
            default => null,
        };

        if ($tagId = $request->query('tag_id')) {
            $q->whereHas('tags', fn ($t) => $t->where('cliente_tags.id', $tagId));
        }

        if ($de = $request->query('criado_de')) {
            $q->whereDate('created_at', '>=', $de);
        }
        if ($ate = $request->query('criado_ate')) {
            $q->whereDate('created_at', '<=', $ate);
        }

        $page = $q->latest()->paginate(20);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function show(Cliente $cliente)
    {
        $cliente->load(['tags', 'notas.user:id,name', 'enderecos']);

        return response()->json([
            'data' => [
                'cliente' => $cliente,
                'metricas' => $cliente->metricas,
            ],
        ]);
    }

    public function store(ClienteStoreRequest $request)
    {
        $senha = Str::random(10);
        $enviarEmail = (bool) $request->input('enviar_email', true);

        $cliente = Cliente::create([
            'nome' => $request->input('nome'),
            'email' => $request->input('email'),
            'cpf_cnpj' => $request->input('cpf_cnpj'),
            'telefone' => $request->input('telefone'),
            'tipo_pessoa' => $request->input('tipo_pessoa', 'fisica'),
            'data_nascimento' => $request->input('data_nascimento'),
            'aceita_marketing' => (bool) $request->input('aceita_marketing', false),
            'password' => Hash::make($senha),
            'ativo' => true,
            'origem' => 'ecommerce',
        ]);

        if ($enviarEmail) {
            Mail::to($cliente->email)->queue(new ClienteCriadoSenha($cliente, $senha));
        }

        return response()->json(['data' => $cliente], 201);
    }

    public function update(ClienteUpdateRequest $request, Cliente $cliente)
    {
        $cliente->update($request->only([
            'nome', 'email', 'cpf_cnpj', 'telefone', 'tipo_pessoa',
            'data_nascimento', 'aceita_marketing', 'ativo',
        ]));

        return response()->json(['data' => $cliente->refresh()]);
    }

    public function toggle(Cliente $cliente)
    {
        $cliente->update(['ativo' => ! $cliente->ativo]);

        return response()->json(['data' => ['ativo' => $cliente->ativo]]);
    }

    public function destroy(Cliente $cliente)
    {
        $cliente->delete();
        return response()->noContent();
    }

    public function export(Request $request)
    {
        $csv = Writer::createFromString();
        $csv->insertOne(['Nome', 'Email', 'CPF/CNPJ', 'Telefone', 'Total gasto', 'Qtd pedidos', 'Última compra', 'Status']);

        Cliente::query()
            ->withCount('pedidos')
            ->chunk(500, function ($lote) use ($csv) {
                foreach ($lote as $c) {
                    $m = $c->metricas;
                    $csv->insertOne([
                        $c->nome, $c->email, $c->cpf_cnpj, $c->telefone,
                        number_format($m['total_gasto'], 2, '.', ''),
                        $c->pedidos_count,
                        $m['ultima_compra'],
                        $c->ativo ? 'ativo' : 'inativo',
                    ]);
                }
            });

        return response($csv->toString(), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="clientes.csv"',
        ]);
    }

    // ── Notas ──
    public function storeNota(Request $request, Cliente $cliente)
    {
        $data = $request->validate(['texto' => ['required', 'string', 'max:2000']]);
        $nota = $cliente->notas()->create([
            'user_id' => $request->user()->id,
            'texto' => $data['texto'],
        ]);

        return response()->json(['data' => $nota->load('user:id,name')], 201);
    }

    public function destroyNota(Request $request, Cliente $cliente, ClienteNota $nota)
    {
        abort_unless($nota->id_cliente === $cliente->id_cliente, 404);
        abort_unless($nota->user_id === $request->user()->id, 403);
        $nota->delete();
        return response()->noContent();
    }

    // ── Tags ──
    public function syncTags(Request $request, Cliente $cliente)
    {
        $data = $request->validate([
            'tag_ids' => ['array'],
            'tag_ids.*' => ['integer', 'exists:cliente_tags,id'],
        ]);
        $cliente->tags()->sync($data['tag_ids'] ?? []);
        return response()->json(['data' => $cliente->tags()->get()]);
    }

    // ── Email avulso ──
    public function enviarEmail(Request $request, Cliente $cliente)
    {
        $data = $request->validate([
            'assunto' => ['required', 'string', 'max:160'],
            'corpo' => ['required', 'string'],
        ]);

        Mail::raw($data['corpo'], function ($m) use ($cliente, $data) {
            $m->to($cliente->email)->subject($data['assunto']);
        });

        return response()->json(['data' => ['ok' => true]]);
    }

    // ── Cupom exclusivo ──
    public function gerarCupom(Request $request, Cliente $cliente)
    {
        $data = $request->validate([
            'tipo' => ['required', 'in:percentual,fixo,frete_gratis'],
            'valor' => ['required_unless:tipo,frete_gratis', 'numeric', 'min:0'],
            'validade' => ['nullable', 'date'],
            'uso_maximo' => ['nullable', 'integer', 'min:1'],
        ]);

        $codigo = 'CLI' . str_pad((string) $cliente->id_cliente, 4, '0', STR_PAD_LEFT) . '-' . strtoupper(Str::random(4));

        $cupom = Cupom::create([
            'codigo' => $codigo,
            'tipo' => $data['tipo'],
            'valor' => $data['valor'] ?? 0,
            'validade' => $data['validade'] ?? null,
            'uso_maximo' => $data['uso_maximo'] ?? 1,
            'ativo' => true,
        ]);

        return response()->json(['data' => $cupom], 201);
    }

    // ── Tags master CRUD ──
    public function tagsIndex()
    {
        return response()->json(['data' => ClienteTag::orderBy('nome')->get()]);
    }
    public function tagsStore(Request $r)
    {
        $data = $r->validate([
            'nome' => ['required', 'string', 'max:60'],
            'cor' => ['nullable', 'string', 'max:7'],
        ]);
        return response()->json(['data' => ClienteTag::create($data)], 201);
    }
    public function tagsDestroy(ClienteTag $tag)
    {
        $tag->delete();
        return response()->noContent();
    }

    // ── Segmentos salvos ──
    public function segmentosIndex(Request $r)
    {
        return response()->json([
            'data' => SegmentoCliente::where('user_id', $r->user()->id)->orderBy('nome')->get(),
        ]);
    }
    public function segmentosStore(Request $r)
    {
        $data = $r->validate([
            'nome' => ['required', 'string', 'max:80'],
            'filtros' => ['required', 'array'],
        ]);
        $seg = SegmentoCliente::create([
            'user_id' => $r->user()->id,
            'nome' => $data['nome'],
            'filtros' => $data['filtros'],
        ]);
        return response()->json(['data' => $seg], 201);
    }
    public function segmentosDestroy(Request $r, SegmentoCliente $segmento)
    {
        abort_unless($segmento->user_id === $r->user()->id, 403);
        $segmento->delete();
        return response()->noContent();
    }
}

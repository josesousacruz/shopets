<?php

namespace Tests\Feature\Painel;

use App\Models\ContaBancaria;
use App\Models\ContaPagar;
use App\Models\ExtratoBancarioLinha;
use App\Models\PontoVenda;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConciliacaoOfxTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected ContaBancaria $conta;
    protected int $pdv;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
        $this->pdv = PontoVenda::create(['nome_pdv' => 'Loja', 'ativo' => true])->id_pdv;
        $this->conta = ContaBancaria::create(['tipo' => 'banco', 'nome' => 'Itaú']);
    }

    private function ofx(): string
    {
        return <<<OFX
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20260731<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>341<ACCTID>12345<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20260701<DTEND>20260731
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260715<TRNAMT>-150.00<FITID>FIT-1<MEMO>Pagamento fornecedor ACME</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>1000.00<DTASOF>20260731</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>
OFX;
    }

    public function test_importa_ofx_e_deduplica(): void
    {
        $file = UploadedFile::fake()->createWithContent('extrato.ofx', $this->ofx());
        $r = $this->postJson('/api/v1/painel/financeiro/conciliacao', [
            'conta_bancaria_id' => $this->conta->id,
            'arquivo' => $file,
        ])->assertCreated();

        $this->assertSame(1, $r->json('data.importadas'));
        $this->assertDatabaseHas('extratos_bancarios_linhas', ['fitid' => 'FIT-1', 'conta_bancaria_id' => $this->conta->id]);

        // Reimportar ignora (dedupe por fitid)
        $file2 = UploadedFile::fake()->createWithContent('extrato.ofx', $this->ofx());
        $r2 = $this->postJson('/api/v1/painel/financeiro/conciliacao', [
            'conta_bancaria_id' => $this->conta->id,
            'arquivo' => $file2,
        ])->assertCreated();
        $this->assertSame(0, $r2->json('data.importadas'));
        $this->assertSame(1, $r2->json('data.ignoradas'));
    }

    public function test_sugere_e_aplica_match_com_conta_pagar(): void
    {
        $linha = ExtratoBancarioLinha::create([
            'conta_bancaria_id' => $this->conta->id,
            'data' => '2026-07-15',
            'valor' => -150.00,
            'memo' => 'Pagamento fornecedor ACME',
            'fitid' => 'FIT-1',
        ]);

        $ap = ContaPagar::create([
            'descricao' => 'Pagamento fornecedor ACME', 'id_pdv' => $this->pdv, 'user_id' => $this->admin->id,
            'valor_original' => 150.00, 'data_vencimento' => '2026-07-16', 'status' => 'pendente',
            'categoria' => 'fornecedor', 'tipo_documento' => 'boleto',
        ]);

        $sug = $this->getJson("/api/v1/painel/financeiro/conciliacao/{$linha->id}/sugestoes")->assertOk();
        $this->assertSame($ap->id_conta_pagar, $sug->json('data.0.id'));
        $this->assertSame('pagar', $sug->json('data.0.tipo'));

        $this->postJson("/api/v1/painel/financeiro/conciliacao/{$linha->id}/match", [
            'tipo' => 'pagar',
            'conta_id' => $ap->id_conta_pagar,
        ])->assertOk()->assertJsonPath('data.conciliada', true);

        $this->assertSame('pago', $ap->fresh()->status);
        $this->assertNotNull($linha->fresh()->reconciliada_em);
    }
}

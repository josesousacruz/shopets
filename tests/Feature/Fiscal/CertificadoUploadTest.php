<?php

namespace Tests\Feature\Fiscal;

use App\Models\ConfiguracaoEmpresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CertificadoUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
        Storage::fake('local');
    }

    /** Gera um .pfx autoassinado válido só pra teste. Pula o teste se o ambiente
     *  local não tiver um openssl.cnf localizável (peculiaridade de máquina, não
     *  do código). */
    private function gerarPfxDeTeste(string $senha): ?string
    {
        $candidatos = [null, 'C:\\tools\\php82\\extras\\ssl\\openssl.cnf', 'C:\\Program Files\\Git\\mingw64\\etc\\ssl\\openssl.cnf'];

        foreach ($candidatos as $cnf) {
            $opts = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];
            if ($cnf) {
                if (! is_file($cnf)) {
                    continue;
                }
                $opts['config'] = $cnf;
            }

            $pk = @openssl_pkey_new($opts);
            $csr = $pk ? @openssl_csr_new(['commonName' => 'Teste'], $pk, $opts) : false;
            $cert = $csr ? @openssl_csr_sign($csr, null, $pk, 365, $opts) : false;
            if ($cert && @openssl_pkcs12_export($cert, $out, $pk, $senha)) {
                return $out;
            }
        }

        return null;
    }

    public function test_upload_certificado_valido_salva_e_extrai_validade(): void
    {
        $pfx = $this->gerarPfxDeTeste('senha123');
        if ($pfx === null) {
            $this->markTestSkipped('Não foi possível gerar um .pfx de teste neste ambiente (openssl.cnf não localizado).');
        }

        $arquivo = UploadedFile::fake()->createWithContent('certificado.pfx', $pfx);

        $resp = $this->postJson('/api/v1/painel/configuracoes/certificado', [
            'certificado' => $arquivo,
            'senha' => 'senha123',
        ])->assertOk();

        $resp->assertJsonPath('data.certificado_definido', true);
        $this->assertNotNull($resp->json('data.certificado_validade'));

        $config = ConfiguracaoEmpresa::first();
        $this->assertNotNull($config->certificado_path);
        $this->assertSame('senha123', $config->certificado_senha);
        Storage::disk('local')->assertExists($config->certificado_path);
    }

    public function test_upload_certificado_com_senha_errada_retorna_422(): void
    {
        $pfx = $this->gerarPfxDeTeste('senha-certa');
        if ($pfx === null) {
            $this->markTestSkipped('Não foi possível gerar um .pfx de teste neste ambiente (openssl.cnf não localizado).');
        }

        $arquivo = UploadedFile::fake()->createWithContent('certificado.pfx', $pfx);

        $this->postJson('/api/v1/painel/configuracoes/certificado', [
            'certificado' => $arquivo,
            'senha' => 'senha-errada',
        ])->assertStatus(422)->assertJsonValidationErrors('certificado');

        $this->assertNull(ConfiguracaoEmpresa::first());
    }

    public function test_upload_arquivo_invalido_retorna_422(): void
    {
        $arquivo = UploadedFile::fake()->createWithContent('nao-e-certificado.pfx', 'conteudo qualquer');

        $this->postJson('/api/v1/painel/configuracoes/certificado', [
            'certificado' => $arquivo,
            'senha' => 'qualquer',
        ])->assertStatus(422)->assertJsonValidationErrors('certificado');
    }
}

import type { MetaFunction } from "@remix-run/node";
import { InstitucionalLayout } from "~/components/institucional/InstitucionalLayout";

export const meta: MetaFunction = () => [
  { title: "Política de Privacidade — Shopets" },
  {
    name: "description",
    content:
      "Política de Privacidade da Shopets em conformidade com a LGPD: quais dados coletamos, finalidade, cookies e seus direitos como titular.",
  },
];

export default function Privacidade() {
  return (
    <InstitucionalLayout
      eyebrow="LGPD"
      titulo="Política de Privacidade"
      subtitulo="Levamos a sua privacidade a sério. Esta política explica como coletamos, usamos e protegemos seus dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD)."
      rascunhoLegal
      atualizadoEm="Junho de 2026"
    >
      <h2>1. Quem somos</h2>
      <p>
        A Shopets é a controladora dos dados pessoais tratados nesta loja, responsável por decidir
        como e por que eles são utilizados, nos termos da{" "}
        <strong>Lei nº 13.709/2018 (LGPD)</strong>.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Dados de cadastro:</strong> nome, e-mail, telefone e CPF/CNPJ.
        </li>
        <li>
          <strong>Dados de entrega:</strong> endereço completo e CEP.
        </li>
        <li>
          <strong>Dados de pedido e pagamento:</strong> itens comprados, valores e status da
          transação. Não armazenamos os dados completos do seu cartão — eles são processados
          diretamente pelo gateway de pagamento.
        </li>
        <li>
          <strong>Dados de navegação:</strong> endereço IP, dispositivo, páginas visitadas e cookies
          (veja a seção 5).
        </li>
      </ul>

      <h2>3. Para que usamos seus dados (finalidade)</h2>
      <ul>
        <li>Processar e entregar seus pedidos;</li>
        <li>Emitir notas fiscais e cumprir obrigações legais e fiscais;</li>
        <li>Dar suporte, responder dúvidas e gerenciar trocas e devoluções;</li>
        <li>Prevenir fraudes e garantir a segurança das transações;</li>
        <li>
          Enviar comunicações sobre o seu pedido e, mediante seu consentimento, ofertas e novidades.
        </li>
      </ul>
      <p>
        Cada tratamento se baseia em uma hipótese legal da LGPD: execução do contrato de compra,
        cumprimento de obrigação legal, legítimo interesse ou consentimento.
      </p>

      <h2>4. Compartilhamento</h2>
      <p>
        Compartilhamos dados apenas com quem é necessário para concluir sua compra: transportadoras
        (Correios), gateways de pagamento, emissores de nota fiscal e prestadores de tecnologia.
        Nunca vendemos seus dados pessoais.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Utilizamos cookies para manter você logado, lembrar do seu carrinho, medir o desempenho do
        site e, com seu consentimento, exibir conteúdo e anúncios relevantes. Você pode gerenciar os
        cookies pelo banner de consentimento e nas configurações do seu navegador. A recusa de
        cookies não essenciais não impede a compra.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Mantemos seus dados pelo tempo necessário às finalidades descritas e ao cumprimento de
        obrigações legais (por exemplo, dados fiscais por até 5 anos). Depois disso, são eliminados ou
        anonimizados.
      </p>

      <h2>7. Seus direitos como titular</h2>
      <p>A LGPD garante a você o direito de:</p>
      <ul>
        <li>Confirmar a existência de tratamento e acessar seus dados;</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Solicitar a portabilidade dos dados;</li>
        <li>Revogar o consentimento e se opor a tratamentos baseados em legítimo interesse;</li>
        <li>Obter informações sobre com quem compartilhamos seus dados.</li>
      </ul>

      <h2>8. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger seus dados, como conexão
        criptografada (HTTPS), controle de acesso e armazenamento seguro de senhas. Ainda assim,
        nenhum sistema é 100% imune — recomendamos que você também proteja suas credenciais.
      </p>

      <h2>9. Encarregado (DPO) e contato</h2>
      <p>
        Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale com o nosso Encarregado
        pelo Tratamento de Dados Pessoais (DPO) pelo e-mail{" "}
        <strong>privacidade@shopets.com.br</strong>. Responderemos sua solicitação nos prazos
        previstos em lei.
      </p>
    </InstitucionalLayout>
  );
}

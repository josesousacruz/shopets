<!doctype html>
<html lang="pt-BR">
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fa;padding:32px;">
  <table cellpadding="0" cellspacing="0" border="0" align="center" width="560" style="background:#fff;border-radius:12px;padding:32px;">
    <tr><td>
      <h1 style="margin:0 0 16px;color:#0F766E;font-size:22px;">Bem-vindo(a) à Shopets</h1>
      <p>Olá <strong>{{ $cliente->nome }}</strong>,</p>
      <p>Sua conta foi criada pela nossa equipe. Use os dados abaixo para entrar na loja:</p>
      <table cellpadding="8" cellspacing="0" border="0" style="background:#f0fdfa;border-radius:8px;margin:18px 0;">
        <tr><td style="font-weight:600;padding-right:10px;">E-mail:</td><td>{{ $cliente->email }}</td></tr>
        <tr><td style="font-weight:600;padding-right:10px;">Senha provisória:</td><td><code style="background:#fff;padding:4px 8px;border-radius:6px;">{{ $senha }}</code></td></tr>
      </table>
      <p>Recomendamos alterar a senha no primeiro acesso.</p>
      <p style="margin-top:24px;font-size:13px;color:#6b7280;">— Equipe Shopets</p>
    </td></tr>
  </table>
</body>
</html>

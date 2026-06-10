export function Newsletter() {
  return (
    <div className="news">
      <h3>Receba ofertas e novidades</h3>
      <p>
        Cadastre seu e-mail e seja o primeiro a saber das promoções, lançamentos e cupons
        exclusivos da Shopets.
      </p>
      <form action="#" method="post">
        <input
          type="email"
          name="email"
          placeholder="seu-email@exemplo.com.br"
          aria-label="Seu e-mail"
          required
        />
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
}

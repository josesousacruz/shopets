import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { consultaCep, ApiValidationError } from "~/lib/auth.server";

/** Resource route: proxy server-side do endpoint de CEP da API. */
export async function loader({ params }: LoaderFunctionArgs) {
  const cep = (params.cep ?? "").replace(/\D/g, "");
  if (cep.length !== 8) {
    return json({ found: false as const }, { status: 400 });
  }
  try {
    const data = await consultaCep(cep);
    return json({ found: true as const, endereco: data });
  } catch (err) {
    if (err instanceof ApiValidationError) {
      return json({ found: false as const });
    }
    throw err;
  }
}

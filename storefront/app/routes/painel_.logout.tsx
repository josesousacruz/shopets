import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { adminLogout } from "~/lib/admin-session.server";

export async function action({ request }: ActionFunctionArgs) {
  return adminLogout(request);
}

export async function loader(_args: LoaderFunctionArgs) {
  return redirect("/painel");
}

import { TerminalKiosk } from "@/components/recepcion/TerminalKiosk";
import { requireRecepcion } from "@/lib/auth/recepcion";

export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  await requireRecepcion();
  return <TerminalKiosk />;
}

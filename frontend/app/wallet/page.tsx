import Wallet from "@/components/Wallet";
import { api, requireMe } from "@/lib/api";
import type { WalletData } from "@/lib/core";

export default async function WalletPage() {
  await requireMe("/wallet");
  return <Wallet initial={await api<WalletData>("/api/wallet")} />;
}

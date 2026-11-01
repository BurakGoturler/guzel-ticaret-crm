import { ComingSoon } from "@/components/ui/coming-soon";

export default function Page() {
  return <ComingSoon title="Sözleşmeler" excel="Satır 3 (bitiş tarihi), satır 5 (sözleşme kg), satır 6 (satış ₺/kg)" items={["Dönem bazında sözleşme kalemleri", "Kalan kg bir önceki aydan otomatik devreder", "Fiyat değişikliği geçmişi"]} />;
}

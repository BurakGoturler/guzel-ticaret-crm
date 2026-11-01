const tl0 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const tl2 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n0 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 1 });

export const fmtTL = (n: number) => tl0.format(n);
export const fmtTL2 = (n: number) => tl2.format(n);
export const fmtKg = (n: number) => `${n0.format(n)} kg`;
export const fmtNum = (n: number) => n0.format(n);
export const fmtCompact = (n: number) => compact.format(n);
export const fmtPct = (n: number) => pct.format(n);

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
export const monthShort = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1]!.slice(0, 3);
export const dayLabel = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

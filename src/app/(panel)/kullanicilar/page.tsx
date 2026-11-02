import { KeyRound, ShieldCheck } from "lucide-react";
import { EditDialog } from "@/components/forms/edit-dialog";
import { ActionForm, DeleteButton, Field, Input, PasswordInput, SubmitButton } from "@/components/forms/form";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createUser, deleteUser, setUserPassword, updateUser } from "@/lib/auth/actions";
import { listUsers, publicUser } from "@/lib/auth/core";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { dateLabel } from "@/lib/format";

// Kullanıcılar istek anında okunur (.data/auth.json).
export const instant = false;

export default async function UsersPage() {
  const me = await requireUser();
  const users = listUsers().map(publicUser).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const nameOf = (id: string | null) => users.find((u) => u.id === id)?.name ?? null;

  return (
    <>
      <PageHeader title="Kullanıcılar" subtitle="Her kullanıcı tam yetkili yöneticidir: tüm kayıtları görür, düzenler ve yeni kullanıcı ekleyebilir" />

      <Card className="mb-6 border-brand/25">
        <CardHeader title="Yeni kullanıcı" subtitle="Sizinle aynı yetkide bir hesap açılır; şifreyi kendisine iletin, girdikten sonra değiştirebilir" />
        <ActionForm action={createUser} className="grid items-end gap-3 px-5 pt-3 pb-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
          <Field label="Ad soyad"><Input name="name" required data-autofocus /></Field>
          <Field label="Kullanıcı adı"><Input name="username" autoCapitalize="none" autoComplete="off" required /></Field>
          <Field label="Şifre"><PasswordInput name="password" autoComplete="new-password" minLength={8} required /></Field>
          <Field label="Şifre (tekrar)"><PasswordInput name="confirm" autoComplete="new-password" minLength={8} required /></Field>
          <SubmitButton>Kullanıcı ekle</SubmitButton>
        </ActionForm>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-hairline bg-surface-alt text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Kullanıcı</th>
                <th className="px-3 py-2.5 font-medium">Kullanıcı adı</th>
                <th className="px-3 py-2.5 font-medium">Yetki</th>
                <th className="px-3 py-2.5 font-medium">Eklenme</th>
                <th className="px-5 py-2.5 text-right font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const self = u.id === me.id;
                const by = nameOf(u.createdBy);
                return (
                  <tr key={u.id} className={cn("border-b border-hairline/70", i % 2 === 1 && "bg-zebra/60")}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{initials(u.name)}</span>
                        <span className="font-medium text-ink">{u.name}</span>
                        {self && <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] text-muted">siz</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-body">{u.username}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                        <ShieldCheck className="size-3" aria-hidden /> Süper yönetici
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{dateLabel(u.createdAt.slice(0, 10))}{by ? ` · ${by}` : " · ilk hesap"}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <EditDialog title="Kullanıcıyı düzenle" subtitle={u.name} label="Kullanıcıyı düzenle">
                          <ActionForm action={updateUser} resetOnSuccess={false} className="grid gap-3">
                            <input type="hidden" name="id" value={u.id} />
                            <Field label="Ad soyad"><Input name="name" defaultValue={u.name} required /></Field>
                            <Field label="Kullanıcı adı"><Input name="username" defaultValue={u.username} autoCapitalize="none" required /></Field>
                            <div className="flex justify-end"><SubmitButton>Değişiklikleri kaydet</SubmitButton></div>
                          </ActionForm>
                        </EditDialog>
                        <EditDialog title={self ? "Şifremi değiştir" : "Şifre belirle"} subtitle={self ? undefined : `${u.name} · açık oturumları kapanır`} label="Şifre değiştir" icon={<KeyRound className="size-3.5" aria-hidden />}>
                          <ActionForm action={setUserPassword} resetOnSuccess={false} className="grid gap-3">
                            <input type="hidden" name="id" value={u.id} />
                            <Field label="Yeni şifre" hint="En az 8 karakter"><PasswordInput name="password" autoComplete="new-password" minLength={8} required /></Field>
                            <Field label="Yeni şifre (tekrar)"><PasswordInput name="confirm" autoComplete="new-password" minLength={8} required /></Field>
                            <div className="flex justify-end"><SubmitButton>Şifreyi kaydet</SubmitButton></div>
                          </ActionForm>
                        </EditDialog>
                        {!self && users.length > 1 && <DeleteButton action={deleteUser.bind(null, u.id)} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toLocaleUpperCase("tr-TR")).join("");

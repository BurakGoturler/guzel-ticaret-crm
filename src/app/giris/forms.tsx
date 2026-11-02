"use client";

import { useActionState, useState } from "react";
import { ActionForm, Field, FormMessage, Input, PasswordInput, SubmitButton } from "@/components/forms/form";
import { login, setupFirstAdmin } from "@/lib/auth/actions";

/** Hatalı denemede kullanıcı adı silinmesin diye alan kontrollü (form eylemi alanları sıfırlar). */
export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, { ok: true, message: "" });
  const [username, setUsername] = useState("");
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="next" value={next} />
      <Field label="Kullanıcı adı">
        <Input name="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required autoFocus={!username} />
      </Field>
      <Field label="Şifre"><PasswordInput name="password" autoComplete="current-password" required autoFocus={!!username} /></Field>
      <SubmitButton className="mt-1 w-full justify-center">Giriş yap</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function SetupForm() {
  return (
    <ActionForm action={setupFirstAdmin} resetOnSuccess={false} className="grid gap-3">
      <Field label="Ad soyad"><Input name="name" autoComplete="name" required autoFocus /></Field>
      <Field label="Kullanıcı adı" hint="Küçük harf, rakam, nokta veya tire"><Input name="username" defaultValue="admin" autoComplete="username" autoCapitalize="none" required /></Field>
      <Field label="Şifre" hint="En az 8 karakter"><PasswordInput name="password" autoComplete="new-password" required minLength={8} /></Field>
      <Field label="Şifre (tekrar)"><PasswordInput name="confirm" autoComplete="new-password" required minLength={8} /></Field>
      <SubmitButton className="mt-1 w-full justify-center">Hesabı oluştur ve gir</SubmitButton>
    </ActionForm>
  );
}

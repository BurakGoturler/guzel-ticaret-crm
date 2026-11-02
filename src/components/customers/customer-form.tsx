"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms/form";
import iller from "@/data/iller-ilceler.json";
import { saveCustomer } from "@/lib/actions";
import type { Customer } from "@/lib/domain/types";
import { CUSTOMER_KIND } from "./kinds";

const IL = iller as { il: string; kod: string; ilceler: string[] }[];

/** Müşteri ekleme / düzenleme. İl seçilince ilçe listesi o ile göre dolar. */
export function CustomerForm({ customer }: { customer?: Customer }) {
  const [il, setIl] = useState(customer?.il ?? "");
  const ilceler = IL.find((x) => x.il === il)?.ilceler ?? [];
  return (
    <ActionForm action={saveCustomer} resetOnSuccess={!customer} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <Field label="Ad / unvan" className="sm:col-span-2 xl:col-span-1">
        <Input name="name" defaultValue={customer?.name} placeholder="ör. Yılmaz Manav" required data-autofocus />
      </Field>
      <Field label="Tür">
        {customer?.kind === "kurum" ? (
          <>
            <input type="hidden" name="kind" value="kurum" />
            <Input value={CUSTOMER_KIND.kurum} disabled readOnly />
          </>
        ) : (
          <Select name="kind" defaultValue={customer?.kind ?? "esnaf"}>
            <option value="esnaf">{CUSTOMER_KIND.esnaf}</option>
            <option value="bireysel">{CUSTOMER_KIND.bireysel}</option>
            <option value="kurum">{CUSTOMER_KIND.kurum}</option>
          </Select>
        )}
      </Field>
      <Field label="İl" hint="Haritada bu ile göre görünür">
        <Select name="il" value={il} onChange={(e) => setIl(e.target.value)}>
          <option value="">Seçin…</option>
          {IL.map((x) => <option key={x.kod} value={x.il}>{x.il}</option>)}
        </Select>
      </Field>
      <Field label="İlçe">
        <Select name="ilce" key={il} defaultValue={customer?.il === il ? (customer?.ilce ?? "") : ""} disabled={!il}>
          <option value="">{il ? "Seçin…" : "Önce il seçin"}</option>
          {ilceler.map((x) => <option key={x} value={x}>{x}</option>)}
        </Select>
      </Field>
      <Field label="Telefon">
        <Input name="phone" type="tel" defaultValue={customer?.phone ?? ""} placeholder="05xx xxx xx xx" />
      </Field>
      <Field label="Not" className="sm:col-span-2">
        <Textarea name="note" defaultValue={customer?.note ?? ""} rows={1} />
      </Field>
      <div>
        <SubmitButton>{customer ? "Kaydet" : "Müşteri ekle"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

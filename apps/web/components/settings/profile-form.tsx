"use client";

import { type Plan, PLAN_LABELS } from "@lifeos/contracts";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/server/profile-actions";

export interface ProfileFormProps {
  email: string;
  fullName: string;
  phone: string;
  plan: Plan;
}

type FormState = { ok: boolean; error?: string };
const initialState: FormState = { ok: false };

/** Editable profile form (name + mobile). Email and plan are read-only. */
export function ProfileForm({ email, fullName, phone, plan }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );

  const isPaid = plan !== "free";

  return (
    <div className="rounded-2xl border border-[#eadfca] bg-[#fbf8f1] p-7 shadow-[0_1px_2px_rgba(74,64,54,0.04)]">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-[#6f6152]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            readOnly
            disabled
            className="opacity-70"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName" className="text-[#6f6152]">
            Name
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            defaultValue={fullName}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone" className="text-[#6f6152]">
            Mobile number
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={phone}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6f6152]">Plan</span>
          <span
            className={
              isPaid
                ? "rounded-full bg-[#c1623a] px-2.5 py-0.5 text-xs font-medium text-[#fbf8f1]"
                : "rounded-full bg-[#e7dcc6] px-2.5 py-0.5 text-xs font-medium text-[#6f6152]"
            }
          >
            {PLAN_LABELS[plan]}
          </span>
        </div>

        {state.error ? (
          <p className="text-sm text-[#b0472b]" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-[#5f7a4a]" role="status">
            Saved.
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="w-full bg-[#c1623a] text-[#fbf8f1] hover:bg-[#a9412a]"
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

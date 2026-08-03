"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signIn" | "signUp";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signIn");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    setNotice(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName.trim(), phone: phone.trim() },
            },
          });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    // With email confirmations disabled the session is ready immediately; if a
    // project requires confirmation there is no session yet.
    if (mode === "signUp" && !data.session) {
      setNotice("Check your inbox to confirm your email, then sign in.");
      setMode("signIn");
      return;
    }
    // Let middleware pick up the fresh session cookie, then go home.
    router.refresh();
    router.push("/");
  }

  const isSignUp = mode === "signUp";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5efe3] px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#c1623a]">
            <span className="h-3.5 w-3.5 rounded-full bg-[#fbf8f1]" />
          </span>
          <h1 className="mt-4 font-serif text-3xl text-[#4a4036]">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-[15px] text-[#8a7d6c]">
            {isSignUp
              ? "Start your free 3-month trial of LifeOS."
              : "Sign in to continue to LifeOS."}
          </p>
        </div>

        <div className="rounded-2xl border border-[#eadfca] bg-[#fbf8f1] p-7 shadow-[0_1px_2px_rgba(74,64,54,0.04)]">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {isSignUp ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fullName" className="text-[#6f6152]">
                    Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone" className="text-[#6f6152]">
                    Mobile number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-[#6f6152]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-[#6f6152]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            {error ? (
              <p className="text-sm text-[#b0472b]" role="alert">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="text-sm text-[#6f6152]" role="status">
                {notice}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-[#c1623a] text-[#fbf8f1] hover:bg-[#a9412a]"
            >
              {pending
                ? "Please wait…"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#8a7d6c]">
          {isSignUp ? "Already have an account?" : "New to LifeOS?"}{" "}
          <button
            type="button"
            className="font-medium text-[#c1623a] hover:text-[#a9412a]"
            onClick={() => {
              setMode(isSignUp ? "signIn" : "signUp");
              setError(null);
              setNotice(null);
            }}
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </main>
  );
}

"use client";

import { useState, ReactNode, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function AuthCard({ sub, children }: { sub: string; children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 8L7 11L12 5L17 11L21 8L19 17H5L3 8Z" fill="#c9a13b" stroke="#c9a13b" strokeWidth="0.5" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="auth-title">رويال للتوريدات العمومية</div>
        <div className="auth-sub">{sub}</div>
        {children}
      </div>
    </div>
  );
}

function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const run = async (fn: () => Promise<{ error?: string; message?: string }>) => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const r = await fn();
      if (r.error) setError(r.error);
      else if (r.message) setInfo(r.message);
      return !r.error;
    } catch (e: any) {
      console.error("auth error", e);
      setError(e?.message || e?.toString() || "حدث خطأ");
      return false;
    } finally {
      setLoading(false);
    }
  };
  return { loading, error, info, run };
}

function post(url: string, body: any) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  });
}

export function LoginScreen() {
  const router = useRouter();
  const { loading, error, run } = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    (async () => {
      const ok = await run(async () => {
        await post("/api/auth/login", { email, password });
        return {};
      });
      if (ok) router.push("/erp");
    })();
  };

  return (
    <AuthCard sub="تسجيل الدخول لإدارة عروض الأسعار">
      <form onSubmit={submit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-field">
          <label>البريد الإلكتروني</label>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" />
        </div>
        <div className="auth-field">
          <label>كلمة المرور</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="auth-btn" disabled={loading}>{loading ? "جاري الدخول..." : "تسجيل الدخول"}</button>
        <div className="auth-links">
          <Link href="/forgot">نسيت كلمة المرور؟</Link><span></span>
        </div>
      </form>
    </AuthCard>
  );
}

export function RegisterScreen() {
  const router = useRouter();
  const { loading, error, run } = useSubmit();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { run(async () => ({ error: "كلمة المرور وتأكيدها غير متطابقين" })); return; }
    (async () => {
      const ok = await run(async () => {
        await post("/api/auth/register", { name, email, password });
        return {};
      });
      if (ok) router.push("/erp");
    })();
  };

  return (
    <AuthCard sub="إنشاء حساب جديد">
      <form onSubmit={submit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-field"><label>الاسم</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="auth-field"><label>البريد الإلكتروني</label><input type="text" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="auth-field"><label>كلمة المرور</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="auth-field"><label>تأكيد كلمة المرور</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <button className="auth-btn" disabled={loading}>{loading ? "جاري الإنشاء..." : "إنشاء الحساب"}</button>
        <div className="auth-links">
          <Link href="/login">عندي حساب بالفعل</Link><span></span>
        </div>
      </form>
    </AuthCard>
  );
}

export function ForgotScreen() {
  const { loading, error, info, run } = useSubmit();
  const [email, setEmail] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const d = await post("/api/auth/forgot", { email });
      return d.message ? { message: d.message } : {};
    });
  };

  return (
    <AuthCard sub="استعادة كلمة المرور">
      <form onSubmit={submit}>
        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-success">{info}</div>}
        <div className="auth-field"><label>البريد الإلكتروني</label><input type="text" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <button className="auth-btn" disabled={loading}>{loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}</button>
        <div className="auth-links">
          <Link href="/login">الرجوع لتسجيل الدخول</Link><span></span>
        </div>
      </form>
    </AuthCard>
  );
}

export function ResetScreen({ token }: { token: string }) {
  const router = useRouter();
  const { loading, error, info, run } = useSubmit();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { run(async () => ({ error: "كلمة المرور وتأكيدها غير متطابقين" })); return; }
    (async () => {
      const ok = await run(async () => {
        await post("/api/auth/reset", { token, password });
        return { message: "تم تغيير كلمة المرور. سيتم تحويلك لتسجيل الدخول..." };
      });
      if (ok) setTimeout(() => router.push("/login"), 1500);
    })();
  };

  return (
    <AuthCard sub="تعيين كلمة مرور جديدة">
      <form onSubmit={submit}>
        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-success">{info}</div>}
        <div className="auth-field"><label>كلمة المرور الجديدة</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="auth-field"><label>تأكيد كلمة المرور</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <button className="auth-btn" disabled={loading}>{loading ? "جاري الحفظ..." : "تعيين كلمة المرور"}</button>
      </form>
    </AuthCard>
  );
}

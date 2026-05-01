import React, { useState, useEffect, useRef } from 'react';
import { authAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Loader2, ShieldCheck, Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * SecurePasswordInit
 * ───────────────────
 * Full-screen modal shown to OAuth users (e.g. Google sign-in) who don't yet
 * have a local password. Designed in the project's terminal aesthetic with
 * an animated boot-sequence + live password strength meter.
 *
 * • Cannot be dismissed (mandatory after first OAuth login)
 * • Allows "DEFER" (skip for this session) — backend flag will re-prompt next login
 */
export default function SecurePasswordInit() {
  const { user, refreshUser, logout } = useAuth();
  const { lang } = useLanguage();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState(false);
  const [bootLines, setBootLines] = useState([]);
  const inputRef = useRef(null);

  const isFa = lang === 'fa';
  const visible = !!user && user.requires_password_setup && !skipped;

  // Boot sequence animation
  useEffect(() => {
    if (!visible) return;
    const lines = isFa ? [
      '[ok] احراز هویت گوگل تأیید شد',
      '[ok] حساب کاربری امن شد',
      '[req] پسورد محلی :: لازم است',
    ] : [
      '[ok] google_auth :: verified',
      '[ok] account :: secured',
      '[req] local_password :: required',
    ];
    setBootLines([]);
    let i = 0;
    const tick = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(tick);
        setTimeout(() => inputRef.current?.focus(), 200);
        return;
      }
      const line = lines[i];
      i += 1;
      setBootLines((prev) => [...prev, line]);
    }, 320);
    return () => clearInterval(tick);
  }, [visible, isFa]);

  if (!visible) return null;

  // ── Strength scoring ──────────────────────────
  const score = (() => {
    let s = 0;
    if (pw.length >= 6) s += 1;
    if (pw.length >= 10) s += 1;
    if (/[A-Z]/.test(pw)) s += 1;
    if (/[0-9]/.test(pw)) s += 1;
    if (/[^A-Za-z0-9]/.test(pw)) s += 1;
    return s; // 0..5
  })();

  const checks = [
    { ok: pw.length >= 6, label: isFa ? 'حداقل ۶ کاراکتر' : 'min. 6 chars' },
    { ok: /[A-Z]/.test(pw), label: isFa ? 'حرف بزرگ' : 'uppercase' },
    { ok: /[0-9]/.test(pw), label: isFa ? 'عدد' : 'digit' },
    { ok: /[^A-Za-z0-9]/.test(pw), label: isFa ? 'کاراکتر خاص' : 'symbol' },
    { ok: pw.length > 0 && pw === confirm, label: isFa ? 'تطابق' : 'match' },
  ];

  const strengthLabel = ['', isFa ? 'ضعیف' : 'WEAK', isFa ? 'قابل قبول' : 'FAIR', isFa ? 'متوسط' : 'OK', isFa ? 'قوی' : 'STRONG', isFa ? 'بسیار قوی' : 'EXCELLENT'][score];

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (pw.length < 6) { setError(isFa ? 'پسورد باید حداقل ۶ کاراکتر باشد' : 'Password must be at least 6 characters'); return; }
    if (pw !== confirm) { setError(isFa ? 'پسوردها مطابقت ندارند' : 'Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.setInitialPassword(pw);
      await refreshUser();
      toast.success(isFa ? 'پسورد با موفقیت ثبت شد' : 'Password set successfully');
    } catch (err) {
      setError(err.response?.data?.detail || (isFa ? 'خطا در ثبت پسورد' : 'Failed to set password'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    toast(isFa ? 'بعداً درخواست می‌شود.' : 'You will be prompted next session.', { icon: '⏭' });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/95 backdrop-blur-sm" data-testid="secure-password-init-modal">
      {/* Background scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,#fff,#fff 1px,transparent 1px,transparent 3px)',
      }} />

      <div className="relative w-full max-w-md mx-4">
        {/* Terminal window frame */}
        <div className="border border-border bg-card shadow-2xl">
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/40">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/70"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70"></div>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground tracking-widest" dir="ltr">
              SECURE_INIT.SH — {user?.email}
            </div>
            <div className="w-6"></div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 flex items-center justify-center border border-primary/30 bg-primary/5">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-mono text-[10px] text-primary tracking-widest mb-1">
                  // SECURE_PROTOCOL · INIT_PASSWORD
                </div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {isFa ? 'پسورد اکانت رو تنظیم کن' : 'Set your account password'}
                </h2>
              </div>
            </div>

            {/* Boot sequence */}
            <div className="font-mono text-[11px] space-y-1 bg-background/40 border border-dashed border-border px-3 py-2.5" dir="ltr">
              {bootLines.filter(Boolean).map((line, i, arr) => (
                <div key={i} className={`flex items-center gap-1 ${line.startsWith('[req]') ? 'text-primary' : 'text-green-500/90'}`}>
                  <span>{line}</span>
                  {i === arr.length - 1 && (
                    <span className="ms-1 inline-block w-2 h-3 bg-current animate-pulse" />
                  )}
                </div>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  {isFa ? 'پسورد جدید' : 'New password'}
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={showPw ? 'text' : 'password'}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder={isFa ? 'ترکیب حروف، عدد و علامت' : 'mix of letters, digits & symbols'}
                    className="w-full h-11 px-3 pe-10 bg-background border border-border focus:border-primary focus:outline-none font-mono text-sm tracking-wide transition-colors"
                    dir="ltr"
                    autoComplete="new-password"
                    data-testid="initpw-new-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors"
                    data-testid="initpw-toggle-visibility"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength meter */}
                {pw.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1" data-testid="initpw-strength-bar">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 transition-all duration-200 ${
                            i < score
                              ? score <= 2 ? 'bg-destructive' : score === 3 ? 'bg-yellow-500' : 'bg-green-500'
                              : 'bg-border'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between font-mono text-[10px] tracking-widest" dir="ltr">
                      <span className="text-muted-foreground">ENTROPY</span>
                      <span className={score <= 2 ? 'text-destructive' : score === 3 ? 'text-yellow-500' : 'text-green-500'}>
                        {strengthLabel}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                  {isFa ? 'تکرار پسورد' : 'Confirm password'}
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={isFa ? 'دقیقاً همان پسورد بالا' : 'same as above'}
                  className="w-full h-11 px-3 bg-background border border-border focus:border-primary focus:outline-none font-mono text-sm tracking-wide transition-colors"
                  dir="ltr"
                  autoComplete="new-password"
                  data-testid="initpw-confirm-input"
                />
              </div>

              {/* Live checks grid */}
              {pw.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {checks.map((c, i) => (
                    <div key={i} className={`flex items-center gap-1.5 font-mono text-[10px] tracking-wide ${c.ok ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-50" />}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="border border-destructive/40 bg-destructive/10 text-destructive font-mono text-[11px] p-2.5" data-testid="initpw-error">
                  ! {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || pw.length < 6 || pw !== confirm}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-widest text-[11px] font-semibold flex items-center justify-center gap-2 transition-all amber-glow disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="initpw-submit-btn"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {isFa ? 'اجرای مرحله امنیتی' : 'EXECUTE_SECURE_INIT'}
              </button>
            </form>

            {/* Footer / actions */}
            <div className="flex items-center justify-between pt-3 border-t border-dashed border-border">
              <button
                type="button"
                onClick={handleSkip}
                className="font-mono text-[10px] tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                data-testid="initpw-defer-btn"
              >
                {isFa ? '⏭ بعداً' : '⏭ DEFER (login_only)'}
              </button>
              <button
                type="button"
                onClick={() => { logout(); }}
                className="font-mono text-[10px] tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                data-testid="initpw-logout-btn"
              >
                {isFa ? 'خروج' : 'LOGOUT'}
              </button>
            </div>
          </div>
        </div>

        {/* Status footer below frame */}
        <div className="mt-3 text-center font-mono text-[9px] text-muted-foreground tracking-widest" dir="ltr">
          ▌ ENCRYPTION: bcrypt · TRANSPORT: TLS · SESSION: jwt
        </div>
      </div>
    </div>
  );
}

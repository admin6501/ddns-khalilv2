import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowRight, ArrowLeft, CircleNotch as Loader2, Eye, EyeSlash as EyeOff, EnvelopeSimple, KeyReturn, Lock } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ForgotPassword() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const isFa = lang === 'fa';

  const [resetEnabled, setResetEnabled] = useState(null); // null = loading
  const [step, setStep] = useState(1); // 1: email, 2: code+new password, 3: done
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/password-reset-status`)
      .then((r) => r.json())
      .then((d) => setResetEnabled(!!d.enabled))
      .catch(() => setResetEnabled(false));
  }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Request failed');
      }
      toast.success(isFa ? 'اگر این ایمیل ثبت شده باشد، کد بازنشانی برایش ارسال شد.' : 'If that email exists, a reset code has been sent.');
      setStep(2);
    } catch (err) {
      toast.error(err.message || (isFa ? 'خطا در ارسال درخواست' : 'Failed to send request'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!code || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error(isFa ? 'رمز عبور باید حداقل ۶ کاراکتر باشد' : 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Reset failed');
      }
      toast.success(isFa ? 'رمز عبور با موفقیت تغییر کرد.' : 'Password updated. Please sign in.');
      setStep(3);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      toast.error(err.message || (isFa ? 'خطا در بازنشانی رمز' : 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────
  if (resetEnabled === null) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── SMTP disabled ────────────────────────────────────────
  if (!resetEnabled) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-background page-mount px-6">
        <div className="w-full max-w-md border border-border bg-card p-8" data-testid="forgot-disabled">
          <div className="font-mono text-xs lowercase text-primary tracking-wider mb-2">// {isFa ? 'پیام سیستم' : 'system'}</div>
          <h1 className="font-display text-3xl font-black tracking-tighter mb-3">
            {isFa ? 'بازیابی غیرفعال است' : 'Reset unavailable'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {isFa
              ? 'قابلیت بازیابی رمز عبور توسط مدیر فعال نشده است. لطفاً برای دسترسی مجدد به حساب با پشتیبانی تماس بگیرید یا از ورود با گوگل استفاده کنید.'
              : 'Password recovery has not been enabled by the administrator. Please contact support or use Google sign-in to access your account.'}
          </p>
          <div className="border-t border-border pt-5 space-y-2">
            <Link
              to="/login"
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-foreground text-background hover:opacity-90 font-mono text-sm lowercase transition-colors"
              data-testid="forgot-back-login"
            >
              <ArrowLeft weight="bold" className="w-4 h-4 rtl-flip" />
              {isFa ? 'بازگشت به ورود' : 'back to login'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: success ──────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-background page-mount px-6">
        <div className="w-full max-w-md border border-border bg-card p-8 text-center" data-testid="forgot-success">
          <div className="w-12 h-12 mx-auto mb-4 border border-primary/40 bg-primary/10 flex items-center justify-center">
            <KeyReturn weight="bold" className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-black tracking-tighter mb-2">
            {isFa ? 'انجام شد' : 'All set'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFa ? 'در حال انتقال به صفحه‌ی ورود...' : 'Redirecting to sign in...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Steps 1 & 2 ───────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-background page-mount px-6 py-12">
      <div className="w-full max-w-md border border-border bg-card p-8">
        <div className="font-mono text-xs lowercase text-primary tracking-wider mb-2">
          // {isFa ? 'بازیابی' : 'recover'}
        </div>
        <h1 className="font-display text-3xl font-black tracking-tighter mb-2" data-testid="forgot-title">
          {step === 1
            ? (isFa ? 'فراموش کردی؟' : 'Forgot it?')
            : (isFa ? 'کد را وارد کن' : 'Enter your code')}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {step === 1
            ? (isFa ? 'ایمیلت رو وارد کن، کد بازنشانی برات ارسال می‌شه.' : "Enter your email and we'll send you a reset code.")
            : (isFa ? 'کد ۶ رقمی ارسال شده به ایمیلت رو همراه با رمز جدید وارد کن.' : 'Enter the 6-digit code we emailed you, plus your new password.')}
        </p>

        {step === 1 ? (
          <form onSubmit={handleRequest} className="space-y-4" data-testid="forgot-step1-form">
            <div>
              <Label className="mono-label">{isFa ? 'ایمیل' : 'email'}</Label>
              <div className="relative mt-2">
                <EnvelopeSimple className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  required
                  className="h-12 ps-10 rounded-sm font-mono text-sm"
                  data-testid="forgot-email-input"
                  dir="ltr"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-mono lowercase text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="forgot-submit-step1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight weight="bold" className="w-4 h-4 rtl-flip" />}
              {isFa ? 'ارسال کد' : 'send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4" data-testid="forgot-step2-form">
            <div>
              <Label className="mono-label">{isFa ? 'کد ۶ رقمی' : 'verification code'}</Label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                className="h-12 mt-2 rounded-sm font-mono text-2xl tracking-[0.5em] text-center"
                data-testid="forgot-code-input"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="mono-label">{isFa ? 'رمز جدید' : 'new password'}</Label>
              <div className="relative mt-2">
                <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-12 ps-10 pe-12 rounded-sm font-mono"
                  data-testid="forgot-newpassword-input"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-mono lowercase text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="forgot-submit-step2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyReturn weight="bold" className="w-4 h-4" />}
              {isFa ? 'تنظیم رمز جدید' : 'set new password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setCode(''); setNewPassword(''); }}
              className="w-full h-10 border border-border hover:border-primary font-mono lowercase text-xs transition-colors"
              data-testid="forgot-resend"
            >
              {isFa ? '← ارسال مجدد ایمیل' : '← resend email'}
            </button>
          </form>
        )}

        <div className="border-t border-border pt-5 mt-6 text-center">
          <Link
            to="/login"
            className="font-mono text-xs lowercase text-muted-foreground hover:text-primary transition-colors"
          >
            {isFa ? '← بازگشت به ورود' : '← back to sign in'}
          </Link>
        </div>
      </div>
    </div>
  );
}

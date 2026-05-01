import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Terminal, ArrowRight, Loader2, Eye, EyeOff, Mail, CheckCircle, Zap, Shield, Globe, Lock } from 'lucide-react';
import { DOMAIN } from '../config/site';
import { useConfig } from '../contexts/ConfigContext';
import toast from 'react-hot-toast';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function Login() {
  const { login, completeVerification, pendingVerification } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const config = useConfig();
  const DNS_DOMAIN = config.install_domain || config.dns_domain || DOMAIN;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const showVerify = verificationRequired || (pendingVerification && !verified);
  const verifyEmail = email || (pendingVerification && pendingVerification.email) || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      if (userData && userData.email_verification_required) {
        setVerificationRequired(true);
        try { await authAPI.resendCode(email.toLowerCase()); toast.success(t('verify_sent')); } catch {}
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || (lang === 'fa' ? 'خطا در ورود. لطفاً دوباره تلاش کنید.' : 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setVerifyLoading(true);
    try {
      await authAPI.verifyEmail(verifyEmail.toLowerCase(), verifyCode);
      setVerified(true);
      toast.success(t('verify_success'));
      await completeVerification();
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || t('verify_invalid'));
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    try {
      await authAPI.resendCode(verifyEmail.toLowerCase());
      toast.success(t('verify_resend'));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] grid lg:grid-cols-12 bg-background page-mount">
      {/* LEFT — branded terminal panel (hidden on mobile) */}
      <aside className="hidden lg:flex lg:col-span-5 relative overflow-hidden border-e border-border bg-card/40">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-20 end-10 w-72 h-72 bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 start-0 w-96 h-96 bg-primary/5 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-14">
          {/* header */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 border border-border bg-card flex items-center justify-center">
                <Terminal className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="font-mono text-sm font-semibold">{DNS_DOMAIN}</span>
            </div>
            <div className="editorial-mark text-primary mt-6">{lang === 'fa' ? 'خوش برگشتی' : 'WELCOME BACK'}</div>
            <h2 className="text-3xl xl:text-4xl font-display font-semibold tracking-tighter mt-3 leading-tight max-w-sm">
              {lang === 'fa' ? 'به حساب خودت وارد شو.' : 'Sign in to your account.'}
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed max-w-sm">
              {lang === 'fa'
                ? 'مدیریت دامنه‌ها، دیدن گزارش‌های زنده و دسترسی به تمام قابلیت‌های پنل از همین لحظه.'
                : 'Manage your domains, see live activity, and pick up exactly where you left off.'}
            </p>
          </div>

          {/* welcome card replaces terminal mock */}
          <div className="my-10 border border-border bg-card p-6 corner-marks">
            <div className="flex items-center gap-2 text-xs text-success mb-4">
              <span className="status-dot" />
              <span className="font-mono uppercase tracking-widest">{lang === 'fa' ? 'پنل آماده‌ی تو' : 'YOUR PANEL IS READY'}</span>
            </div>
            <p className="text-sm leading-relaxed">
              {lang === 'fa'
                ? 'بیش از ۲۴۰۰ کاربر هر روز از این پنل استفاده می‌کنن. تو هم به جمع ما خوش اومدی.'
                : 'Over 2,400 customers use this panel every day. Glad to have you back.'}
            </p>
          </div>

          {/* bottom feature list */}
          <div className="space-y-2.5">
            {[
              { icon: Zap, text: lang === 'fa' ? 'تغییرات لحظه‌ای روی دامنه' : 'Instant DNS updates' },
              { icon: Shield, text: lang === 'fa' ? 'امنیت سطح بانکی' : 'Bank-grade security' },
              { icon: Globe, text: lang === 'fa' ? 'پشتیبانی فارسی، همیشه' : 'Persian support, always' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 font-mono text-xs">
                <span className="mono-label text-primary w-8">{String(i + 1).padStart(2, '0')}</span>
                <item.icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* RIGHT — form */}
      <main className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* mobile brand */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 border border-border bg-card flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" strokeWidth={2.5} />
            </div>
            <span className="font-mono text-sm font-semibold">{DNS_DOMAIN}</span>
          </div>

          {showVerify && !verified ? (
            /* ─── Verify form ─── */
            <div className="animate-fade-in-up">
              <div className="mono-label text-primary mb-3">// VERIFY · EMAIL</div>
              <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('verify_title')}</h1>
              <p className="text-sm text-muted-foreground mb-2">{t('verify_sent')}</p>
              <p className="font-mono text-sm text-primary mb-8 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />{verifyEmail}
              </p>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-xs border border-destructive/20 mb-4 font-mono">
                  ! {error}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <Label className="mono-label mb-2 block">{t('verify_code_placeholder')}</Label>
                  <Input
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.6em] font-mono h-14 rounded-sm"
                    dir="ltr"
                    required
                  />
                </div>
                <button type="submit" disabled={verifyLoading || verifyCode.length !== 6}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-widest text-xs font-semibold transition-all amber-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {t('verify_submit')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button onClick={handleResend} disabled={resendLoading}
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                  {resendLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                  {t('verify_resend')}
                </button>
              </div>
            </div>
          ) : verified ? (
            <div className="animate-scale-in text-center py-8">
              <div className="w-16 h-16 border border-emerald-500/50 bg-emerald-500/10 mx-auto mb-5 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="mono-label text-emerald-500 mb-2">// SESSION · GRANTED</div>
              <h2 className="text-2xl font-semibold">{t('verify_success')}</h2>
              <p className="text-sm text-muted-foreground mt-2 font-mono">
                ⇢ {lang === 'fa' ? 'در حال انتقال…' : 'redirecting…'}
              </p>
            </div>
          ) : (
            /* ─── Login form ─── */
            <div className="animate-fade-in-up">
              <div className="editorial-mark text-primary mb-3">{lang === 'fa' ? 'ورود به حساب' : 'SIGN IN'}</div>
              <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tighter mb-2">
                {lang === 'fa' ? 'سلام، خوش برگشتی!' : 'Welcome back.'}
              </h1>
              <p className="text-muted-foreground text-sm mb-8">
                {lang === 'fa' ? 'با ایمیلت وارد شو، یا از گوگل استفاده کن.' : 'Sign in with your email — or continue with Google.'}
              </p>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-xs border border-destructive/20 mb-5 font-mono animate-scale-in">
                  ! {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label className="mono-label mb-2 block">{t('auth_email')}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-12 rounded-sm font-mono text-sm"
                    data-testid="login-email-input"
                    dir="ltr"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="mono-label">{t('auth_password')}</Label>
                    <Link
                      to="/forgot-password"
                      className="text-[11px] font-mono lowercase text-muted-foreground hover:text-primary transition-colors"
                      data-testid="login-forgot-password-link"
                    >
                      {lang === 'fa' ? 'فراموشی رمز؟' : 'forgot password?'}
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-12 pe-12 rounded-sm font-mono"
                      data-testid="login-password-input"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Toggle visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 mt-2 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-widest text-xs font-semibold transition-all amber-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                  data-testid="login-submit-button"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 rtl-flip" />}
                  {t('auth_login')}
                </button>
              </form>

              <div className="mt-6">
                <GoogleLoginButton onError={(msg) => setError(msg)} />
              </div>

              <div className="mt-10 pt-6 border-t border-dashed border-border text-center">
                <p className="font-mono text-xs text-muted-foreground">
                  {t('auth_no_account')}{' '}
                  <Link to="/register" className="text-primary hover:underline font-semibold" data-testid="login-signup-link">
                    {t('auth_signup')} →
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

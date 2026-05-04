import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Terminal, Loader2, Gift, ArrowRight, Users, Activity, Zap } from 'lucide-react';
import { DOMAIN } from '../config/site';
import { useConfig } from '../contexts/ConfigContext';
import toast from 'react-hot-toast';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { EmailVerifyPanel, VerifiedSuccessPanel } from '../components/EmailVerifyPanel';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Register() {
  const { t, lang } = useLanguage();
  const { register, completeVerification } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const config = useConfig();
  const DNS_DOMAIN = config.install_domain || config.dns_domain || DOMAIN;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailSignupEnabled, setEmailSignupEnabled] = useState(true);
  useEffect(() => {
    fetch(`${API}/auth/signup-status`).then(r => r.json()).then(d => {
      setEmailSignupEnabled(!!d.email_signup_enabled);
    }).catch(() => {});
  }, []);

  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError(lang === 'fa' ? 'فقط ایمیل‌های جیمیل (@gmail.com) مجاز هستند.' : 'Only Gmail addresses (@gmail.com) are allowed.');
      return;
    }
    setLoading(true);
    try {
      const result = await register(name, email, password, refCode);
      if (result && result.email_verification_required) {
        setVerificationRequired(true);
        toast.success(t('verify_sent'));
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = async () => {
    setVerified(true);
    await completeVerification();
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] grid lg:grid-cols-12 bg-background page-mount">
      {/* LEFT — branding */}
      <aside className="hidden lg:flex lg:col-span-5 relative overflow-hidden border-e border-border bg-card/40">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 start-0 w-96 h-96 bg-primary/10 blur-3xl" />
        <div className="absolute bottom-20 end-10 w-72 h-72 bg-primary/5 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-14">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 border border-border bg-card flex items-center justify-center">
                <Terminal className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="font-mono text-sm font-semibold">{DNS_DOMAIN}</span>
            </div>
            <div className="editorial-mark text-primary mt-6">{lang === 'fa' ? 'شروع رایگان' : 'GET STARTED'}</div>
            <h2 className="text-3xl xl:text-4xl font-display font-semibold tracking-tighter mt-3 leading-tight max-w-sm">
              {lang === 'fa' ? 'یک حساب کاربری بساز.' : 'Create your account.'}
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed max-w-sm">
              {lang === 'fa'
                ? 'رایگان، بدون نیاز به کارت اعتباری. در کمتر از یک دقیقه فعال شو و اولین دامنه‌ت رو مدیریت کن.'
                : 'Free, no credit card needed. Be live in under a minute and start managing your first domain.'}
            </p>
          </div>

          {/* stats strip */}
          <div className="my-10 grid grid-cols-3 gap-px bg-border border border-border">
            <div className="bg-card p-4">
              <div className="mono-label">{lang === 'fa' ? 'کاربر' : 'USR'}</div>
              <div className="font-mono text-2xl font-semibold mt-1">2,400+</div>
              <div className="text-xs text-muted-foreground mt-1">{lang === 'fa' ? 'مشتری فعال' : 'Happy customers'}</div>
            </div>
            <div className="bg-card p-4">
              <div className="mono-label">{lang === 'fa' ? 'پایداری' : 'SLA'}</div>
              <div className="font-mono text-2xl font-semibold mt-1">99.99%</div>
              <div className="text-xs text-muted-foreground mt-1">{lang === 'fa' ? 'آپتایم' : 'Uptime'}</div>
            </div>
            <div className="bg-card p-4">
              <div className="mono-label">{lang === 'fa' ? 'هزینه' : 'FEE'}</div>
              <div className="font-mono text-2xl font-semibold mt-1 text-primary">$0</div>
              <div className="text-xs text-muted-foreground mt-1">{lang === 'fa' ? 'برای شروع' : 'To start'}</div>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { icon: Zap, text: lang === 'fa' ? 'فعال‌سازی در ۳۰ ثانیه' : 'Live in under 30 seconds' },
              { icon: Activity, text: lang === 'fa' ? 'گزارش زنده فعالیت' : 'Live activity logs' },
              { icon: Users, text: lang === 'fa' ? 'دعوت دوستان، رکورد رایگان بیشتر' : 'Invite friends, earn more records' },
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
          <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 border border-border bg-card flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" strokeWidth={2.5} />
            </div>
            <span className="font-mono text-sm font-semibold">{DNS_DOMAIN}</span>
          </div>

          {verificationRequired && !verified ? (
            <EmailVerifyPanel email={email} label="// VERIFY · EMAIL" onVerified={handleVerified} />
          ) : verified ? (
            <VerifiedSuccessPanel label="// ACCOUNT · CREATED" isFa={lang === 'fa'} />
          ) : (
            <div className="animate-fade-in-up">
              <div className="editorial-mark text-primary mb-3">{lang === 'fa' ? 'ساخت حساب رایگان' : 'CREATE ACCOUNT'}</div>
              <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tighter mb-2" data-testid="register-title">
                {lang === 'fa' ? 'بزن بریم.' : 'Let’s get started.'}
              </h1>
              <p className="text-muted-foreground text-sm mb-8">
                {lang === 'fa' ? 'بدون کارت اعتباری. در ۳۰ ثانیه فعال می‌شی.' : 'No credit card required. Live in under 30 seconds.'}
              </p>

              {refCode && (
                <div className="flex items-center gap-2.5 p-3 bg-primary/5 text-primary text-xs border border-primary/30 mb-5 font-mono animate-scale-in" data-testid="referral-badge">
                  <Gift className="w-3.5 h-3.5 shrink-0" />
                  <span className="uppercase tracking-widest">
                    {lang === 'fa' ? 'دعوت توسط دوست' : 'Invited by a friend'}
                  </span>
                  <span className="ms-auto opacity-70">REF.{refCode.slice(0, 6)}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-xs border border-destructive/20 mb-5 font-mono animate-scale-in" data-testid="register-error">
                  ! {error}
                </div>
              )}

              {emailSignupEnabled ? (
                <>
                  <form onSubmit={handleSubmit} className="space-y-5" data-testid="register-form">
                    <div>
                      <Label className="mono-label mb-2 block" htmlFor="name">{t('auth_name')}</Label>
                      <Input id="name" type="text"
                        placeholder={lang === 'fa' ? 'نام شما' : 'your-name'}
                        value={name} onChange={(e) => setName(e.target.value)} required
                        className="h-12 rounded-sm"
                        data-testid="register-name-input" />
                    </div>
                    <div>
                      <Label className="mono-label mb-2 block" htmlFor="email">{t('auth_email')}</Label>
                      <Input id="email" type="email"
                        placeholder="you@gmail.com"
                        value={email} onChange={(e) => setEmail(e.target.value)} required
                        className="h-12 rounded-sm font-mono text-sm"
                        data-testid="register-email-input"
                        dir="ltr" />
                    </div>
                    <div>
                      <Label className="mono-label mb-2 block" htmlFor="password">{t('auth_password')}</Label>
                      <Input id="password" type="password"
                        placeholder="•••••••• (min 6)"
                        value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                        className="h-12 rounded-sm font-mono"
                        data-testid="register-password-input"
                        dir="ltr" />
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full h-12 mt-2 bg-primary text-primary-foreground hover:bg-primary/90 font-mono lowercase text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="register-submit-button">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 rtl-flip" />}
                      {lang === 'fa' ? 'ساخت حساب' : 'create account'}
                    </button>
                  </form>

                  <div className="mt-6">
                    <GoogleLoginButton onError={(msg) => setError(msg)} />
                  </div>
                </>
              ) : (
                <div data-testid="register-google-only">
                  <div className="border border-border bg-secondary/30 p-4 mb-4 text-sm leading-relaxed">
                    <div className="font-mono text-xs lowercase text-primary mb-1">// {lang === 'fa' ? 'ثبت‌نام با گوگل' : 'google sign-up'}</div>
                    <p className="text-muted-foreground">
                      {lang === 'fa'
                        ? 'ثبت‌نام با ایمیل و رمز عبور موقتاً غیرفعال شده. لطفاً از حساب گوگل خود برای ساخت حساب استفاده کن.'
                        : 'Email & password sign-up is currently disabled. Please continue with your Google account.'}
                    </p>
                  </div>
                  <GoogleLoginButton onError={(msg) => setError(msg)} />
                </div>
              )}

              <div className="mt-10 pt-6 border-t border-dashed border-border text-center">
                <p className="font-mono text-xs text-muted-foreground">
                  {t('auth_has_account')}{' '}
                  <Link to="/login" className="text-primary hover:underline font-semibold" data-testid="register-to-login-link">
                    {t('auth_signin')} →
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

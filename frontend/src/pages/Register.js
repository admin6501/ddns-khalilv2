import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Globe, Loader2, Gift } from 'lucide-react';

export default function Register() {
  const { t, lang } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, refCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 hero-grid">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Globe className="w-8 h-8 text-primary" />
            <span className={`text-2xl font-bold ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`}>khalilv2.com</span>
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className={`text-2xl font-bold ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`} data-testid="register-title">
              {t('register_title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('register_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="register-form">
            {refCode && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm border border-primary/20" data-testid="referral-badge">
                <Gift className="w-4 h-4 shrink-0" />
                <span>{lang === 'fa' ? 'شما توسط یک دوست دعوت شده‌اید!' : 'You were invited by a friend!'}</span>
              </div>
            )}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20" data-testid="register-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t('auth_name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={lang === 'fa' ? 'نام شما' : 'Your name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="register-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth_email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="register-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth_password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                data-testid="register-password-input"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading} data-testid="register-submit-button">
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t('auth_register')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth_has_account')}{' '}
            <Link to="/login" className="text-primary hover:underline font-medium" data-testid="register-to-login-link">
              {t('auth_signin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

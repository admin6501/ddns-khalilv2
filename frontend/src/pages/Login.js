import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Globe, Loader2 } from 'lucide-react';
import { DOMAIN } from '../config/site';

export default function Login() {
  const { t, lang } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
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
            <h1 className={`text-2xl font-bold ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`} data-testid="login-title">
              {t('login_title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('login_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20" data-testid="login-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth_email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
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
                data-testid="login-password-input"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-button">
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t('auth_login')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth_no_account')}{' '}
            <Link to="/register" className="text-primary hover:underline font-medium" data-testid="login-to-register-link">
              {t('auth_signup')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

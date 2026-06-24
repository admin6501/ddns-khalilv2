import React, { useEffect, useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { authAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

// Multicolor official Google "G" logo (SVG)
const GoogleGlyph = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function GoogleLoginButton({ onError }) {
  const [config, setConfig] = useState({ enabled: false, client_id: '' });
  const [loading, setLoading] = useState(true);
  const { loginWithToken } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    authAPI.googleConfig()
      .then((res) => { if (mounted) setConfig(res.data); })
      .catch(() => { if (mounted) setConfig({ enabled: false, client_id: '' }); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleSuccess = async (response) => {
    try {
      const res = await authAPI.googleLogin(response.credential);
      const { token, user } = res.data;
      loginWithToken(token, user);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      if (onError) onError(err.response?.data?.detail || 'Google login failed');
    }
  };

  if (loading || !config.enabled || !config.client_id) return null;

  const label = lang === 'fa' ? 'ادامه با گوگل' : 'Continue with Google';

  return (
    <div className="space-y-3" data-testid="google-login-section">
      {/* OR divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="font-mono text-xs text-muted-foreground tracking-widest">
          {lang === 'fa' ? 'یا' : 'OR'}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Custom-styled button with hidden GoogleLogin overlay */}
      <div className="relative w-full h-12 overflow-hidden" data-testid="google-login-button">
        {/* Visual button */}
        <button
          type="button"
          className="w-full h-12 border border-border bg-card hover:bg-secondary/40 hover:border-primary/40 transition-colors flex items-center justify-center gap-3 font-mono text-sm select-none"
          aria-hidden="true"
          tabIndex={-1}
        >
          <GoogleGlyph className="w-5 h-5" />
          <span>{label}</span>
        </button>

        {/* Real Google button (overlay, transparent, clipped to the 48px button area) */}
        <div className="absolute inset-0 opacity-0 cursor-pointer overflow-hidden [&>div]:!w-full [&>div]:!h-full [&>div>div]:!w-full [&>div>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!m-0">
          <GoogleOAuthProvider clientId={config.client_id}>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => onError && onError('Google login failed')}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              locale={lang === 'fa' ? 'fa' : 'en'}
              width="400"
            />
          </GoogleOAuthProvider>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { authAPI } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

/**
 * Shared 6-digit email verification panel used by Login + Register pages.
 * - email: which email the code was sent to
 * - onVerified(): called after a successful verify (parent decides what to do next)
 */
export function EmailVerifyPanel({ email, label = '// VERIFY · EMAIL', onVerified }) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setVerifyLoading(true);
    try {
      await authAPI.verifyEmail((email || '').toLowerCase(), code);
      toast.success(t('verify_success'));
      onVerified?.();
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
      await authAPI.resendCode((email || '').toLowerCase());
      toast.success(t('verify_resend'));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mono-label text-primary mb-3">{label}</div>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('verify_title')}</h1>
      <p className="text-sm text-muted-foreground mb-2">{t('verify_sent')}</p>
      <p className="font-mono text-sm text-primary mb-8 flex items-center gap-2">
        <Mail className="w-3.5 h-3.5" />{email}
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
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.6em] font-mono h-14 rounded-sm"
            dir="ltr"
            required
            data-testid="verify-code-input"
          />
        </div>
        <button
          type="submit"
          disabled={verifyLoading || code.length !== 6}
          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-widest text-xs font-semibold transition-all amber-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="verify-submit-button"
        >
          {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {t('verify_submit')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={handleResend}
          disabled={resendLoading}
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
          data-testid="verify-resend-button"
        >
          {resendLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
          {t('verify_resend')}
        </button>
      </div>
    </div>
  );
}

/** Small "verified" success panel; differs only by the small mono-label between Login & Register. */
export function VerifiedSuccessPanel({ label, isFa }) {
  const { t } = useLanguage();
  return (
    <div className="animate-scale-in text-center py-8">
      <div className="w-16 h-16 border border-emerald-500/50 bg-emerald-500/10 mx-auto mb-5 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-500" />
      </div>
      <div className="mono-label text-emerald-500 mb-2">{label}</div>
      <h2 className="text-2xl font-semibold">{t('verify_success')}</h2>
      <p className="text-sm text-muted-foreground mt-2 font-mono">
        ⇢ {isFa ? 'در حال انتقال…' : 'redirecting…'}
      </p>
    </div>
  );
}

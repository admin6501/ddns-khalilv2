import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { contactAPI } from '../lib/api';
import { Globe, Shield, Zap, Server, LayoutDashboard, ArrowUpRight, Check, ChevronRight, Send } from 'lucide-react';
import { Button } from '../components/ui/button';

const DOMAIN = "khalilv2.com";

export default function Landing() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contactInfo, setContactInfo] = useState(null);

  useEffect(() => {
    contactAPI.getContactInfo().then(res => setContactInfo(res.data)).catch(() => {});
  }, []);

  const features = [
    { icon: Globe, title: t('feature_1_title'), desc: t('feature_1_desc') },
    { icon: Zap, title: t('feature_2_title'), desc: t('feature_2_desc') },
    { icon: Server, title: t('feature_3_title'), desc: t('feature_3_desc') },
    { icon: Shield, title: t('feature_4_title'), desc: t('feature_4_desc') },
    { icon: LayoutDashboard, title: t('feature_5_title'), desc: t('feature_5_desc') },
    { icon: ArrowUpRight, title: t('feature_6_title'), desc: t('feature_6_desc') },
  ];

  const plans = [
    {
      name: lang === 'fa' ? 'رایگان' : 'Free',
      price: lang === 'fa' ? '۰' : '0',
      currency: '$',
      period: '',
      records: 2,
      features: lang === 'fa'
        ? ['۲ رکورد DNS', 'A، AAAA، CNAME', 'داشبورد پایه', 'پشتیبانی انجمن']
        : ['2 DNS Records', 'A, AAAA, CNAME', 'Basic Dashboard', 'Community Support'],
      popular: false,
      cta: user ? t('pricing_current') : t('pricing_get_started'),
      action: () => user ? navigate('/dashboard') : navigate('/register'),
    },
    {
      name: lang === 'fa' ? 'حرفه‌ای' : 'Pro',
      price: '5',
      currency: '$',
      period: lang === 'fa' ? '/ماه' : '/mo',
      records: 50,
      features: lang === 'fa'
        ? ['۵۰ رکورد DNS', 'A، AAAA، CNAME', 'داشبورد پیشرفته', 'پشتیبانی اولویت‌دار', 'دسترسی API']
        : ['50 DNS Records', 'A, AAAA, CNAME', 'Advanced Dashboard', 'Priority Support', 'API Access'],
      popular: true,
      cta: t('pricing_upgrade'),
      action: () => {},
    },
    {
      name: lang === 'fa' ? 'سازمانی' : 'Enterprise',
      price: '20',
      currency: '$',
      period: lang === 'fa' ? '/ماه' : '/mo',
      records: 500,
      features: lang === 'fa'
        ? ['۵۰۰ رکورد DNS', 'تمام انواع رکورد', 'داشبورد ویژه', 'پشتیبانی ۲۴/۷', 'دسترسی API', 'دامنه اختصاصی']
        : ['500 DNS Records', 'All Record Types', 'Premium Dashboard', '24/7 Support', 'API Access', 'Custom Domain'],
      popular: false,
      cta: t('pricing_contact'),
      action: () => {},
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-20 md:pt-36 md:pb-32">
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20" data-testid="hero-badge">
              <Globe className="w-4 h-4" />
              <span>{DOMAIN}</span>
            </div>
            
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`} data-testid="hero-title">
              {t('hero_title')}{' '}
              <span className="text-primary">{DOMAIN}</span>
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="hero-subtitle">
              {t('hero_subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="px-8 py-3 text-base brand-glow"
                onClick={() => navigate(user ? '/dashboard' : '/register')}
                data-testid="hero-cta-button"
              >
                {t('hero_cta')}
                <ChevronRight className="w-4 h-4 ms-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-3 text-base"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="hero-plans-button"
              >
                {t('hero_cta_secondary')}
              </Button>
            </div>

            {/* Terminal-like preview */}
            <div className="max-w-lg mx-auto mt-12 rounded-xl overflow-hidden border border-border bg-card shadow-xl" data-testid="hero-terminal">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" style={{ background: 'hsl(45, 93%, 47%)' }} />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="text-xs text-muted-foreground ms-2 font-mono">DNS Record</span>
              </div>
              <div className="p-4 font-mono text-sm space-y-2 text-start">
                <div className="flex gap-3">
                  <span className="text-primary">A</span>
                  <span className="text-muted-foreground">mysite.{DOMAIN}</span>
                  <span className="text-foreground ms-auto">192.168.1.1</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-500">CNAME</span>
                  <span className="text-muted-foreground">blog.{DOMAIN}</span>
                  <span className="text-foreground ms-auto">myblog.com</span>
                </div>
                <div className="flex gap-3 opacity-40">
                  <span className="text-cyan-500">AAAA</span>
                  <span className="text-muted-foreground">app.{DOMAIN}</span>
                  <span className="text-foreground ms-auto">2001:db8::1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28" id="features">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`} data-testid="features-title">
              {t('features_title')}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">{t('features_subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((f, i) => (
              <div
                key={i}
                className="group rounded-xl border border-border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
                data-testid={`feature-card-${i}`}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 md:py-28 bg-muted/30" id="pricing">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`} data-testid="pricing-title">
              {t('pricing_title')}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">{t('pricing_subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto stagger-children">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-xl border p-8 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up ${
                  plan.popular
                    ? 'border-primary bg-card shadow-xl brand-glow'
                    : 'border-border bg-card hover:shadow-lg'
                }`}
                data-testid={`pricing-card-${i}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 start-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold" style={lang === 'fa' ? {transform: 'translateX(50%)'} : {}}>
                    {t('pricing_popular')}
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-4">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.currency}{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.records} {t('pricing_records')}
                  </p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat, fi) => (
                    <li key={fi} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={plan.action}
                  data-testid={`pricing-cta-${i}`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <span className={`text-lg font-bold ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`}>{DOMAIN}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('footer_desc')}</p>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {DOMAIN}. {t('footer_rights')}
          </p>
        </div>
      </footer>
    </div>
  );
}

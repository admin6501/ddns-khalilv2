import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Globe, Sun, Moon, Languages, Menu, X, LogOut, LayoutDashboard, User, Crown } from 'lucide-react';
import { DOMAIN } from '../config/site';
import { useConfig } from '../contexts/ConfigContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, toggleLang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const config = useConfig();
  const DNS_DOMAIN = config.dns_domain || DOMAIN;
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;
  const isAdmin = user?.role === 'admin';

  const navLinks = user
    ? []
    : [
        { path: '/#features', label: t('nav_features'), isHash: true },
        { path: '/#pricing', label: t('nav_pricing'), isHash: true },
      ];

  const handleNavClick = (link) => {
    setMobileOpen(false);
    if (link.isHash) {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById(link.path.replace('/#', ''))?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(link.path.replace('/#', ''))?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(link.path);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border glass-card" data-testid="navbar">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="navbar-logo">
            <Globe className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-300" />
            <span className={`text-lg font-bold ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`}>
              {DNS_DOMAIN}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNavClick(link)}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.path) ? 'text-primary' : 'text-muted-foreground'
                }`}
                data-testid={`nav-link-${link.path.replace(/[/#]/g, '')}`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0"
              data-testid="theme-toggle-button"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Language toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLang}
              className="w-9 h-9 p-0"
              data-testid="language-toggle-button"
            >
              <Languages className="w-4 h-4" />
            </Button>

            {/* Auth buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="user-menu-trigger">
                    <User className="w-4 h-4" />
                    <span className="max-w-[100px] truncate">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="menu-dashboard">
                    <LayoutDashboard className="w-4 h-4 me-2" />
                    {t('nav_dashboard')}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="menu-admin">
                      <Crown className="w-4 h-4 me-2" />
                      {t('nav_admin')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="menu-logout">
                    <LogOut className="w-4 h-4 me-2" />
                    {t('nav_logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')} data-testid="nav-login-button">
                  {t('nav_login')}
                </Button>
                <Button size="sm" onClick={() => navigate('/register')} data-testid="nav-register-button">
                  {t('nav_register')}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-9 h-9 p-0" data-testid="mobile-theme-toggle">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 p-0" data-testid="mobile-menu-toggle">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-2 animate-fade-in" data-testid="mobile-menu">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNavClick(link)}
                className="block w-full text-start px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => { toggleLang(); setMobileOpen(false); }}
              className="block w-full text-start px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted"
            >
              <Languages className="w-4 h-4 inline me-2" />
              {lang === 'en' ? 'فارسی' : 'English'}
            </button>
            <div className="border-t border-border pt-2 space-y-2">
              {user ? (
                <>
                  <button onClick={() => { navigate('/dashboard'); setMobileOpen(false); }} className="block w-full text-start px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted">
                    <LayoutDashboard className="w-4 h-4 inline me-2" />
                    {t('nav_dashboard')}
                  </button>
                  {isAdmin && (
                    <button onClick={() => { navigate('/admin'); setMobileOpen(false); }} className="block w-full text-start px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted">
                      <Crown className="w-4 h-4 inline me-2" />
                      {t('nav_admin')}
                    </button>
                  )}
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="block w-full text-start px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10">
                    <LogOut className="w-4 h-4 inline me-2" />
                    {t('nav_logout')}
                  </button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" onClick={() => { navigate('/login'); setMobileOpen(false); }}>
                    {t('nav_login')}
                  </Button>
                  <Button className="w-full" onClick={() => { navigate('/register'); setMobileOpen(false); }}>
                    {t('nav_register')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

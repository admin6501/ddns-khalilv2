import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ConfigContext = createContext(null);

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function ConfigProvider({ children }) {
  const initialInstallDomain = typeof window !== 'undefined'
    ? window.location.hostname.replace(/^www\./, '')
    : '';

  const [config, setConfig] = useState({
    domain: '',
    dns_domain: '',
    install_domain: initialInstallDomain,
    telegram_id: '',
    telegram_url: '',
    contact_message_en: '',
    contact_message_fa: '',
    referral_bonus_per_invite: 1,
    loaded: false,
  });

  useEffect(() => {
    // Title always derived from actual install hostname, not the DNS zone.
    const installDomain = window.location.hostname.replace(/^www\./, '');
    document.title = `${installDomain} — Free DNS Management`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `${installDomain} — Free DNS Management. Create A, AAAA, CNAME and NS records on your own subdomain in seconds.`
      );
    }

    axios.get(`${API_BASE}/config`).then(res => {
      setConfig({ ...res.data, install_domain: installDomain, loaded: true });
    }).catch(() => {
      setConfig(prev => ({ ...prev, domain: installDomain, dns_domain: installDomain, install_domain: installDomain, loaded: true }));
    });
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
};

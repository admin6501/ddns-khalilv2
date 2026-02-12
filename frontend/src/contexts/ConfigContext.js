import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ConfigContext = createContext(null);

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({
    domain: '',
    dns_domain: '',
    telegram_id: '',
    telegram_url: '',
    contact_message_en: '',
    contact_message_fa: '',
    referral_bonus_per_invite: 1,
    loaded: false,
  });

  useEffect(() => {
    axios.get(`${API_BASE}/config`).then(res => {
      setConfig({ ...res.data, loaded: true });
    }).catch(() => {
      // Fallback: extract domain from current URL
      const fallbackDomain = window.location.hostname;
      setConfig(prev => ({ ...prev, domain: fallbackDomain, dns_domain: fallbackDomain, loaded: true }));
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

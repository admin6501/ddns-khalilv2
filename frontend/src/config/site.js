/**
 * Site Configuration
 * 
 * DOMAIN: The site domain (from REACT_APP_DOMAIN_NAME env var or hostname)
 * DNS_DOMAIN: The Cloudflare zone domain for DNS records.
 *   This is fetched from the backend /api/config endpoint.
 *   Use useConfig().dns_domain from ConfigContext for the live value.
 *   This static export is only a fallback.
 */

export const DOMAIN = process.env.REACT_APP_DOMAIN_NAME || window.location.hostname;

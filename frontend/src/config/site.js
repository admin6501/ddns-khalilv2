/**
 * Site Configuration
 * 
 * The domain name is read from the REACT_APP_DOMAIN_NAME environment variable.
 * When deploying with install.sh, this is automatically set based on the domain
 * the user provides during installation.
 * 
 * Fallback: If the env var is not set, it uses window.location.hostname.
 */

export const DOMAIN = process.env.REACT_APP_DOMAIN_NAME || window.location.hostname;

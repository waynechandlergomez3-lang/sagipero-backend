const os = require('os')
const fs = require('fs')
const path = require('path')

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  // Prefer wireless/wifi interfaces (common names: Wi-Fi, Wireless, wlan0, wlan1)
  const wirelessNames = [/wi-?fi/i, /wireless/i, /wlan/i, /wifi/i]
  // First pass: find wireless IPv4
  for (const name of Object.keys(interfaces)) {
    if (!wirelessNames.some(rx => rx.test(name))) continue
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }

  // Fallback: any non-internal IPv4
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }

  return '127.0.0.1'
}

function upsertEnv(filePath, key, value) {
  let content = ''
  if (fs.existsSync(filePath)) content = fs.readFileSync(filePath, 'utf8')
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(content)) {
    content = content.replace(re, `${key}=${value}`)
  } else {
    if (content.length && !content.endsWith('\n')) content += '\n'
    content += `${key}=${value}\n`
  }
  fs.writeFileSync(filePath, content, 'utf8')
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
}

const localIp = getLocalIP()
console.log('Detected local IP:', localIp)

// Update backend .env
const backendEnv = path.join(__dirname, '..', '..', 'backend', '.env')
upsertEnv(backendEnv, 'LOCAL_IP', localIp)
console.log('Updated backend .env with LOCAL_IP')

// Create/update admin-web .env for Vite
const adminEnv = path.join(__dirname, '..', '..', 'admin-web', '.env')
const adminEnvContent = `VITE_API_URL=http://${localIp}:8080/api\nVITE_API_WS=http://${localIp}:8080\n`
writeFile(adminEnv, adminEnvContent)
console.log('Wrote admin-web .env with VITE_API_URL and VITE_API_WS')

// Update mobile config file while preserving environment detection logic
const mobileConfigPath = path.join(__dirname, '..', '..', 'SagiperoMobile', 'src', 'services', 'config.ts')
const mobileConfig = `// Environment-aware configuration
// This file automatically switches between development and production configs

// Environment detection - __DEV__ is React Native global
const isProduction = __DEV__ === false;

// Configuration constants
const PRODUCTION_CONFIG = {
  API_BASE: 'https://sagipero-backend-production.up.railway.app',
  SOCKET_BASE: 'https://sagipero-backend-production.up.railway.app',
  API_HOST: 'https://sagipero-backend-production.up.railway.app'
};

const DEVELOPMENT_CONFIG = {
  API_BASE: 'http://${localIp}:8080',
  SOCKET_BASE: 'http://${localIp}:8080',
  API_HOST: 'http://${localIp}:8080'
};

// Select configuration based on environment
const CONFIG = isProduction ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;

if (isProduction) {
  console.log('🚀 Loading PRODUCTION configuration (Railway backend)');
} else {
  console.log('🔧 Loading DEVELOPMENT configuration (localhost)');
}

// Export the selected configuration
export const API_BASE = CONFIG.API_BASE;
export const SOCKET_BASE = CONFIG.SOCKET_BASE;
export const API_HOST = CONFIG.API_HOST;

// Export environment info for debugging
export const ENV_INFO = {
  isProduction,
  isDevelopment: !isProduction,
  API_BASE: CONFIG.API_BASE,
  SOCKET_BASE: CONFIG.SOCKET_BASE,
  API_HOST: CONFIG.API_HOST
};

console.log('📱 Mobile App Environment:', ENV_INFO);
`
writeFile(mobileConfigPath, mobileConfig)
console.log('Updated SagiperoMobile/src/services/config.ts with environment detection and local IP:', localIp)

console.log('Done. Please restart frontend dev servers to pick up new env values.')

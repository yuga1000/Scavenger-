// Configuration Management V4.1 Clean - Simplified Configuration
// File: utils/Config.js

const fs = require('fs').promises;
const path = require('path');

class Config {
    constructor() {
        this.config = new Map();
        
        this.requiredKeys = [
            'TELEGRAM_BOT_TOKEN',
            'TELEGRAM_CHAT_ID'
        ];
        
        this.optionalKeys = [
            'MICROWORKERS_EMAIL',
            'MICROWORKERS_PASSWORD',
            'MICROWORKERS_API_KEY',
            'CLICKWORKER_API_KEY',
            'SPARE5_API_KEY',
            'ETHERSCAN_API_KEY',
            'ALCHEMY_API_KEY',
            'WITHDRAWAL_ADDRESS',
            'LOG_LEVEL',
            'LOG_TO_FILE',
            'NODE_ENV',
            'USE_SCRAPING_FALLBACK'
        ];
        
        this.defaults = {
            LOG_LEVEL: 'info',
            LOG_TO_FILE: 'true',
            NODE_ENV: 'development',
            USE_SCRAPING_FALLBACK: 'true',
            SCAN_INTERVAL: '300000',
            MIN_TASK_REWARD: '0.001',
            WITHDRAWAL_THRESHOLD: '0.01',
            MAX_CONCURRENT_TASKS: '3',
            API_TIMEOUT: '15000',
            RATE_LIMIT_DELAY: '2000',
            MIN_BALANCE_THRESHOLD: '0.001',
            VALIDATION_BATCH_SIZE: '10'
        };
        
        console.log('[⚙️] Config V4.1 Clean initialized');
    }

    async load() {
        try {
            console.log('[▸] Loading configuration...');
            
            // Load from environment variables first
            this.loadFromEnv();
            
            // Load from .env file if exists
            await this.loadFromFile();
            
            // Apply defaults for missing values
            this.applyDefaults();
            
            // Validate configuration
            await this.validate();
            
            console.log('[✓] Configuration loaded successfully');
            this.logConfigSummary();
            
        } catch (error) {
            console.error(`[✗] Configuration loading failed: ${error.message}`);
            throw error;
        }
    }

    loadFromEnv() {
        const allKeys = [...this.requiredKeys, ...this.optionalKeys, ...Object.keys(this.defaults)];
        
        for (const key of allKeys) {
            if (process.env[key]) {
                this.config.set(key, process.env[key]);
            }
        }
    }

    async loadFromFile() {
        try {
            const envFile = '.env';
            const content = await fs.readFile(envFile, 'utf8');
            
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    if (key && valueParts.length > 0) {
                        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
                        this.config.set(key.trim(), value);
                    }
                }
            }
            
            console.log('[◎] Loaded configuration from .env file');
            
        } catch (error) {
            console.log('[◎] No .env file found, using environment variables only');
        }
    }

    applyDefaults() {
        for (const [key, defaultValue] of Object.entries(this.defaults)) {
            if (!this.config.has(key)) {
                this.config.set(key, defaultValue);
            }
        }
    }

    async validate() {
        console.log('[▸] Validating configuration...');
        
        const missing = [];
        const warnings = [];
        
        // Check required keys
        for (const key of this.requiredKeys) {
            if (!this.config.has(key) || !this.config.get(key)) {
                missing.push(key);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
        
        // Validate specific formats
        await this.validateSpecificKeys(warnings);
        
        // Log warnings
        warnings.forEach(warning => console.warn(`[--] ${warning}`));
        
        console.log('[✓] Configuration validation passed');
    }

    async validateSpecificKeys(warnings) {
        // Validate Telegram Chat ID (should be numeric)
        const chatId = this.config.get('TELEGRAM_CHAT_ID');
        if (chatId && isNaN(chatId)) {
            warnings.push('TELEGRAM_CHAT_ID should be numeric');
        }
        
        // Validate withdrawal address (Ethereum address check)
        const withdrawalAddr = this.config.get('WITHDRAWAL_ADDRESS');
        if (withdrawalAddr && !/^0x[a-fA-F0-9]{40}$/.test(withdrawalAddr)) {
            warnings.push('WITHDRAWAL_ADDRESS format may be invalid');
        }
        
        // Validate numeric values
        const numericKeys = [
            'SCAN_INTERVAL', 'API_TIMEOUT', 'RATE_LIMIT_DELAY', 
            'MAX_CONCURRENT_TASKS', 'VALIDATION_BATCH_SIZE'
        ];
        
        for (const key of numericKeys) {
            const value = this.config.get(key);
            if (value && isNaN(parseInt(value))) {
                warnings.push(`${key} should be numeric, got: ${value}`);
            }
        }
        
        // Validate float values
        const floatKeys = ['MIN_TASK_REWARD', 'WITHDRAWAL_THRESHOLD', 'MIN_BALANCE_THRESHOLD'];
        for (const key of floatKeys) {
            const value = this.config.get(key);
            if (value && isNaN(parseFloat(value))) {
                warnings.push(`${key} should be a number, got: ${value}`);
            }
        }
        
        // Check for default/example values
        this.checkForExampleValues(warnings);
    }

    checkForExampleValues(warnings) {
        const examplePatterns = {
            'TELEGRAM_BOT_TOKEN': ['YOUR_BOT_TOKEN', 'your_telegram_token', 'example'],
            'MICROWORKERS_EMAIL': ['your_email@example.com', 'example@email.com'],
            'ETHERSCAN_API_KEY': ['YOUR_ETHERSCAN_KEY', 'your_etherscan_key', 'YourApiKeyToken'],
            'ALCHEMY_API_KEY': ['YOUR_ALCHEMY_KEY', 'your_alchemy_key'],
            'WITHDRAWAL_ADDRESS': ['0x742d35Cc6663C747049fdB5F3C00F0D3a67d8829', 'your_eth_address']
        };

        for (const [configKey, patterns] of Object.entries(examplePatterns)) {
            const value = this.config.get(configKey);
            if (value && patterns.some(pattern => 
                value.toLowerCase().includes(pattern.toLowerCase()))) {
                warnings.push(`${configKey} appears to contain example/default value`);
            }
        }
    }

    logConfigSummary() {
        const summary = {
            environment: this.get('NODE_ENV'),
            logLevel: this.get('LOG_LEVEL'),
            telegramConfigured: this.isConfigured('TELEGRAM_BOT_TOKEN'),
            microworkersEmailConfigured: this.isConfigured('MICROWORKERS_EMAIL'),
            microworkersApiConfigured: this.isConfigured('MICROWORKERS_API_KEY'),
            clickworkerConfigured: this.isConfigured('CLICKWORKER_API_KEY'),
            spare5Configured: this.isConfigured('SPARE5_API_KEY'),
            etherscanConfigured: this.isConfigured('ETHERSCAN_API_KEY'),
            alchemyConfigured: this.isConfigured('ALCHEMY_API_KEY'),
            withdrawalConfigured: this.isConfigured('WITHDRAWAL_ADDRESS'),
            scrapingEnabled: this.getBool('USE_SCRAPING_FALLBACK')
        };
        
        console.log(`[◉] Environment: ${summary.environment}`);
        console.log(`[◉] Security: Clean version protection`);
        console.log(`[◉] Telegram: ${summary.telegramConfigured ? '[✓] Configured' : '[--] Missing'}`);
        console.log(`[◉] Microworkers: Email:${summary.microworkersEmailConfigured ? '✓' : '✗'} API:${summary.microworkersApiConfigured ? '✓' : '✗'}`);
        console.log(`[◉] Other Platforms: CW:${summary.clickworkerConfigured ? '✓' : '✗'} S5:${summary.spare5Configured ? '✓' : '✗'}`);
        console.log(`[◉] Blockchain APIs: ETH:${summary.etherscanConfigured ? '✓' : '✗'} ALC:${summary.alchemyConfigured ? '✓' : '✗'}`);
        console.log(`[◉] Withdrawal: ${summary.withdrawalConfigured ? '[✓] Configured' : '[--] Missing'}`);
        console.log(`[◉] Web Scraping: ${summary.scrapingEnabled ? '[✓] Enabled' : '[--] Disabled'}`);
    }

    isConfigured(key) {
        const value = this.config.get(key);
        return value && value.length > 5 && !value.toLowerCase().includes('your_') && !value.toLowerCase().includes('example');
    }

    // Get configuration value
    get(key, defaultValue = null) {
        return this.config.get(key) || defaultValue;
    }

    // Get configuration value as integer
    getInt(key, defaultValue = 0) {
        const value = this.get(key);
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    // Get configuration value as float
    getFloat(key, defaultValue = 0.0) {
        const value = this.get(key);
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    // Get configuration value as boolean
    getBool(key, defaultValue = false) {
        const value = this.get(key);
        if (!value) return defaultValue;
        return value.toLowerCase() === 'true' || value === '1';
    }

    // Set configuration value
    set(key, value) {
        this.config.set(key, value);
    }

    // Check if key exists
    has(key) {
        return this.config.has(key);
    }

    // Get all configuration (masking sensitive data)
    getAll(includeSensitive = false) {
        const result = {};
        const sensitiveKeys = [
            'TELEGRAM_BOT_TOKEN', 'MICROWORKERS_PASSWORD', 'MICROWORKERS_API_KEY',
            'CLICKWORKER_API_KEY', 'SPARE5_API_KEY', 'ETHERSCAN_API_KEY', 'ALCHEMY_API_KEY'
        ];
        
        for (const [key, value] of this.config) {
            if (includeSensitive || !sensitiveKeys.includes(key)) {
                result[key] = value;
            } else {
                // Show masked version for sensitive keys
                result[key] = this.maskSensitiveValue(key, value);
            }
        }
        
        return result;
    }

    maskSensitiveValue(key, value) {
        if (!value) return '***';
        
        if (key === 'TELEGRAM_BOT_TOKEN') {
            return value.substring(0, 8) + '***' + value.substring(value.length - 4);
        }
        
        if (key.includes('ADDRESS')) {
            return value.substring(0, 6) + '***' + value.substring(value.length - 4);
        }
        
        // Generic masking for API keys
        return value.substring(0, 4) + '***' + value.substring(value.length - 2);
    }

    // Get production/demo mode status
    isProduction() {
        return this.get('NODE_ENV') === 'production';
    }

    isDevelopment() {
        return this.get('NODE_ENV') === 'development';
    }

    // API configuration helpers
    getApiConfig(platform) {
        const configs = {
            microworkers: {
                baseUrl: 'https://api.microworkers.com/v1',
                apiKey: this.get('MICROWORKERS_API_KEY'),
                email: this.get('MICROWORKERS_EMAIL'),
                password: this.get('MICROWORKERS_PASSWORD'),
                configured: this.isConfigured('MICROWORKERS_EMAIL') || this.isConfigured('MICROWORKERS_API_KEY')
            },
            
            clickworker: {
                baseUrl: 'https://api.clickworker.com/v1',
                apiKey: this.get('CLICKWORKER_API_KEY'),
                configured: this.isConfigured('CLICKWORKER_API_KEY')
            },
            
            spare5: {
                baseUrl: 'https://api.spare5.com/v1',
                apiKey: this.get('SPARE5_API_KEY'),
                configured: this.isConfigured('SPARE5_API_KEY')
            },
            
            etherscan: {
                baseUrl: 'https://api.etherscan.io/api',
                apiKey: this.get('ETHERSCAN_API_KEY'),
                configured: this.isConfigured('ETHERSCAN_API_KEY')
            },
            
            alchemy: {
                baseUrl: this.get('ALCHEMY_API_URL') || 'https://eth-mainnet.g.alchemy.com/v2',
                apiKey: this.get('ALCHEMY_API_KEY'),
                configured: this.isConfigured('ALCHEMY_API_KEY')
            }
        };
        
        return configs[platform] || null;
    }

    // Task configuration
    getTaskConfig() {
        return {
            scanInterval: this.getInt('SCAN_INTERVAL', 300000),
            minTaskReward: this.getFloat('MIN_TASK_REWARD', 0.001),
            withdrawalThreshold: this.getFloat('WITHDRAWAL_THRESHOLD', 0.01),
            maxConcurrentTasks: this.getInt('MAX_CONCURRENT_TASKS', 3),
            apiTimeout: this.getInt('API_TIMEOUT', 15000),
            rateLimitDelay: this.getInt('RATE_LIMIT_DELAY', 2000),
            minBalanceThreshold: this.getFloat('MIN_BALANCE_THRESHOLD', 0.001),
            validationBatchSize: this.getInt('VALIDATION_BATCH_SIZE', 10)
        };
    }

    // Save current config to file (excluding sensitive data)
    async save(filename = 'config-backup.json') {
        try {
            const configData = {
                timestamp: new Date().toISOString(),
                version: '4.1.0',
                security: 'clean',
                config: this.getAll(false) // Don't include sensitive data
            };
            
            await fs.writeFile(filename, JSON.stringify(configData, null, 2));
            console.log(`[✓] Configuration saved to ${filename}`);
        } catch (error) {
            console.error(`[✗] Failed to save config: ${error.message}`);
        }
    }

    // Reload configuration
    async reload() {
        console.log('[▸] Reloading configuration...');
        this.config.clear();
        await this.load();
        console.log('[✓] Configuration reloaded');
    }

    // Get configuration health status
    getHealthStatus() {
        const required = this.requiredKeys.length;
        const configured = this.requiredKeys.filter(key => this.isConfigured(key)).length;
        const percentage = (configured / required) * 100;
        
        if (percentage === 100) return 'excellent';
        if (percentage >= 80) return 'good';
        if (percentage >= 60) return 'fair';
        if (percentage >= 40) return 'poor';
        return 'critical';
    }
}

module.exports = Config;

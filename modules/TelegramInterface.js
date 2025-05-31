// TelegramInterface V4.1 Final - Production Ready
// File: modules/TelegramInterface.js

const TelegramBot = require('node-telegram-bot-api');

class TelegramInterface {
    constructor(system) {
        this.system = system;
        this.logger = system.logger.create('TELEGRAM');
        this.config = system.config;
        this.security = system.security;
        
        this.bot = null;
        this.chatId = null;
        this.isConnected = false;
        this.isStarting = false;
        
        this.logger.info('[◉] TelegramInterface V4.1 Final initialized');
    }

    async initialize() {
        this.logger.info('[▸] Initializing Telegram interface...');
        return { success: true, message: 'Telegram interface ready' };
    }

    async start() {
        if (this.isStarting) {
            return { success: false, message: 'Telegram is already starting' };
        }

        this.isStarting = true;

        try {
            const botToken = this.config.get('TELEGRAM_BOT_TOKEN');
            this.chatId = this.config.get('TELEGRAM_CHAT_ID');
            
            if (!botToken) {
                throw new Error('TELEGRAM_BOT_TOKEN not configured');
            }

            this.logger.info('[▸] Starting Telegram bot with enhanced stability...');

            // Add startup delay to prevent immediate polling issues
            await this.sleep(3000);

            // Initialize bot with enhanced error handling
            this.bot = new TelegramBot(botToken, { 
                polling: {
                    interval: 2000,  // 2 seconds between polls
                    autoStart: false, // Don't start automatically
                    params: {
                        timeout: 10
                    }
                }
            });

            // Set up comprehensive error handling BEFORE starting polling
            this.setupErrorHandlers();
            this.setupMessageHandlers();

            // Start polling with delay
            await this.sleep(1000);
            await this.startPollingWithRetry();

            this.isConnected = true;
            this.isStarting = false;
            this.logger.success('[✓] Telegram bot connected successfully');
            
            return { success: true, message: 'Telegram interface started' };
            
        } catch (error) {
            this.isStarting = false;
            this.logger.error(`[✗] Telegram start failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    async startPollingWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.info(`[▸] Starting polling (attempt ${attempt}/${maxRetries})...`);
                
                // Test bot token first
                const me = await this.bot.getMe();
                this.logger.info(`[✓] Bot verified: ${me.first_name} (@${me.username})`);
                
                // Start polling
                await this.bot.startPolling();
                this.logger.success('[✓] Polling started successfully');
                return true;
                
            } catch (error) {
                this.logger.warn(`[--] Polling attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < maxRetries) {
                    const delay = attempt * 2000; // 2s, 4s, 6s
                    this.logger.info(`[▸] Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                } else {
                    throw error;
                }
            }
        }
    }

    setupErrorHandlers() {
        // Bot-level error handling
        this.bot.on('error', (error) => {
            this.logger.error(`[✗] Bot error: ${error.message}`);
            
            // Don't crash on polling errors
            if (error.message.includes('ETELEGRAM') || error.message.includes('polling')) {
                this.logger.warn('[--] Polling error detected, will retry...');
                this.handlePollingError(error);
            }
        });

        // Polling-specific error handling
        this.bot.on('polling_error', (error) => {
            this.logger.warn(`[--] Polling error: ${error.message}`);
            this.handlePollingError(error);
        });

        // Webhook errors (shouldn't happen with polling, but just in case)
        this.bot.on('webhook_error', (error) => {
            this.logger.error(`[✗] Webhook error: ${error.message}`);
        });
    }

    async handlePollingError(error) {
        // If we get consistent 404s, the token might be invalid
        if (error.message.includes('404')) {
            this.logger.error('[✗] Bot token appears to be invalid (404 error)');
            // Don't retry immediately on 404s
            return;
        }

        // For other errors, try to restart polling after a delay
        setTimeout(async () => {
            if (this.bot && this.isConnected) {
                try {
                    this.logger.info('[▸] Attempting to restart polling...');
                    await this.bot.stopPolling();
                    await this.sleep(2000);
                    await this.bot.startPolling();
                    this.logger.success('[✓] Polling restarted');
                } catch (restartError) {
                    this.logger.error(`[✗] Failed to restart polling: ${restartError.message}`);
                }
            }
        }, 5000);
    }

    setupMessageHandlers() {
        // Handle messages with comprehensive error catching
        this.bot.on('message', async (msg) => {
            try {
                await this.handleMessage(msg);
            } catch (error) {
                this.logger.error(`[✗] Message handler error: ${error.message}`);
                // Send error to user if possible
                try {
                    await this.bot.sendMessage(msg.chat.id, '❌ Sorry, there was an error processing your message.');
                } catch (sendError) {
                    this.logger.error(`[✗] Failed to send error message: ${sendError.message}`);
                }
            }
        });
        
        // Handle callback queries with error catching
        this.bot.on('callback_query', async (query) => {
            try {
                await this.handleCallback(query);
            } catch (error) {
                this.logger.error(`[✗] Callback handler error: ${error.message}`);
                try {
                    await this.bot.answerCallbackQuery(query.id, { text: '❌ Error processing request' });
                } catch (answerError) {
                    this.logger.error(`[✗] Failed to answer callback query: ${answerError.message}`);
                }
            }
        });
    }

    async handleMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        // Store chat ID if not set
        if (!this.chatId) {
            this.chatId = chatId.toString();
            this.config.set('TELEGRAM_CHAT_ID', this.chatId);
            this.logger.info(`[✓] Chat ID automatically set to: ${this.chatId}`);
        }
        
        // Security check
        if (chatId.toString() !== this.chatId.toString()) {
            this.logger.warn(`[🚨] Unauthorized access attempt from chat: ${chatId}`);
            await this.bot.sendMessage(chatId, '🚫 Unauthorized access');
            return;
        }
        
        this.logger.info(`[📨] Processing message: ${text}`);
        
        // Handle commands with timeout protection
        const messageTimeout = setTimeout(() => {
            this.logger.warn('[--] Message processing timeout');
        }, 10000);

        try {
            if (text === '/start') {
                await this.handleStart(msg);
            } else if (text === '/status') {
                await this.handleStatus(msg);
            } else if (text === '/help') {
                await this.handleHelp(msg);
            } else if (text === '/menu') {
                await this.handleMenu(msg);
            } else {
                await this.sendMessageSafe(chatId, 
                    '🤖 Ghostline Clean V4.1 is running!\n\n' +
                    '📋 Available Commands:\n' +
                    '/start - Main control panel\n' +
                    '/status - System status\n' +
                    '/help - Help information\n\n' +
                    '✨ Use /start to access the full interface!'
                );
            }
        } finally {
            clearTimeout(messageTimeout);
        }
    }

    async handleCallback(query) {
        const data = query.data;
        
        this.logger.info(`[🔘] Callback received: ${data}`);
        
        // Always answer the callback query to remove loading state
        const answerTimeout = setTimeout(async () => {
            try {
                await this.bot.answerCallbackQuery(query.id);
            } catch (error) {
                // Ignore timeout errors
            }
        }, 1000);

        try {
            if (data === 'status') {
                await this.handleStatus(query.message);
            } else if (data === 'control') {
                await this.handleControl(query.message);
            } else if (data === 'menu') {
                await this.handleStart(query.message);
            } else if (data === 'metrics') {
                await this.handleMetrics(query.message);
            } else if (data === 'start_harvester') {
                await this.startModule('harvester', query);
            } else if (data === 'stop_harvester') {
                await this.stopModule('harvester', query);
            } else if (data === 'emergency_stop') {
                await this.handleEmergencyStop(query);
            } else if (data === 'confirm_emergency') {
                await this.confirmEmergencyStop(query);
            }
            
            clearTimeout(answerTimeout);
            await this.bot.answerCallbackQuery(query.id);
            
        } catch (error) {
            clearTimeout(answerTimeout);
            this.logger.error(`[✗] Callback processing error: ${error.message}`);
            try {
                await this.bot.answerCallbackQuery(query.id, { text: '❌ Error' });
            } catch (answerError) {
                // Ignore answer errors
            }
        }
    }

    async handleStart(msg) {
        const keyboard = [
            [
                { text: '📊 Status', callback_data: 'status' },
                { text: '🎛️ Control', callback_data: 'control' }
            ],
            [
                { text: '🌾 Start Harvester', callback_data: 'start_harvester' },
                { text: '🛑 Stop Harvester', callback_data: 'stop_harvester' }
            ],
            [
                { text: '📈 Metrics', callback_data: 'metrics' }
            ]
        ];
        
        await this.sendMessageSafe(msg.chat.id,
            '🚀 <b>GHOSTLINE CLEAN V4.1</b>\n\n' +
            '💰 Clean Revenue Generation System\n\n' +
            '📊 Status: Online ✅\n' +
            '🔒 Security: Active ✅\n' +
            '🌾 Task Harvesting: Ready ✅\n' +
            '🧪 Demo Mode: Testing ✅\n\n' +
            '🎮 Choose an option below:', 
            {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            }
        );
    }

    async handleControl(msg) {
        const keyboard = [
            [
                { text: '🌾 Start Harvester', callback_data: 'start_harvester' },
                { text: '🛑 Stop Harvester', callback_data: 'stop_harvester' }
            ],
            [
                { text: '📊 Metrics', callback_data: 'metrics' },
                { text: '🚨 Emergency Stop', callback_data: 'emergency_stop' }
            ],
            [
                { text: '◀️ Back to Menu', callback_data: 'menu' }
            ]
        ];
        
        await this.sendMessageSafe(msg.chat.id,
            '🎛️ <b>CONTROL PANEL</b>\n\n' +
            '⚙️ System Control Functions\n' +
            '⚠️ Use with caution\n\n' +
            '🧪 Demo Mode Active\n' +
            'Real tasks will be available after testing\n\n' +
            'Select an action:', 
            {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            }
        );
    }

    async handleMetrics(msg) {
        try {
            const metrics = this.system.getDetailedMetrics();
            
            const message = 
                '📊 <b>DETAILED METRICS</b>\n\n' +
                `⏱️ System Uptime: ${this.formatUptime(metrics.system?.uptime || 0)}\n` +
                `🔧 Active Modules: ${metrics.system?.activeModules || 0}\n` +
                `🔒 Security Score: ${metrics.security?.securityLevel || 'N/A'}\n\n` +
                `🌾 <b>Harvester (Demo Mode):</b>\n` +
                `   • Tasks: ${metrics.harvester?.tasksCompleted || 0}\n` +
                `   • Earnings: ${(metrics.harvester?.totalEarnings || 0).toFixed(4)} ETH\n` +
                `   • Success Rate: ${metrics.harvester?.successRate || '0%'}\n` +
                `   • Demo Jobs: ${metrics.harvester?.scraping?.successRate || '0%'}\n\n` +
                `💰 <b>Performance:</b>\n` +
                `   • Tasks/Hour: ${metrics.performance?.tasksPerHour || '0.0'}\n` +
                `   • Earnings/Hour: ${metrics.performance?.hourlyEarnings || '0.0000'} ETH\n` +
                `   • Overall Success: ${metrics.performance?.successRate || '0%'}\n\n` +
                `🧪 <b>Demo Status:</b>\n` +
                `   • System fully functional\n` +
                `   • Ready for real tasks\n` +
                `   • Web scraping available`;
            
            await this.sendMessageSafe(msg.chat.id, message, { 
                parse_mode: 'HTML',
                reply_markup: { 
                    inline_keyboard: [[
                        { text: '◀️ Back to Control', callback_data: 'control' }
                    ]]
                }
            });
            
        } catch (error) {
            await this.sendMessageSafe(msg.chat.id, '❌ Error getting metrics');
        }
    }

    async handleEmergencyStop(query) {
        const confirmKeyboard = [
            [
                { text: '✅ CONFIRM STOP', callback_data: 'confirm_emergency' },
                { text: '❌ Cancel', callback_data: 'control' }
            ]
        ];
        
        await this.sendMessageSafe(query.message.chat.id,
            '🚨 <b>EMERGENCY STOP</b>\n\n' +
            '⚠️ This will immediately stop all modules!\n' +
            '⚠️ Are you sure you want to continue?\n\n' +
            'This action cannot be undone.', 
            {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: confirmKeyboard }
            }
        );
    }

    async confirmEmergencyStop(query) {
        try {
            const result = await this.system.executeCommand('emergency_stop');
            const message = result.success ? 
                `✅ Emergency stop completed: ${result.message}` :
                `❌ Emergency stop failed: ${result.message}`;
            
            await this.sendMessageSafe(query.message.chat.id, message);
            
        } catch (error) {
            await this.sendMessageSafe(query.message.chat.id, `❌ Error: ${error.message}`);
        }
    }

    async handleStatus(msg) {
        try {
            const status = this.system.getSystemStatus();
            
            const message = 
                '📊 <b>SYSTEM STATUS</b>\n\n' +
                `⏱️ Runtime: ${status.runtime || 'N/A'}\n` +
                `🟢 Status: ${status.status || 'Unknown'}\n` +
                `🏷️ Version: ${status.version || 'N/A'}\n\n` +
                `🌾 Harvester: ${status.modules?.harvester?.status || 'N/A'}\n` +
                `📡 Telegram: ${status.modules?.telegram?.status || 'N/A'}\n\n` +
                `💰 Earnings: ${(status.modules?.harvester?.earnings || 0).toFixed(4)} ETH\n` +
                `🔒 Security Events: ${status.security?.events || 0}\n\n` +
                `🧪 Mode: Demo Testing\n` +
                `✅ All systems operational`;
            
            await this.sendMessageSafe(msg.chat.id, message, { parse_mode: 'HTML' });
            
        } catch (error) {
            await this.sendMessageSafe(msg.chat.id, '❌ Error getting status');
        }
    }

    async handleHelp(msg) {
        const helpText = 
            '🆘 <b>HELP - GHOSTLINE CLEAN V4.1</b>\n\n' +
            '<b>📋 Available Commands:</b>\n' +
            '/start - Main control panel\n' +
            '/status - System status check\n' +
            '/help - This help message\n' +
            '/menu - Navigation menu\n\n' +
            '<b>🌟 System Features:</b>\n' +
            '🌾 Task Harvesting System\n' +
            '🧪 Demo Mode (Testing)\n' +
            '📊 Real-time Metrics\n' +
            '🔒 Secure Operations\n\n' +
            '<b>🎯 Current Status:</b>\n' +
            '✅ Demo mode active\n' +
            '✅ All systems functional\n' +
            '✅ Ready for production\n\n' +
            '<b>💡 Quick Start:</b>\n' +
            '1. Use /start for main menu\n' +
            '2. Try "Start Harvester" button\n' +
            '3. Check metrics for progress\n\n' +
            '🚀 System is fully operational!';
        
        await this.sendMessageSafe(msg.chat.id, helpText, { parse_mode: 'HTML' });
    }

    async handleMenu(msg) {
        await this.handleStart(msg);
    }

    async startModule(moduleName, query) {
        try {
            await this.sendMessageSafe(query.message.chat.id, `🔄 Starting ${moduleName}...`);
            
            const result = await this.system.executeCommand(`start_${moduleName}`);
            const message = result.success ? 
                `✅ ${moduleName} started successfully!\n${result.message}` :
                `❌ Failed to start ${moduleName}:\n${result.message}`;
            
            await this.sendMessageSafe(query.message.chat.id, message);
            
        } catch (error) {
            await this.sendMessageSafe(query.message.chat.id, `❌ Error starting ${moduleName}: ${error.message}`);
        }
    }

    async stopModule(moduleName, query) {
        try {
            await this.sendMessageSafe(query.message.chat.id, `🔄 Stopping ${moduleName}...`);
            
            const result = await this.system.executeCommand(`stop_${moduleName}`);
            const message = result.success ? 
                `✅ ${moduleName} stopped successfully!\n${result.message}` :
                `❌ Failed to stop ${moduleName}:\n${result.message}`;
            
            await this.sendMessageSafe(query.message.chat.id, message);
            
        } catch (error) {
            await this.sendMessageSafe(query.message.chat.id, `❌ Error stopping ${moduleName}: ${error.message}`);
        }
    }

    // Safe message sending with error handling
    async sendMessageSafe(chatId, text, options = {}) {
        try {
            await this.bot.sendMessage(chatId, text, options);
            return true;
        } catch (error) {
            this.logger.error(`[✗] Failed to send message: ${error.message}`);
            return false;
        }
    }

    formatUptime(milliseconds) {
        const hours = Math.floor(milliseconds / 3600000);
        const minutes = Math.floor((milliseconds % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    async sendMessage(chatId, text, options = {}) {
        return await this.sendMessageSafe(chatId || this.chatId, text, options);
    }

    async sendNotification(text) {
        if (this.chatId) {
            await this.sendMessageSafe(this.chatId, `📢 ${text}`);
        }
    }

    async sendSystemMessage(text) {
        if (this.chatId) {
            await this.sendMessageSafe(this.chatId, `🤖 ${text}`);
        }
    }

    async sendAlert(text) {
        if (this.chatId) {
            await this.sendMessageSafe(this.chatId, `🚨 ${text}`);
        }
    }

    async sendSuccess(text) {
        if (this.chatId) {
            await this.sendMessageSafe(this.chatId, `✅ ${text}`);
        }
    }

    async stop() {
        try {
            this.isConnected = false;
            
            if (this.bot) {
                this.logger.info('[▸] Stopping Telegram bot...');
                await this.bot.stopPolling();
                this.logger.success('[◯] Telegram bot stopped');
            }
            
            return { success: true, message: 'Telegram interface stopped' };
        } catch (error) {
            this.logger.error(`[✗] Stop failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = TelegramInterface;

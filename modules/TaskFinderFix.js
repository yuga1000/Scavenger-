// ФИКС СИСТЕМЫ ПОИСКА ЗАДАНИЙ + АНТИПАЛЕВО V1.0
// File: modules/TaskFinderFix.js

const https = require('https');

class TaskFinderFix {
    constructor(system) {
        this.system = system;
        this.logger = system.logger.create('TASK_FINDER');
        this.config = system.config;
        
        // АНТИПАЛЕВО настройки
        this.antiDetection = {
            delays: {
                min: 30000,      // 30 сек минимум между запросами
                max: 180000,     // 3 минуты максимум
                afterEmpty: 300000,  // 5 минут если нет заданий
                afterError: 600000   // 10 минут если ошибка
            },
            
            userAgents: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ],
            
            requestsPerHour: 20,     // Максимум 20 запросов в час
            requestCount: 0,
            lastHourReset: Date.now(),
            
            breakTime: {
                enabled: true,
                minBreak: 1800000,   // 30 минут перерыв
                maxBreak: 3600000,   // 1 час перерыв
                afterRequests: 10,   // Перерыв после 10 запросов
                currentCount: 0
            }
        };
        
        this.logger.info('[🔍] TaskFinderFix с антипалево защитой загружен');
    }

    // ИСПРАВЛЕННЫЙ МЕТОД ПОИСКА ЗАДАНИЙ
    async findAvailableTasks() {
        try {
            // Проверка антипалево лимитов
            if (!this.canMakeRequest()) {
                const waitTime = this.getWaitTime();
                this.logger.info(`[🛡️] Антипалево: ждем ${Math.round(waitTime/60000)} минут`);
                return [];
            }

            this.logger.info('[🔍] Поиск заданий с исправленными эндпоинтами...');
            
            // Пробуем несколько стратегий поиска
            const strategies = [
                () => this.searchWorkerCampaigns(),      // Кампании для работников
                () => this.searchBasicCampaigns(),       // Базовые кампании
                () => this.searchPublicTasks(),          // Публичные задания
                () => this.fallbackWebScraping()        // Фоллбек на скрейпинг
            ];
            
            for (const strategy of strategies) {
                try {
                    const tasks = await strategy();
                    if (tasks && tasks.length > 0) {
                        this.updateRequestStats(tasks.length);
                        return tasks;
                    }
                } catch (error) {
                    this.logger.warn(`[--] Стратегия не сработала: ${error.message}`);
                }
                
                // Антипалево задержка между стратегиями
                await this.antiDetectionDelay(5000, 15000);
            }
            
            this.updateRequestStats(0);
            return [];
            
        } catch (error) {
            this.logger.error(`[✗] Ошибка поиска заданий: ${error.message}`);
            this.updateRequestStats(0, true);
            return [];
        }
    }

    // ПОИСК КАМПАНИЙ ДЛЯ РАБОТНИКОВ (ИСПРАВЛЕННЫЙ)
    async searchWorkerCampaigns() {
        this.logger.info('[📋] Поиск worker campaigns...');
        
        // Правильные эндпоинты для работников
        const endpoints = [
            '/basic-campaigns/available',           // Доступные базовые кампании
            '/hire-group-campaigns/public',         // Публичные HG кампании  
            '/campaigns/worker-view',               // Вид работника
            '/worker/available-campaigns'           // Кампании для работника
        ];
        
        for (const endpoint of endpoints) {
            try {
                const tasks = await this.makeApiRequest(endpoint, 'GET');
                if (tasks && tasks.length > 0) {
                    this.logger.success(`[✓] Найдено ${tasks.length} заданий через ${endpoint}`);
                    return this.normalizeTasks(tasks);
                }
            } catch (error) {
                this.logger.debug(`[--] ${endpoint}: ${error.message}`);
            }
        }
        
        return [];
    }

    // ПОИСК БАЗОВЫХ КАМПАНИЙ
    async searchBasicCampaigns() {
        this.logger.info('[📋] Поиск basic campaigns...');
        
        try {
            // Используем правильные параметры для работника
            const params = {
                status: 'running',           // Только активные
                worker_view: true,           // Вид работника
                available_only: true,       // Только доступные
                limit: 50                    // Лимит результатов
            };
            
            const queryString = Object.entries(params)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');
            
            const tasks = await this.makeApiRequest(`/basic-campaigns?${queryString}`, 'GET');
            
            if (tasks && tasks.length > 0) {
                this.logger.success(`[✓] Найдено ${tasks.length} базовых кампаний`);
                return this.normalizeTasks(tasks);
            }
            
        } catch (error) {
            this.logger.warn(`[--] Базовые кампании: ${error.message}`);
        }
        
        return [];
    }

    // ПОИСК ПУБЛИЧНЫХ ЗАДАНИЙ
    async searchPublicTasks() {
        this.logger.info('[📋] Поиск публичных заданий...');
        
        try {
            // Альтернативные эндпоинты
            const endpoints = [
                '/public/campaigns',
                '/tasks/available', 
                '/jobs/browse',
                '/campaigns/browse'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await this.makeApiRequest(endpoint, 'GET');
                    if (response && response.data && response.data.length > 0) {
                        this.logger.success(`[✓] Найдено через ${endpoint}: ${response.data.length} заданий`);
                        return this.normalizeTasks(response.data);
                    }
                } catch (error) {
                    this.logger.debug(`[--] ${endpoint}: ${error.message}`);
                }
                
                await this.antiDetectionDelay(2000, 5000);
            }
            
        } catch (error) {
            this.logger.warn(`[--] Публичные задания: ${error.message}`);
        }
        
        return [];
    }

    // УЛУЧШЕННЫЙ API ЗАПРОС
    async makeApiRequest(endpoint, method = 'GET', data = null) {
        const platform = this.system.harvester?.platforms?.microworkers;
        if (!platform || !platform.config?.apiKey) {
            throw new Error('Microworkers API key не настроен');
        }
        
        // Антипалево заголовки
        const randomUA = this.antiDetection.userAgents[
            Math.floor(Math.random() * this.antiDetection.userAgents.length)
        ];
        
        const headers = {
            'Authorization': `Bearer ${platform.config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': randomUA,
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        };
        
        const url = `${platform.baseUrl}${endpoint}`;
        
        try {
            const response = await this.makeHttpRequest(method, url, data, headers);
            
            if (response.statusCode >= 200 && response.statusCode < 300) {
                const responseData = JSON.parse(response.body);
                return responseData.items || responseData.data || responseData.campaigns || responseData;
            } else {
                throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
            }
            
        } catch (error) {
            this.logger.debug(`[--] API запрос ${endpoint}: ${error.message}`);
            throw error;
        }
    }

    // АНТИПАЛЕВО ПРОВЕРКИ
    canMakeRequest() {
        const now = Date.now();
        
        // Сброс почасового счетчика
        if (now - this.antiDetection.lastHourReset > 3600000) {
            this.antiDetection.requestCount = 0;
            this.antiDetection.lastHourReset = now;
            this.antiDetection.breakTime.currentCount = 0;
        }
        
        // Проверка почасового лимита
        if (this.antiDetection.requestCount >= this.antiDetection.requestsPerHour) {
            this.logger.warn('[🛡️] Достигнут почасовой лимит запросов');
            return false;
        }
        
        // Проверка перерыва
        if (this.antiDetection.breakTime.enabled && 
            this.antiDetection.breakTime.currentCount >= this.antiDetection.breakTime.afterRequests) {
            this.logger.info('[🛡️] Время для перерыва - защита от палева');
            this.startBreak();
            return false;
        }
        
        return true;
    }

    getWaitTime() {
        const { delays } = this.antiDetection;
        
        if (this.antiDetection.breakTime.currentCount >= this.antiDetection.breakTime.afterRequests) {
            return Math.random() * (delays.afterError - delays.afterEmpty) + delays.afterEmpty;
        }
        
        return Math.random() * (delays.max - delays.min) + delays.min;
    }

    async startBreak() {
        const { breakTime } = this.antiDetection;
        const breakDuration = Math.random() * (breakTime.maxBreak - breakTime.minBreak) + breakTime.minBreak;
        
        this.logger.info(`[😴] Антипалево перерыв: ${Math.round(breakDuration/60000)} минут`);
        
        // Сброс счетчика после перерыва
        setTimeout(() => {
            breakTime.currentCount = 0;
            this.logger.info('[🟢] Перерыв завершен, можно продолжать');
        }, breakDuration);
    }

    async antiDetectionDelay(min = 5000, max = 15000) {
        const delay = Math.random() * (max - min) + min;
        this.logger.debug(`[⏱️] Антипалево задержка: ${Math.round(delay/1000)}с`);
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    updateRequestStats(tasksFound, error = false) {
        this.antiDetection.requestCount++;
        this.antiDetection.breakTime.currentCount++;
        
        if (error) {
            this.logger.warn('[📊] Запрос завершился с ошибкой');
        } else if (tasksFound === 0) {
            this.logger.info('[📊] Задания не найдены');
        } else {
            this.logger.success(`[📊] Найдено ${tasksFound} заданий`);
        }
        
        const stats = `Запросов: ${this.antiDetection.requestCount}/${this.antiDetection.requestsPerHour}`;
        this.logger.debug(`[📊] ${stats}`);
    }

    // НОРМАЛИЗАЦИЯ ЗАДАНИЙ
    normalizeTasks(rawTasks) {
        if (!Array.isArray(rawTasks)) {
            return [];
        }
        
        return rawTasks.map(task => {
            return {
                id: `mw_${task.id || task.campaign_id || Math.random().toString(36)}`,
                originalId: task.id || task.campaign_id,
                title: task.title || task.name || 'Microworkers Task',
                description: task.description || task.brief || task.instructions || '',
                category: this.categorizeTask(task),
                reward: this.parseReward(task.payment || task.reward || task.paymentPerTask || 0),
                estimatedTime: parseInt(task.minutesToFinish) * 60 || 300,
                instructions: task.instructions || task.description || '',
                requirements: task.requirements || [],
                deadline: task.deadline ? new Date(task.deadline) : new Date(Date.now() + 24 * 60 * 60 * 1000),
                maxWorkers: task.availablePositions || task.max_workers || 1,
                availableSlots: task.availablePositions || 1,
                createdAt: new Date(),
                attempts: 0,
                maxAttempts: 3,
                platform: 'microworkers',
                scraped: false,
                apiFound: true,
                originalData: task
            };
        }).filter(task => task.reward > 0.01); // Только задания с достойной оплатой
    }

    categorizeTask(task) {
        const text = (task.title + ' ' + task.description + ' ' + task.instructions).toLowerCase();
        
        const categories = {
            'search_tasks': ['search', 'google', 'bing', 'find'],
            'website_review': ['website', 'visit', 'review', 'browse'],
            'social_content': ['social', 'facebook', 'twitter', 'instagram', 'like', 'follow'],
            'video_tasks': ['youtube', 'video', 'watch'],
            'data_entry': ['data', 'entry', 'typing', 'form'],
            'survey': ['survey', 'questionnaire', 'poll'],
            'creative_tasks': ['write', 'create', 'design', 'content']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    parseReward(reward) {
        if (typeof reward === 'number') return reward;
        if (typeof reward === 'string') {
            const parsed = parseFloat(reward.replace(/[^0-9.]/g, ''));
            return isNaN(parsed) ? 0.01 : parsed;
        }
        return 0.01;
    }

    // HTTP ЗАПРОС С АНТИПАЛЕВО
    async makeHttpRequest(method, url, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: headers,
                timeout: 30000  // 30 секунд таймаут
            };
            
            if (data && method !== 'GET') {
                const postData = typeof data === 'string' ? data : JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }
            
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Запрос превысил таймаут'));
            });
            
            if (data && method !== 'GET') {
                const postData = typeof data === 'string' ? data : JSON.stringify(data);
                req.write(postData);
            }
            
            req.end();
        });
    }

    // ФОЛЛБЕК НА ВЕБ СКРЕЙПИНГ
    async fallbackWebScraping() {
        this.logger.info('[🕷️] Фоллбек на веб скрейпинг...');
        
        // Используем существующий MicroworkersScraper если доступен
        if (this.system.harvester?.microworkersScraper) {
            try {
                const scrapedTasks = await this.system.harvester.microworkersScraper.getAvailableJobs();
                if (scrapedTasks && scrapedTasks.length > 0) {
                    this.logger.success(`[✓] Скрейпинг нашел ${scrapedTasks.length} заданий`);
                    return scrapedTasks;
                }
            } catch (error) {
                this.logger.warn(`[--] Скрейпинг не сработал: ${error.message}`);
            }
        }
        
        return [];
    }

    // СТАТИСТИКА АНТИПАЛЕВО
    getAntiDetectionStats() {
        return {
            requestsThisHour: this.antiDetection.requestCount,
            maxRequestsPerHour: this.antiDetection.requestsPerHour,
            requestsUntilBreak: this.antiDetection.breakTime.afterRequests - this.antiDetection.breakTime.currentCount,
            breakTimeEnabled: this.antiDetection.breakTime.enabled,
            canMakeRequest: this.canMakeRequest(),
            nextResetTime: new Date(this.antiDetection.lastHourReset + 3600000).toISOString()
        };
    }
}

module.exports = TaskFinderFix;

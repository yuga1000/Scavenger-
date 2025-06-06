// TaskFinderFix V2.1 - Debug Enhanced Version
// File: modules/TaskFinderFix.js

const https = require('https');
const OpenAI = require('openai');

class TaskFinderFix {
    constructor(system) {
        this.system = system;
        this.logger = system.logger.create('TASK_FINDER');
        this.config = system.config;
        
        // AI Integration
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        }) : null;
        
        // Multi-Source Configuration with DEBUG
        this.sources = {
            microworkers: {
                enabled: false,
                priority: 1,
                endpoints: [
                    // ✅ НОВЫЕ 2025 ЭНДПОИНТЫ
                    '/ttv-api/available-campaigns',
                    '/worker-api/campaigns/browse',
                    '/public-api/v3/jobs',
                    '/api/campaigns/open',
                    // ✅ СТАРЫЕ ДЛЯ СРАВНЕНИЯ
                    '/ttv-api/campaigns/available',
                    '/api/v2/worker/campaigns',
                    '/basic-campaigns',
                    '/hire-group-campaigns/browse',
                    '/public-api/jobs',
                    '/worker/dashboard/campaigns'
                ],
                baseUrl: 'https://ttv.microworkers.com',
                baseUrlAlt: 'https://ttv.microworkers.com/api/v2',
                authMethods: [
                    // ✅ НОВЫЕ 2025 МЕТОДЫ АВТОРИЗАЦИИ
                    (key) => ({ 'MW-Token': key }),
                    (key) => ({ 'X-Worker-Key': key }),
                    (key) => ({ 'Authorization': `Token ${key}` }),
                    (key) => ({ 'X-MW-Key': key }),
                    // ✅ СТАРЫЕ МЕТОДЫ
                    (key) => ({ 'MicroworkersApiKey': key }),
                    (key) => ({ 'X-API-Key': key }),
                    (key) => ({ 'Authorization': `Bearer ${key}` }),
                    (key) => ({ 'MW-API-Key': key }),
                    (key) => ({ 'API-Secret': key })
                ],
                webScraping: {
                    url: 'https://microworkers.com/jobs',
                    selectors: [
                        '.campaign-item',
                        '.job-listing', 
                        '.task-card',
                        '.available-job'
                    ]
                }
            },
            
            clickworker: {
                enabled: true,
                priority: 2,
                endpoints: [
                    '/jobs/available',
                    '/workplace/jobs',
                    '/api/tasks/open'
                ],
                baseUrl: 'https://workplace.clickworker.com/api/v1',
                authMethods: [
                    (key) => ({ 'Authorization': `Bearer ${key}` }),
                    (key) => ({ 'X-API-Key': key })
                ]
            },
            
            spare5: {
                enabled: true,
                priority: 3,
                endpoints: [
                    '/tasks/available',
                    '/fives/open',
                    '/marketplace/tasks'
                ],
                baseUrl: 'https://api.spare5.com/v2',
                authMethods: [
                    (key) => ({ 'Authorization': `Bearer ${key}` }),
                    (key) => ({ 'X-API-Key': key })
                ]
            }
        };
        
        // Enhanced Anti-Detection System
        this.antiDetection = {
            userAgents: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ],
            
            requestLimits: {
                perHour: 60,
                perMinute: 8,
                burstLimit: 3,
                cooldownAfter: 15
            },
            
            timingPatterns: {
                minDelay: 8000,
                maxDelay: 25000,
                errorDelay: 60000,
                emptyDelay: 120000,
                humanVariation: 0.3
            },
            
            currentStats: {
                requestsThisHour: 0,
                requestsThisMinute: 0,
                lastRequestTime: 0,
                consecutiveRequests: 0,
                lastHourReset: Date.now(),
                lastMinuteReset: Date.now()
            }
        };
        
        // AI Task Analysis
        this.aiAnalysis = {
            enabled: !!this.openai,
            categories: [
                'high_automation',
                'medium_automation',
                'low_automation',
                'not_automatable',
                'suspicious',
                'excellent_profit',
                'good_profit',
                'poor_profit'
            ]
        };
        
        // Intelligence & Circuit Breakers
        this.intelligence = {
            taskCache: new Map(),
            sourceHealth: new Map(),
            marketTrends: new Map(),
            optimalTiming: {
                hourly: new Array(24).fill(0),
                daily: new Array(7).fill(0),
                trending: []
            },
            learning: {
                successfulSources: new Map(),
                taskTypePreferences: new Map(),
                timePatterns: new Map()
            }
        };
        
        this.circuitBreakers = new Map();
        this.initializeCircuitBreakers();
        
        this.logger.info('[🚀] TaskFinderFix V2.1 with DEBUG initialized');
        this.logger.info(`[🧠] AI Analysis: ${this.aiAnalysis.enabled ? 'ENABLED' : 'DISABLED'}`);
        this.logger.info(`[🎯] Sources: ${Object.keys(this.sources).filter(s => this.sources[s].enabled).length} enabled`);
    }
    
    initializeCircuitBreakers() {
        Object.keys(this.sources).forEach(sourceName => {
            this.circuitBreakers.set(sourceName, {
                state: 'CLOSED',
                failureCount: 0,
                lastFailureTime: 0,
                successCount: 0,
                threshold: 5,
                timeout: 300000,
                halfOpenMaxCalls: 3
            });
        });
    }
    
    async findAvailableTasks() {
        try {
            this.logger.info('[🔍] Starting enhanced task hunt with DEBUG...');
            
            // Anti-detection check
            if (!this.canMakeRequest()) {
                const waitTime = this.getOptimalWaitTime();
                this.logger.info(`[🛡️] Anti-detection: waiting ${Math.round(waitTime/1000)}s`);
                return [];
            }
            
            const allTasks = [];
            const sourcePriority = this.getSourcePriority();
            
            this.logger.info(`[🎯] Source priority: ${sourcePriority.join(' → ')}`);
            
            // Hunt from multiple sources
            for (const sourceName of sourcePriority) {
                try {
                    this.logger.info(`[🔍] Hunting from ${sourceName}...`);
                    const tasks = await this.huntFromSource(sourceName);
                    
                    if (tasks && tasks.length > 0) {
                        this.logger.success(`[✓] ${sourceName}: Found ${tasks.length} tasks`);
                        allTasks.push(...tasks);
                        this.updateSourceHealth(sourceName, true, tasks.length);
                    } else {
                        this.logger.warn(`[--] ${sourceName}: No tasks found`);
                        this.updateSourceHealth(sourceName, false);
                    }
                    
                    // Anti-detection delay between sources
                    await this.smartDelay(3000, 8000);
                    
                } catch (error) {
                    this.logger.error(`[✗] ${sourceName} failed: ${error.message}`);
                    this.updateSourceHealth(sourceName, false);
                }
            }
            
            if (allTasks.length === 0) {
                this.logger.warn('[❌] No tasks found across all sources');
                return [];
            }
            
            // AI Analysis & Intelligent Filtering
            const analyzedTasks = await this.performAIAnalysis(allTasks);
            
            // Smart Deduplication & Ranking
            const uniqueTasks = this.deduplicateAndRank(analyzedTasks);
            
            this.logger.success(`[🎯] Final result: ${uniqueTasks.length} high-quality tasks (${allTasks.length} total found)`);
            
            return uniqueTasks;
            
        } catch (error) {
            this.logger.error(`[✗] TaskFinderFix error: ${error.message}`);
            return [];
        }
    }
    
    async huntFromSource(sourceName) {
        const source = this.sources[sourceName];
        if (!source?.enabled) {
            this.logger.debug(`[--] ${sourceName}: Disabled`);
            return [];
        }
        
        // Circuit breaker check
        const breaker = this.circuitBreakers.get(sourceName);
        if (breaker.state === 'OPEN') {
            if (Date.now() - breaker.lastFailureTime > breaker.timeout) {
                breaker.state = 'HALF_OPEN';
                breaker.successCount = 0;
                this.logger.info(`[🔄] ${sourceName}: Circuit breaker HALF_OPEN`);
            } else {
                this.logger.debug(`[🚫] ${sourceName}: Circuit breaker OPEN, skipping`);
                return [];
            }
        }
        
        try {
            let tasks = [];
            
            // Try API endpoints first
            if (source.endpoints) {
                this.logger.info(`[🔍] ${sourceName}: Trying API endpoints...`);
                tasks = await this.huntFromAPI(sourceName, source);
            }
            
            // Fallback to web scraping if API fails
            if (tasks.length === 0 && source.webScraping) {
                this.logger.info(`[🕷️] ${sourceName}: Fallback to web scraping...`);
                tasks = await this.huntFromWeb(sourceName, source);
            }
            
            // Circuit breaker success
            if (tasks.length > 0) {
                breaker.failureCount = 0;
                breaker.successCount++;
                if (breaker.state === 'HALF_OPEN' && breaker.successCount >= breaker.halfOpenMaxCalls) {
                    breaker.state = 'CLOSED';
                    this.logger.info(`[✅] ${sourceName}: Circuit breaker CLOSED`);
                }
            }
            
            return tasks;
            
        } catch (error) {
            // Circuit breaker failure
            breaker.failureCount++;
            breaker.lastFailureTime = Date.now();
            
            if (breaker.failureCount >= breaker.threshold) {
                breaker.state = 'OPEN';
                this.logger.warn(`[🚫] ${sourceName}: Circuit breaker OPEN after ${breaker.failureCount} failures`);
            }
            
            throw error;
        }
    }
    
    async huntFromAPI(sourceName, source) {
        const tasks = [];
        const apiKey = this.getApiKey(sourceName);
        
        if (!apiKey) {
            this.logger.warn(`[--] ${sourceName}: No API key configured`);
            return [];
        }
        
        this.logger.info(`[🔑] ${sourceName}: Using API key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
        
        // Try different base URLs if available
        const baseUrls = [source.baseUrl];
        if (source.baseUrlAlt) baseUrls.push(source.baseUrlAlt);
        
        for (const baseUrl of baseUrls) {
            this.logger.info(`[🌐] ${sourceName}: Trying base URL: ${baseUrl}`);
            
            for (const endpoint of source.endpoints) {
                // Skip if we already found enough tasks
                if (tasks.length > 10) break;
                
                this.logger.info(`[📡] ${sourceName}: Testing endpoint: ${endpoint}`);
                
                for (const authMethod of source.authMethods || []) {
                    try {
                        const headers = {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'User-Agent': this.getRandomUserAgent(),
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Cache-Control': 'no-cache',
                            'DNT': '1',
                            'Connection': 'keep-alive',
                            'Sec-Fetch-Dest': 'empty',
                            'Sec-Fetch-Mode': 'cors',
                            'Sec-Fetch-Site': 'same-origin',
                            ...authMethod(apiKey)
                        };
                        
                        // ✅ ДЕТАЛЬНАЯ ОТЛАДКА ЗАПРОСА
                        this.logger.info(`[🔍] ${sourceName}: Making request to ${baseUrl}${endpoint}`);
                        this.logger.info(`[🔍] ${sourceName}: Auth headers:`, JSON.stringify(authMethod(apiKey)));
                        this.logger.info(`[🔍] ${sourceName}: Full headers:`, JSON.stringify(headers, null, 2));
                        
                        const response = await this.makeRequest('GET', baseUrl + endpoint, null, headers);
                        
                        // ✅ ДЕТАЛЬНАЯ ОТЛАДКА ОТВЕТА
                        this.logger.info(`[📥] ${sourceName}${endpoint}: Status ${response.statusCode}`);
                        this.logger.info(`[📥] ${sourceName}${endpoint}: Response headers:`, JSON.stringify(response.headers));
                        this.logger.info(`[📥] ${sourceName}${endpoint}: Response body (first 1000 chars):`, response.body.substring(0, 1000));
                        
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            try {
                                const data = JSON.parse(response.body);
                                this.logger.info(`[✅] ${sourceName}${endpoint}: Successfully parsed JSON`);
                                this.logger.info(`[📊] ${sourceName}${endpoint}: Data structure:`, JSON.stringify(Object.keys(data)));
                                
                                const extractedTasks = this.extractTasksFromResponse(data, sourceName);
                                
                                if (extractedTasks.length > 0) {
                                    this.logger.success(`[🎯] ${sourceName}${endpoint}: Extracted ${extractedTasks.length} tasks`);
                                    tasks.push(...extractedTasks);
                                    break; // Success with this auth method
                                } else {
                                    this.logger.warn(`[--] ${sourceName}${endpoint}: No tasks in response`);
                                }
                                
                            } catch (parseError) {
                                this.logger.error(`[❌] ${sourceName}${endpoint}: JSON parse error: ${parseError.message}`);
                                this.logger.info(`[📝] ${sourceName}${endpoint}: Raw response: ${response.body}`);
                            }
                        } else if (response.statusCode === 401) {
                            this.logger.warn(`[🚫] ${sourceName}${endpoint}: Unauthorized (401) - Invalid credentials`);
                        } else if (response.statusCode === 403) {
                            this.logger.warn(`[🚫] ${sourceName}${endpoint}: Forbidden (403) - Access denied`);
                        } else if (response.statusCode === 404) {
                            this.logger.warn(`[🚫] ${sourceName}${endpoint}: Not Found (404) - Endpoint may not exist`);
                        } else if (response.statusCode === 429) {
                            this.logger.warn(`[🚫] ${sourceName}${endpoint}: Rate Limited (429) - Too many requests`);
                        } else if (response.statusCode >= 500) {
                            this.logger.warn(`[🚫] ${sourceName}${endpoint}: Server Error (${response.statusCode})`);
                        } else {
                            this.logger.warn(`[🚫] ${sourceName}${endpoint}: Unexpected status ${response.statusCode}`);
                        }
                        
                    } catch (error) {
                        this.logger.error(`[❌] ${sourceName}${endpoint}: Request failed: ${error.message}`);
                        if (error.code) {
                            this.logger.info(`[📝] ${sourceName}${endpoint}: Error code: ${error.code}`);
                        }
                    }
                    
                    // Anti-detection delay between auth methods
                    await this.smartDelay(2000, 5000);
                }
                
                // Anti-detection delay between endpoints
                await this.smartDelay(3000, 8000);
            }
        }
        
        return tasks;
    }
    
    async huntFromWeb(sourceName, source) {
        try {
            this.logger.info(`[🕷️] ${sourceName}: Starting web scraping from ${source.webScraping.url}`);
            
            const headers = {
                'User-Agent': this.getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            };
            
            this.logger.info(`[🔍] ${sourceName}: Web scraping headers:`, JSON.stringify(headers));
            
            const response = await this.makeRequest('GET', source.webScraping.url, null, headers);
            
            this.logger.info(`[📥] ${sourceName}: Web scraping status: ${response.statusCode}`);
            this.logger.info(`[📥] ${sourceName}: Page size: ${response.body.length} chars`);
            
            if (response.statusCode === 200) {
                const tasks = this.parseHTMLForTasks(response.body, source.webScraping.selectors, sourceName);
                this.logger.success(`[✅] ${sourceName}: Web scraping found ${tasks.length} tasks`);
                return tasks;
            } else {
                this.logger.warn(`[--] ${sourceName}: Web scraping failed with status ${response.statusCode}`);
            }
            
            return [];
            
        } catch (error) {
            this.logger.error(`[❌] ${sourceName}: Web scraping error: ${error.message}`);
            return [];
        }
    }
    
    extractTasksFromResponse(data, sourceName) {
        this.logger.info(`[📊] ${sourceName}: Analyzing response structure...`);
        
        // Handle different response formats
        let items = [];
        
        if (Array.isArray(data)) {
            items = data;
            this.logger.info(`[📊] ${sourceName}: Response is array with ${items.length} items`);
        } else if (data.items && Array.isArray(data.items)) {
            items = data.items;
            this.logger.info(`[📊] ${sourceName}: Found items array with ${items.length} items`);
        } else if (data.data && Array.isArray(data.data)) {
            items = data.data;
            this.logger.info(`[📊] ${sourceName}: Found data array with ${items.length} items`);
        } else if (data.campaigns && Array.isArray(data.campaigns)) {
            items = data.campaigns;
            this.logger.info(`[📊] ${sourceName}: Found campaigns array with ${items.length} items`);
        } else if (data.tasks && Array.isArray(data.tasks)) {
            items = data.tasks;
            this.logger.info(`[📊] ${sourceName}: Found tasks array with ${items.length} items`);
        } else if (data.jobs && Array.isArray(data.jobs)) {
            items = data.jobs;
            this.logger.info(`[📊] ${sourceName}: Found jobs array with ${items.length} items`);
        } else {
            this.logger.warn(`[--] ${sourceName}: No recognizable array found in response`);
            this.logger.info(`[📝] ${sourceName}: Available keys:`, Object.keys(data));
            return [];
        }
        
        if (items.length === 0) {
            this.logger.warn(`[--] ${sourceName}: Array is empty`);
            return [];
        }
        
        this.logger.info(`[📊] ${sourceName}: Sample item structure:`, JSON.stringify(Object.keys(items[0] || {})));
        
        const normalizedTasks = items.map((item, index) => {
            try {
                const task = this.normalizeTask(item, sourceName);
                if (task) {
                    this.logger.debug(`[✓] ${sourceName}: Normalized task ${index + 1}: ${task.title}`);
                    return task;
                }
            } catch (error) {
                this.logger.warn(`[--] ${sourceName}: Failed to normalize item ${index + 1}: ${error.message}`);
            }
            return null;
        }).filter(Boolean);
        
        this.logger.info(`[📊] ${sourceName}: Successfully normalized ${normalizedTasks.length}/${items.length} tasks`);
        
        return normalizedTasks;
    }
    
    parseHTMLForTasks(html, selectors, sourceName) {
        const tasks = [];
        
        this.logger.info(`[🔍] ${sourceName}: Parsing HTML (${html.length} chars) with selectors: ${selectors.join(', ')}`);
        
        selectors.forEach(selector => {
            const classMatch = selector.replace('.', '');
            const regex = new RegExp(`class="[^"]*${classMatch}[^"]*"[^>]*>([\\s\\S]*?)</[^>]+>`, 'gi');
            let match;
            let count = 0;
            
            while ((match = regex.exec(html)) !== null && count < 50) {
                const taskHtml = match[1];
                const task = this.extractTaskFromHTML(taskHtml, sourceName);
                if (task) {
                    tasks.push(task);
                    count++;
                }
            }
            
            this.logger.info(`[📊] ${sourceName}: Selector "${selector}" found ${count} tasks`);
        });
        
        return tasks;
    }
    
    extractTaskFromHTML(html, sourceName) {
        // Extract task data from HTML fragment
        const titleMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|<a[^>]*>([^<]+)<\/a>/i);
        const priceMatch = html.match(/\$(\d+\.?\d*)/);
        const descMatch = html.match(/<p[^>]*>([^<]+)<\/p>/i);
        
        if (!titleMatch && !priceMatch) return null;
        
        return {
            id: `${sourceName}_web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: titleMatch?.[1] || titleMatch?.[2] || 'Web Scraped Task',
            description: descMatch?.[1] || '',
            reward: priceMatch ? parseFloat(priceMatch[1]) : 0.05,
            estimatedTime: 300,
            source: sourceName,
            sourceType: 'web_scraping',
            platform: sourceName,
            scrapedAt: new Date().toISOString(),
            raw: html.substring(0, 200)
        };
    }
    
    normalizeTask(rawTask, sourceName) {
        try {
            this.logger.debug(`[🔧] ${sourceName}: Normalizing task with keys: ${Object.keys(rawTask).join(', ')}`);
            
            const task = {
                id: `${sourceName}_${rawTask.id || rawTask.campaign_id || Math.random().toString(36)}`,
                originalId: rawTask.id || rawTask.campaign_id,
                title: rawTask.title || rawTask.name || rawTask.campaign_title || 'Task',
                description: rawTask.description || rawTask.brief || rawTask.instructions || '',
                category: this.categorizeTask(rawTask),
                reward: this.parseReward(rawTask.payment || rawTask.reward || rawTask.paymentPerTask || rawTask.amount),
                estimatedTime: this.parseTime(rawTask.minutesToFinish || rawTask.duration || rawTask.estimated_time),
                instructions: rawTask.instructions || rawTask.description || '',
                requirements: rawTask.requirements || rawTask.qualifications || [],
                deadline: this.parseDeadline(rawTask.deadline || rawTask.expires_at),
                maxWorkers: rawTask.availablePositions || rawTask.max_workers || 1,
                availableSlots: rawTask.availablePositions || rawTask.remaining_slots || 1,
                createdAt: new Date(),
                platform: sourceName,
                source: sourceName,
                sourceType: 'api',
                apiFound: true,
                scraped: false,
                originalData: rawTask,
                
                // AI analysis will be added later
                aiAnalysis: null,
                smartScore: 0,
                automationPotential: 0,
                profitabilityScore: 0
            };
            
            // Basic validation
            if (!task.title || task.reward <= 0 || task.title.length < 3) {
                this.logger.debug(`[--] ${sourceName}: Task failed validation: title="${task.title}", reward=${task.reward}`);
                return null;
            }
            
            this.logger.debug(`[✓] ${sourceName}: Task normalized: "${task.title}" - $${task.reward}`);
            return task;
            
        } catch (error) {
            this.logger.warn(`[--] ${sourceName}: Task normalization failed: ${error.message}`);
            return null;
        }
    }
    
    async performAIAnalysis(tasks) {
        if (!this.aiAnalysis.enabled || tasks.length === 0) {
            this.logger.info('[🧠] AI analysis disabled, using rule-based scoring');
            return tasks.map(task => ({
                ...task,
                smartScore: this.calculateRuleBasedScore(task),
                aiAnalysis: { method: 'rule_based' }
            }));
        }
        
        this.logger.info(`[🧠] Performing AI analysis on ${tasks.length} tasks...`);
        
        const analyzedTasks = [];
        
        // Analyze in batches to avoid rate limits
        for (let i = 0; i < tasks.length; i += 5) {
            const batch = tasks.slice(i, i + 5);
            const batchResults = await Promise.allSettled(
                batch.map(task => this.analyzeTaskWithAI(task))
            );
            
            batchResults.forEach((result, index) => {
                const task = batch[index];
                if (result.status === 'fulfilled') {
                    analyzedTasks.push({
                        ...task,
                        ...result.value
                    });
                } else {
                    // Fallback to rule-based
                    analyzedTasks.push({
                        ...task,
                        smartScore: this.calculateRuleBasedScore(task),
                        aiAnalysis: { method: 'rule_based', error: result.reason?.message }
                    });
                }
            });
            
            // Rate limiting between batches
            if (i + 5 < tasks.length) {
                await this.smartDelay(2000, 4000);
            }
        }
        
        return analyzedTasks;
    }
    
    async analyzeTaskWithAI(task) {
        try {
            const prompt = `Analyze this task for automation potential and profitability:
Title: ${task.title}
Description: ${task.description}
Payment: ${task.reward}
Time: ${Math.round(task.estimatedTime / 60)} minutes

Rate on scales 1-10:
- Automation potential (1=impossible, 10=fully automatable)
- Profitability (1=very poor, 10=excellent) 
- Legitimacy (1=likely scam, 10=definitely real)
- Complexity (1=very simple, 10=very complex)

Respond in JSON format: {"automation": X, "profitability": Y, "legitimacy": Z, "complexity": W, "category": "category_name", "reasoning": "brief explanation"}`;
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 200,
                temperature: 0.3
            });
            
            const analysisText = response.choices[0].message.content;
            const analysis = JSON.parse(analysisText);
            
            // Calculate composite smart score
            const smartScore = Math.round(
                (analysis.automation * 0.3 + 
                 analysis.profitability * 0.3 + 
                 analysis.legitimacy * 0.25 + 
                 (11 - analysis.complexity) * 0.15) * 10
            );
            
            return {
                smartScore: Math.min(100, Math.max(0, smartScore)),
                automationPotential: analysis.automation * 10,
                profitabilityScore: analysis.profitability * 10,
                aiAnalysis: {
                    method: 'gpt4',
                    ...analysis,
                    analyzedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            this.logger.debug(`[--] AI analysis failed for task ${task.id}: ${error.message}`);
            throw error;
        }
    }
    
    calculateRuleBasedScore(task) {
        let score = 50; // Base score
        
        // Reward scoring (0-25 points)
        const hourlyRate = task.reward / (task.estimatedTime / 3600);
        if (hourlyRate >= 15) score += 25;
        else if (hourlyRate >= 10) score += 20;
        else if (hourlyRate >= 5) score += 15;
        else if (hourlyRate >= 3) score += 10;
        else if (hourlyRate >= 1) score += 5;
        
        // Category scoring (0-20 points)
        const categoryScores = {
            'search_tasks': 20,
            'website_review': 18,
            'social_content': 15,
            'data_entry': 14,
            'survey': 12,
            'video_tasks': 10,
            'creative_tasks': 8,
            'email_tasks': 5
        };
        score += categoryScores[task.category] || 10;
        
        // Source reliability (0-15 points)
        const sourceScores = {
            'microworkers': 15,
            'clickworker': 12,
            'spare5': 10
        };
        score += sourceScores[task.platform] || 5;
        
        // Bonus for good indicators (0-10 points)
        if (task.title.length > 20) score += 2;
        if (task.description.length > 50) score += 3;
        if (task.availableSlots > 1) score += 2;
        if (task.sourceType === 'api') score += 3;
        
        return Math.min(100, Math.max(0, score));
    }
    
    deduplicateAndRank(tasks) {
        // Advanced deduplication
        const unique = new Map();
        
        tasks.forEach(task => {
            const key = this.generateTaskFingerprint(task);
            const existing = unique.get(key);
            
            if (!existing || task.smartScore > existing.smartScore) {
                unique.set(key, task);
            }
        });
        
        // Convert back to array and sort by smart score
        return Array.from(unique.values())
            .sort((a, b) => b.smartScore - a.smartScore)
            .slice(0, 50); // Top 50 tasks
    }
    
    generateTaskFingerprint(task) {
        // Create fingerprint for deduplication
        const title = task.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const reward = Math.round(task.reward * 100); // Cents
        const time = Math.round(task.estimatedTime / 60); // Minutes
        
        return `${title.substring(0, 20)}_${reward}_${time}`;
    }
    
    // Utility methods
    canMakeRequest() {
        const now = Date.now();
        const stats = this.antiDetection.currentStats;
        
        // Reset counters
        if (now - stats.lastHourReset > 3600000) {
            stats.requestsThisHour = 0;
            stats.lastHourReset = now;
        }
        
        if (now - stats.lastMinuteReset > 60000) {
            stats.requestsThisMinute = 0;
            stats.lastMinuteReset = now;
        }
        
        // Check limits
        const limits = this.antiDetection.requestLimits;
        if (stats.requestsThisHour >= limits.perHour) return false;
        if (stats.requestsThisMinute >= limits.perMinute) return false;
        if (stats.consecutiveRequests >= limits.burstLimit) {
            if (now - stats.lastRequestTime < 30000) return false; // 30s cooldown
            stats.consecutiveRequests = 0;
        }
        
        return true;
    }
    
    getOptimalWaitTime() {
        const patterns = this.antiDetection.timingPatterns;
        const base = Math.random() * (patterns.maxDelay - patterns.minDelay) + patterns.minDelay;
        const variation = base * patterns.humanVariation * (Math.random() - 0.5);
        return Math.round(base + variation);
    }
    
    async smartDelay(min, max) {
        const delay = Math.random() * (max - min) + min;
        const humanDelay = delay * (1 + (Math.random() - 0.5) * 0.2); // ±10% variation
        await new Promise(resolve => setTimeout(resolve, humanDelay));
    }
    
    getRandomUserAgent() {
        return this.antiDetection.userAgents[
            Math.floor(Math.random() * this.antiDetection.userAgents.length)
        ];
    }
    
    getSourcePriority() {
        // Sort sources by priority and health
        return Object.keys(this.sources)
            .filter(name => this.sources[name].enabled)
            .sort((a, b) => {
                const healthA = this.intelligence.sourceHealth.get(a)?.score || 50;
                const healthB = this.intelligence.sourceHealth.get(b)?.score || 50;
                const priorityA = this.sources[a].priority || 99;
                const priorityB = this.sources[b].priority || 99;
                
                // Combine health and priority
                const scoreA = healthA + (10 - priorityA) * 5;
                const scoreB = healthB + (10 - priorityB) * 5;
                
                return scoreB - scoreA;
            });
    }
    
    updateSourceHealth(sourceName, success, taskCount = 0) {
        const health = this.intelligence.sourceHealth.get(sourceName) || {
            score: 50,
            successes: 0,
            failures: 0,
            totalTasks: 0,
            lastUpdate: Date.now()
        };
        
        if (success) {
            health.successes++;
            health.totalTasks += taskCount;
            health.score = Math.min(100, health.score + 2);
        } else {
            health.failures++;
            health.score = Math.max(0, health.score - 5);
        }
        
        health.lastUpdate = Date.now();
        this.intelligence.sourceHealth.set(sourceName, health);
    }
    
    updateMarketIntelligence(tasks) {
        // Update market trends and timing patterns
        const hour = new Date().getHours();
        const day = new Date().getDay();
        
        this.intelligence.optimalTiming.hourly[hour] += tasks.length;
        this.intelligence.optimalTiming.daily[day] += tasks.length;
        
        // Track successful task types
        tasks.forEach(task => {
            const key = `${task.platform}_${task.category}`;
            const current = this.intelligence.learning.successfulSources.get(key) || 0;
            this.intelligence.learning.successfulSources.set(key, current + 1);
        });
    }
    
    getApiKey(sourceName) {
        const keyMappings = {
            'microworkers': 'MICROWORKERS_API_KEY',
            'clickworker': 'CLICKWORKER_API_KEY',
            'spare5': 'SPARE5_API_KEY'
        };
        
        return this.config.get(keyMappings[sourceName]);
    }
    
    categorizeTask(task) {
        const text = (task.title + ' ' + task.description + ' ' + task.instructions).toLowerCase();
        
        const categories = {
            'search_tasks': ['search', 'google', 'bing', 'find', 'lookup'],
            'website_review': ['website', 'visit', 'review', 'browse', 'check site'],
            'social_content': ['social', 'facebook', 'twitter', 'instagram', 'like', 'follow', 'comment'],
            'video_tasks': ['youtube', 'video', 'watch', 'view'],
            'data_entry': ['data', 'entry', 'typing', 'form', 'input'],
            'survey': ['survey', 'questionnaire', 'poll', 'feedback'],
            'creative_tasks': ['write', 'create', 'design', 'content', 'article'],
            'email_tasks': ['email', 'signup', 'register', 'verification'],
            'app_tasks': ['app', 'mobile', 'download', 'install'],
            'research_tasks': ['research', 'analyze', 'investigate']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }
    
    parseReward(reward) {
        if (typeof reward === 'number') return Math.max(0.01, reward);
        if (typeof reward === 'string') {
            const parsed = parseFloat(reward.replace(/[^0-9.]/g, ''));
            return isNaN(parsed) ? 0.01 : Math.max(0.01, parsed);
        }
        if (reward && typeof reward === 'object' && reward.amount) {
            return Math.max(0.01, parseFloat(reward.amount));
        }
        return 0.01;
    }
    
    parseTime(time) {
        if (typeof time === 'number') return Math.max(60, time * 60); // Convert minutes to seconds
        if (typeof time === 'string') {
            const parsed = parseInt(time);
            return isNaN(parsed) ? 300 : Math.max(60, parsed * 60);
        }
        return 300; // Default 5 minutes
    }
    
    parseDeadline(deadline) {
        if (!deadline) return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default
        
        try {
            const parsed = new Date(deadline);
            return isNaN(parsed.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : parsed;
        } catch {
            return new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
    }
    
    async makeRequest(method, url, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    ...headers
                },
                timeout: 30000
            };
            
            if (data && method !== 'GET') {
                const postData = typeof data === 'string' ? data : JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }
            
            const protocol = urlObj.protocol === 'https:' ? https : require('http');
            const req = protocol.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    // Update request statistics
                    this.antiDetection.currentStats.requestsThisHour++;
                    this.antiDetection.currentStats.requestsThisMinute++;
                    this.antiDetection.currentStats.consecutiveRequests++;
                    this.antiDetection.currentStats.lastRequestTime = Date.now();
                    
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
                reject(new Error('Request timeout'));
            });
            
            if (data && method !== 'GET') {
                const postData = typeof data === 'string' ? data : JSON.stringify(data);
                req.write(postData);
            }
            
            req.end();
        });
    }
    
    // Legacy compatibility methods (for smooth transition)
    async searchWorkerCampaigns() {
        return await this.huntFromSource('microworkers', this.sources.microworkers);
    }
    
    async searchBasicCampaigns() {
        // Try basic campaigns endpoint specifically
        const source = this.sources.microworkers;
        const tasks = [];
        
        try {
            const apiKey = this.getApiKey('microworkers');
            if (!apiKey) return [];
            
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': this.getRandomUserAgent(),
                'X-API-Key': apiKey
            };
            
            this.logger.info(`[🔍] Basic campaigns: Making request with key ${apiKey.substring(0, 8)}...`);
            
            const response = await this.makeRequest('GET', source.baseUrlAlt + '/basic-campaigns', null, headers);
            
            this.logger.info(`[📥] Basic campaigns response: ${response.statusCode} - ${response.body.substring(0, 500)}`);
            
            if (response.statusCode === 200) {
                const data = JSON.parse(response.body);
                return this.extractTasksFromResponse(data, 'microworkers');
            }
            
        } catch (error) {
            this.logger.debug(`[--] Basic campaigns search failed: ${error.message}`);
        }
        
        return [];
    }
    
    async searchPublicTasks() {
        // Try public endpoints across all sources
        const allTasks = [];
        
        for (const [sourceName, source] of Object.entries(this.sources)) {
            if (!source.enabled) continue;
            
            try {
                const publicEndpoints = source.endpoints.filter(ep => 
                    ep.includes('public') || ep.includes('browse') || ep.includes('available')
                );
                
                for (const endpoint of publicEndpoints) {
                    const apiKey = this.getApiKey(sourceName);
                    if (!apiKey) continue;
                    
                    const headers = {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': this.getRandomUserAgent(),
                        'Authorization': `Bearer ${apiKey}`
                    };
                    
                    this.logger.info(`[🔍] Public search: ${sourceName}${endpoint}`);
                    
                    const response = await this.makeRequest('GET', source.baseUrl + endpoint, null, headers);
                    
                    this.logger.info(`[📥] Public search response: ${response.statusCode} - ${response.body.substring(0, 300)}`);
                    
                    if (response.statusCode === 200) {
                        const data = JSON.parse(response.body);
                        const tasks = this.extractTasksFromResponse(data, sourceName);
                        allTasks.push(...tasks);
                    }
                    
                    await this.smartDelay(2000, 4000);
                }
                
            } catch (error) {
                this.logger.debug(`[--] Public search failed for ${sourceName}: ${error.message}`);
            }
        }
        
        return allTasks;
    }
    
    async fallbackWebScraping() {
        // Enhanced web scraping fallback
        if (!this.system.harvester?.microworkersScraper) {
            this.logger.debug('[--] Web scraper not available');
            return [];
        }
        
        try {
            this.logger.info('[🕷️] Attempting enhanced web scraping fallback...');
            const scrapedTasks = await this.system.harvester.microworkersScraper.getAvailableJobs();
            
            if (scrapedTasks && scrapedTasks.length > 0) {
                this.logger.success(`[✓] Web scraping found ${scrapedTasks.length} tasks`);
                return scrapedTasks.map(task => ({
                    ...task,
                    smartScore: this.calculateRuleBasedScore(task),
                    automationPotential: this.assessAutomationPotential(task)
                }));
            }
            
        } catch (error) {
            this.logger.warn(`[--] Web scraping fallback failed: ${error.message}`);
        }
        
        return [];
    }
    
    assessAutomationPotential(task) {
        const text = (task.title + ' ' + task.description + ' ' + task.instructions).toLowerCase();
        
        // High automation keywords
        const highAuto = ['search', 'visit', 'click', 'view', 'screenshot', 'browse'];
        const mediumAuto = ['comment', 'review', 'rating', 'survey', 'form'];
        const lowAuto = ['write', 'create', 'design', 'translate'];
        const noAuto = ['call', 'phone', 'speak', 'record', 'video', 'selfie'];
        
        if (noAuto.some(keyword => text.includes(keyword))) return 0;
        if (highAuto.some(keyword => text.includes(keyword))) return 90;
        if (mediumAuto.some(keyword => text.includes(keyword))) return 60;
        if (lowAuto.some(keyword => text.includes(keyword))) return 30;
        
        return 50; // Default moderate potential
    }
    
    // Compatibility methods for HarvesterCore
    getAntiDetectionStats() {
        return {
            requestsThisHour: this.antiDetection.currentStats.requestsThisHour,
            maxRequestsPerHour: this.antiDetection.requestLimits.perHour,
            requestsThisMinute: this.antiDetection.currentStats.requestsThisMinute,
            maxRequestsPerMinute: this.antiDetection.requestLimits.perMinute,
            canMakeRequest: this.canMakeRequest(),
            nextHourReset: new Date(this.antiDetection.currentStats.lastHourReset + 3600000).toISOString(),
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            sourceHealth: Object.fromEntries(this.intelligence.sourceHealth),
            activeSources: Object.keys(this.sources).filter(s => this.sources[s].enabled)
        };
    }
    
    getWaitTime() {
        return this.getOptimalWaitTime();
    }
}

module.exports = TaskFinderFix;

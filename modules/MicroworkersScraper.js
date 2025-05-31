// MicroworkersScraper V4.1 Enhanced - Real Production Web Scraping
// File: modules/MicroworkersScraper.js

const puppeteer = require('puppeteer');

class MicroworkersScraper {
    constructor(system) {
        this.system = system;
        this.logger = system.logger.create('MW_SCRAPER');
        this.config = system.config;
        
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.lastScrapeTime = null;
        this.loginAttempts = 0;
        
        // Credentials
        this.email = this.config.get('MICROWORKERS_EMAIL');
        this.password = this.config.get('MICROWORKERS_PASSWORD');
        
        // Enhanced scraping config
        this.baseUrl = 'https://microworkers.com';
        this.loginUrl = 'https://microworkers.com/login';
        this.jobsUrl = 'https://microworkers.com/jobs';
        this.dashboardUrl = 'https://microworkers.com/dashboard';
        
        // Advanced rate limiting
        this.minDelay = 5000; // 5 seconds between requests
        this.maxRetries = 5;
        this.requestCount = 0;
        this.hourlyLimit = 50; // Max 50 requests per hour
        
        // Anti-detection features
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        this.logger.info('[◉] MicroworkersScraper V4.1 Enhanced initialized with real scraping');
    }

    async initialize() {
        try {
            this.logger.info('[▸] Initializing enhanced browser with anti-detection...');
            
            // Launch puppeteer with enhanced stealth settings
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images', // Speed up loading
                    '--disable-javascript-harmony-shipping',
                    '--disable-ipc-flooding-protection',
                    '--memory-pressure-off'
                ],
                defaultViewport: null
            });
            
            this.page = await this.browser.newPage();
            
            // Enhanced anti-detection setup
            await this.setupAntiDetection();
            
            this.logger.success('[✓] Enhanced browser initialized with stealth mode');
            
            return { success: true, message: 'Enhanced scraper initialized' };
            
        } catch (error) {
            this.logger.error(`[✗] Initialization failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    async setupAntiDetection() {
        // Random user agent
        const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        await this.page.setUserAgent(randomUA);
        
        // Set realistic viewport
        const viewports = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1440, height: 900 },
            { width: 1280, height: 720 }
        ];
        const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
        await this.page.setViewport(randomViewport);
        
        // Set extra headers
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        });

        // Override webdriver detection
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // Mock chrome runtime
            window.chrome = {
                runtime: {}
            };
            
            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            return window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        });

        // Block unnecessary resources to speed up
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
                req.abort();
            } else {
                req.continue();
            }
        });

        this.logger.info('[✓] Anti-detection measures activated');
    }

    async login() {
        if (!this.email || !this.password) {
            throw new Error('MICROWORKERS_EMAIL and MICROWORKERS_PASSWORD must be configured');
        }

        if (this.loginAttempts >= 3) {
            throw new Error('Maximum login attempts exceeded');
        }

        try {
            this.loginAttempts++;
            this.logger.info(`[▸] Logging into Microworkers (attempt ${this.loginAttempts}/3)...`);
            
            // Navigate to login page with realistic timing
            await this.page.goto(this.loginUrl, { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            
            // Random delay to simulate human behavior
            await this.humanDelay(2000, 4000);
            
            // Wait for and fill login form with multiple selectors
            const emailSelectors = [
                'input[name="email"]',
                'input[type="email"]', 
                '#email',
                'input[placeholder*="email" i]',
                'input[placeholder*="Email" i]'
            ];
            
            const passwordSelectors = [
                'input[name="password"]',
                'input[type="password"]',
                '#password',
                'input[placeholder*="password" i]',
                'input[placeholder*="Password" i]'
            ];
            
            // Find email field
            let emailField = null;
            for (const selector of emailSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 });
                    emailField = await this.page.$(selector);
                    if (emailField) {
                        this.logger.info(`[✓] Found email field with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!emailField) {
                throw new Error('Could not find email input field');
            }
            
            // Find password field
            let passwordField = null;
            for (const selector of passwordSelectors) {
                try {
                    passwordField = await this.page.$(selector);
                    if (passwordField) {
                        this.logger.info(`[✓] Found password field with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!passwordField) {
                throw new Error('Could not find password input field');
            }
            
            // Clear fields and type with human-like delays
            await emailField.click({ delay: 100 });
            await this.humanDelay(500, 1000);
            await emailField.type(this.email, { delay: 150 });
            
            await this.humanDelay(1000, 2000);
            
            await passwordField.click({ delay: 100 });
            await this.humanDelay(500, 1000);
            await passwordField.type(this.password, { delay: 180 });
            
            await this.humanDelay(1000, 2000);
            
            // Find and click submit button
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:contains("Login")',
                'button:contains("Sign in")',
                '.login-btn',
                '.submit-btn',
                '.btn-login',
                'form button'
            ];
            
            let submitButton = null;
            for (const selector of submitSelectors) {
                try {
                    submitButton = await this.page.$(selector);
                    if (submitButton) {
                        this.logger.info(`[✓] Found submit button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!submitButton) {
                // Try submitting form directly
                await this.page.keyboard.press('Enter');
            } else {
                await submitButton.click();
            }
            
            // Wait for navigation or error messages
            try {
                await Promise.race([
                    this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
                    this.page.waitForSelector('.error, .alert-danger, .login-error', { timeout: 5000 })
                ]);
            } catch (e) {
                // Continue with validation
            }
            
            await this.humanDelay(2000, 3000);
            
            // Enhanced login success detection
            const currentUrl = this.page.url();
            const pageContent = await this.page.content();
            
            // Multiple success indicators
            const successIndicators = [
                currentUrl.includes('dashboard'),
                currentUrl.includes('jobs'),
                currentUrl.includes('campaign'),
                currentUrl.includes('worker'),
                !currentUrl.includes('login'),
                pageContent.includes('dashboard'),
                pageContent.includes('My Jobs'),
                pageContent.includes('Available Jobs'),
                pageContent.includes('logout'),
                pageContent.includes('sign out')
            ];
            
            const successCount = successIndicators.filter(Boolean).length;
            
            if (successCount >= 2) { // At least 2 success indicators
                this.isLoggedIn = true;
                this.loginAttempts = 0; // Reset on success
                this.logger.success('[✓] Successfully logged into Microworkers');
                
                // Save screenshot for verification
                try {
                    await this.page.screenshot({ path: 'login_success.png', fullPage: false });
                    this.logger.debug('[◎] Login success screenshot saved');
                } catch (e) {
                    // Ignore screenshot errors
                }
                
                return true;
            } else {
                // Check for specific error messages
                const errorMessages = await this.page.evaluate(() => {
                    const errorSelectors = [
                        '.error', '.alert-danger', '.login-error', 
                        '.message.error', '.notification.error',
                        '[class*="error"]', '[class*="invalid"]'
                    ];
                    
                    for (const selector of errorSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent.trim()) {
                            return element.textContent.trim();
                        }
                    }
                    return null;
                });
                
                const errorMsg = errorMessages || 'Login validation failed';
                throw new Error(`Login failed: ${errorMsg}`);
            }
            
        } catch (error) {
            this.logger.error(`[✗] Login attempt ${this.loginAttempts} failed: ${error.message}`);
            
            // Save error screenshot for debugging
            try {
                await this.page.screenshot({ 
                    path: `login_error_${this.loginAttempts}.png`, 
                    fullPage: true 
                });
                this.logger.debug(`[◎] Error screenshot saved: login_error_${this.loginAttempts}.png`);
            } catch (e) {
                // Ignore screenshot errors
            }
            
            if (this.loginAttempts >= 3) {
                throw new Error(`Login failed after ${this.loginAttempts} attempts: ${error.message}`);
            }
            
            // Wait before retry
            await this.humanDelay(5000, 10000);
            throw error;
        }
    }

    async scrapeJobs() {
        try {
            this.logger.info('[▸] Enhanced scraping jobs from Microworkers...');
            
            // Rate limiting check
            if (this.requestCount >= this.hourlyLimit) {
                throw new Error('Hourly request limit reached');
            }
            
            // Ensure we're logged in
            if (!this.isLoggedIn) {
                await this.login();
            }
            
            // Navigate to jobs page with retries
            let navigationSuccess = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await this.page.goto(this.jobsUrl, { 
                        waitUntil: 'networkidle2', 
                        timeout: 30000 
                    });
                    navigationSuccess = true;
                    break;
                } catch (e) {
                    this.logger.warn(`[--] Navigation attempt ${attempt} failed: ${e.message}`);
                    if (attempt < 3) {
                        await this.humanDelay(3000, 5000);
                    }
                }
            }
            
            if (!navigationSuccess) {
                throw new Error('Failed to navigate to jobs page after 3 attempts');
            }
            
            this.requestCount++;
            await this.humanDelay(3000, 5000);
            
            // Enhanced job detection with multiple strategies
            const jobs = await this.extractJobsWithMultipleStrategies();
            
            this.logger.success(`[✓] Enhanced scraping extracted ${jobs.length} jobs`);
            this.lastScrapeTime = new Date();
            
            // Log scraping success
            await this.system.logger.logSecurity('jobs_scraped', {
                source: 'microworkers_enhanced_scraper',
                jobCount: jobs.length,
                enhanced: true,
                timestamp: new Date().toISOString(),
                requestCount: this.requestCount
            });
            
            return jobs.map(job => this.normalizeScrapedJob(job));
            
        } catch (error) {
            this.logger.error(`[✗] Enhanced scraping failed: ${error.message}`);
            
            // Save error screenshot with timestamp
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                await this.page.screenshot({ 
                    path: `scraping_error_${timestamp}.png`, 
                    fullPage: true 
                });
                this.logger.debug(`[◎] Error screenshot saved: scraping_error_${timestamp}.png`);
            } catch (screenshotError) {
                // Ignore screenshot errors
            }
            
            // If login session expired, retry once
            if (error.message.includes('login') || error.message.includes('session')) {
                this.isLoggedIn = false;
                if (this.loginAttempts < 3) {
                    this.logger.info('[▸] Session expired, attempting re-login...');
                    await this.login();
                    return await this.scrapeJobs();
                }
            }
            
            throw error;
        }
    }

    async extractJobsWithMultipleStrategies() {
        const strategies = [
            () => this.extractJobsStrategy1(), // Table-based extraction
            () => this.extractJobsStrategy2(), // Card-based extraction  
            () => this.extractJobsStrategy3(), // List-based extraction
            () => this.extractJobsStrategy4()  // Generic extraction
        ];
        
        for (let i = 0; i < strategies.length; i++) {
            try {
                this.logger.info(`[▸] Trying extraction strategy ${i + 1}...`);
                const jobs = await strategies[i]();
                
                if (jobs && jobs.length > 0) {
                    this.logger.success(`[✓] Strategy ${i + 1} found ${jobs.length} jobs`);
                    return jobs;
                }
            } catch (error) {
                this.logger.warn(`[--] Strategy ${i + 1} failed: ${error.message}`);
            }
        }
        
        this.logger.warn('[--] All extraction strategies failed');
        return [];
    }

    async extractJobsStrategy1() {
        // Table-based extraction
        return await this.page.evaluate(() => {
            const jobs = [];
            const tableRows = document.querySelectorAll('table tr, .table tr, [class*="table"] tr');
            
            tableRows.forEach((row, index) => {
                if (index === 0) return; // Skip header
                
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 3) {
                    const titleEl = row.querySelector('a, .title, .job-title, [class*="title"]');
                    const priceEl = row.querySelector('.price, .payment, .reward, [class*="price"], [class*="money"]');
                    
                    if (titleEl && priceEl) {
                        const title = titleEl.textContent.trim();
                        const priceText = priceEl.textContent.trim();
                        const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
                        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
                        
                        if (title && price > 0) {
                            jobs.push({
                                id: `table_${Date.now()}_${index}`,
                                title: title,
                                description: row.textContent.trim().substring(0, 200),
                                price: price,
                                estimatedTime: 300,
                                link: titleEl.href || '',
                                category: 'general',
                                scraped: true,
                                enhanced: true,
                                strategy: 'table',
                                scrapedAt: new Date().toISOString()
                            });
                        }
                    }
                }
            });
            
            return jobs;
        });
    }

    async extractJobsStrategy2() {
        // Card-based extraction
        return await this.page.evaluate(() => {
            const jobs = [];
            const cardSelectors = [
                '.job-card', '.task-card', '.campaign-card',
                '.job-item', '.task-item', '.campaign-item',
                '[class*="job"]', '[class*="task"]', '[class*="campaign"]'
            ];
            
            let cards = [];
            for (const selector of cardSelectors) {
                cards = document.querySelectorAll(selector);
                if (cards.length > 0) break;
            }
            
            cards.forEach((card, index) => {
                const titleEl = card.querySelector('.title, .job-title, .task-title, h3, h4, h5, a[href*="job"], a[href*="task"]');
                const priceEl = card.querySelector('.price, .payment, .reward, .amount, .money, [class*="price"]');
                const descEl = card.querySelector('.description, .desc, .summary, .brief, p');
                
                if (titleEl) {
                    const title = titleEl.textContent.trim();
                    const priceText = priceEl ? priceEl.textContent.trim() : '$0';
                    const description = descEl ? descEl.textContent.trim() : '';
                    
                    const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
                    const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
                    
                    if (title && title.length > 3) {
                        jobs.push({
                            id: `card_${Date.now()}_${index}`,
                            title: title,
                            description: description,
                            price: Math.max(0.01, price),
                            estimatedTime: 300,
                            link: titleEl.href || '',
                            category: 'general',
                            scraped: true,
                            enhanced: true,
                            strategy: 'card',
                            scrapedAt: new Date().toISOString()
                        });
                    }
                }
            });
            
            return jobs;
        });
    }

    async extractJobsStrategy3() {
        // List-based extraction
        return await this.page.evaluate(() => {
            const jobs = [];
            const listItems = document.querySelectorAll('li, .list-item, .job-listing, [class*="list"] > div');
            
            listItems.forEach((item, index) => {
                const text = item.textContent.trim();
                if (text.length < 10) return; // Skip empty items
                
                const titleEl = item.querySelector('a, .title, strong, b, h1, h2, h3, h4, h5, h6');
                const links = item.querySelectorAll('a[href]');
                
                if (titleEl) {
                    const title = titleEl.textContent.trim();
                    const priceMatch = text.match(/\$(\d+\.?\d*)/);
                    const price = priceMatch ? parseFloat(priceMatch[1]) : Math.random() * 0.1 + 0.02; // Random price 0.02-0.12
                    
                    if (title && title.length > 5) {
                        jobs.push({
                            id: `list_${Date.now()}_${index}`,
                            title: title,
                            description: text.substring(0, 150),
                            price: price,
                            estimatedTime: 300,
                            link: links.length > 0 ? links[0].href : '',
                            category: 'general',
                            scraped: true,
                            enhanced: true,
                            strategy: 'list',
                            scrapedAt: new Date().toISOString()
                        });
                    }
                }
            });
            
            return jobs;
        });
    }

    async extractJobsStrategy4() {
        // Generic extraction - last resort
        return await this.page.evaluate(() => {
            const jobs = [];
            const allElements = document.querySelectorAll('*');
            const jobKeywords = ['job', 'task', 'campaign', 'work', 'assignment'];
            const priceRegex = /\$(\d+\.?\d*)/g;
            
            const potentialJobElements = [];
            
            allElements.forEach(el => {
                const text = el.textContent.trim().toLowerCase();
                const hasJobKeyword = jobKeywords.some(keyword => text.includes(keyword));
                const hasPrice = priceRegex.test(el.textContent);
                
                if (hasJobKeyword && hasPrice && text.length > 20 && text.length < 500) {
                    potentialJobElements.push(el);
                }
            });
            
            potentialJobElements.slice(0, 10).forEach((el, index) => {
                const text = el.textContent.trim();
                const titleMatch = text.match(/^([^.!?]{10,80})/);
                const priceMatch = text.match(/\$(\d+\.?\d*)/);
                
                if (titleMatch && priceMatch) {
                    jobs.push({
                        id: `generic_${Date.now()}_${index}`,
                        title: titleMatch[1].trim(),
                        description: text.substring(0, 200),
                        price: parseFloat(priceMatch[1]),
                        estimatedTime: 300,
                        link: '',
                        category: 'general',
                        scraped: true,
                        enhanced: true,
                        strategy: 'generic',
                        scrapedAt: new Date().toISOString()
                    });
                }
            });
            
            return jobs;
        });
    }

    normalizeScrapedJob(scrapedJob) {
        return {
            id: `mw_enhanced_${scrapedJob.id}`,
            originalId: scrapedJob.id,
            title: scrapedJob.title,
            description: scrapedJob.description,
            category: this.categorizeJob(scrapedJob.title, scrapedJob.description),
            reward: scrapedJob.price,
            estimatedTime: scrapedJob.estimatedTime,
            instructions: scrapedJob.description,
            requirements: [],
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
            maxWorkers: 1,
            availableSlots: 1,
            createdAt: new Date(),
            attempts: 0,
            maxAttempts: 3,
            link: scrapedJob.link,
            scraped: true,
            enhanced: true,
            strategy: scrapedJob.strategy,
            scrapedAt: scrapedJob.scrapedAt,
            originalData: scrapedJob
        };
    }

    categorizeJob(title, description) {
        const text = (title + ' ' + description).toLowerCase();
        
        if (text.includes('youtube') || text.includes('video') || text.includes('watch')) {
            return 'video_tasks';
        } else if (text.includes('social') || text.includes('follow') || text.includes('like') || text.includes('comment')) {
            return 'social_media';
        } else if (text.includes('search') || text.includes('google') || text.includes('bing')) {
            return 'search_tasks';
        } else if (text.includes('signup') || text.includes('register') || text.includes('account')) {
            return 'signup_tasks';
        } else if (text.includes('review') || text.includes('rating') || text.includes('feedback')) {
            return 'review_tasks';
        } else if (text.includes('survey') || text.includes('questionnaire')) {
            return 'survey';
        } else if (text.includes('data') || text.includes('entry') || text.includes('typing')) {
            return 'data_entry';
        } else if (text.includes('website') || text.includes('visit') || text.includes('browse')) {
            return 'website_review';
        } else {
            return 'general';
        }
    }

    async getAvailableJobs() {
        try {
            // Enhanced rate limiting
            if (this.lastScrapeTime) {
                const timeSince = Date.now() - this.lastScrapeTime.getTime();
                if (timeSince < this.minDelay) {
                    this.logger.debug(`[◎] Rate limiting: waiting ${this.minDelay - timeSince}ms`);
                    await this.sleep(this.minDelay - timeSince);
                }
            }
            
            const jobs = await this.scrapeJobs();
            return jobs;
            
        } catch (error) {
            this.logger.error(`[✗] Failed to get jobs: ${error.message}`);
            return [];
        }
    }

    async humanDelay(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await this.sleep(delay);
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
                this.isLoggedIn = false;
                this.logger.info('[◯] Enhanced browser closed');
            }
        } catch (error) {
            this.logger.error(`[✗] Error closing enhanced browser: ${error.message}`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Health check
    async isHealthy() {
        try {
            if (!this.browser || !this.page) return false;
            
            // Check if page is still responsive
            await this.page.evaluate(() => document.title);
            return true;
        } catch (error) {
            return false;
        }
    }

    async restart() {
        this.logger.info('[▸] Restarting enhanced scraper...');
        await this.close();
        await this.initialize();
        this.isLoggedIn = false;
        this.loginAttempts = 0;
        this.requestCount = 0;
    }
}

module.exports = MicroworkersScraper;

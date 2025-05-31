// MicroworkersScraper V4.1 Clean - Enhanced Web Scraping Module
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
        
        // Credentials
        this.email = this.config.get('MICROWORKERS_EMAIL');
        this.password = this.config.get('MICROWORKERS_PASSWORD');
        
        // Scraping config
        this.baseUrl = 'https://microworkers.com';
        this.loginUrl = 'https://microworkers.com/login';
        this.jobsUrl = 'https://microworkers.com/jobs';
        
        // Rate limiting
        this.minDelay = 3000; // 3 seconds between requests
        this.maxRetries = 3;
        
        this.logger.info('[◉] MicroworkersScraper V4.1 Clean initialized');
    }

    async initialize() {
        try {
            this.logger.info('[▸] Initializing enhanced browser...');
            
            // Launch puppeteer browser with enhanced settings
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
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            
            this.page = await this.browser.newPage();
            
            // Set realistic user agent and headers
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await this.page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9'
            });
            
            // Set viewport
            await this.page.setViewport({ width: 1366, height: 768 });
            
            this.logger.success('[✓] Enhanced browser initialized');
            
            return { success: true, message: 'Enhanced scraper initialized' };
            
        } catch (error) {
            this.logger.error(`[✗] Initialization failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    async login() {
        if (!this.email || !this.password) {
            throw new Error('MICROWORKERS_EMAIL and MICROWORKERS_PASSWORD must be configured');
        }

        try {
            this.logger.info('[▸] Logging into Microworkers...');
            
            // Navigate to login page
            await this.page.goto(this.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Wait for login form
            await this.page.waitForSelector('input[name="email"], input[type="email"], #email', { timeout: 10000 });
            
            // Fill login form - try different selectors
            const emailSelector = await this.page.$('input[name="email"]') || 
                                  await this.page.$('input[type="email"]') || 
                                  await this.page.$('#email');
            
            const passwordSelector = await this.page.$('input[name="password"]') || 
                                    await this.page.$('input[type="password"]') || 
                                    await this.page.$('#password');
            
            if (emailSelector && passwordSelector) {
                await emailSelector.type(this.email);
                await passwordSelector.type(this.password);
            } else {
                throw new Error('Could not find login form fields');
            }
            
            // Submit form
            const submitButton = await this.page.$('button[type="submit"]') || 
                                await this.page.$('input[type="submit"]') ||
                                await this.page.$('.login-btn, .submit-btn');
            
            if (submitButton) {
                await Promise.all([
                    submitButton.click(),
                    this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
                ]);
            } else {
                throw new Error('Could not find submit button');
            }
            
            // Check if login successful
            const currentUrl = this.page.url();
            if (currentUrl.includes('dashboard') || currentUrl.includes('jobs') || 
                currentUrl.includes('campaign') || !currentUrl.includes('login')) {
                this.isLoggedIn = true;
                this.logger.success('[✓] Successfully logged into Microworkers');
                return true;
            } else {
                // Check for error messages
                const errorMessage = await this.page.$eval('.error, .alert-danger, .login-error', 
                    el => el.textContent).catch(() => 'Unknown login error');
                throw new Error(`Login failed: ${errorMessage}`);
            }
            
        } catch (error) {
            this.logger.error(`[✗] Login failed: ${error.message}`);
            throw error;
        }
    }

    async scrapeJobs() {
        try {
            this.logger.info('[▸] Enhanced scraping jobs from Microworkers...');
            
            // Ensure we're logged in
            if (!this.isLoggedIn) {
                await this.login();
            }
            
            // Navigate to jobs page
            await this.page.goto(this.jobsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Wait for jobs to load - try multiple selectors
            const jobSelectors = [
                '.job-item', '.task-item', '[data-job-id]', '.campaign-item',
                '.job-listing', '.job-card', '.campaign-card', 'tr[data-job-id]',
                '.job-row', '.task-row', '.campaign-row'
            ];
            
            let jobsFound = false;
            for (const selector of jobSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    jobsFound = true;
                    this.logger.info(`[✓] Found jobs using selector: ${selector}`);
                    break;
                } catch (error) {
                    // Try next selector
                }
            }
            
            if (!jobsFound) {
                this.logger.warn('[--] No job elements found with standard selectors, trying alternative approach...');
                // Wait a bit more and try to find any job-related content
                await this.page.waitForTimeout(3000);
            }
            
            // Extract job data with enhanced selectors
            const jobs = await this.page.evaluate(() => {
                // Try multiple job container selectors
                const possibleSelectors = [
                    '.job-item, .task-item, [data-job-id], .campaign-item',
                    '.job-listing, .job-card, .campaign-card',
                    'tr[data-job-id], .job-row, .task-row',
                    '.campaign-row, .job-container',
                    '[class*="job"], [class*="task"], [class*="campaign"]'
                ];
                
                let jobElements = [];
                for (const selectorGroup of possibleSelectors) {
                    jobElements = document.querySelectorAll(selectorGroup);
                    if (jobElements.length > 0) break;
                }
                
                const extractedJobs = [];
                
                jobElements.forEach((jobEl, index) => {
                    try {
                        // Enhanced title extraction
                        const titleSelectors = [
                            '.job-title, .task-title, .title, h3, h4, .campaign-title',
                            'a[href*="/job/"], a[href*="/task/"], a[href*="/campaign/"]',
                            '.name, .job-name, .task-name',
                            '[class*="title"]'
                        ];
                        
                        let titleEl = null;
                        for (const selector of titleSelectors) {
                            titleEl = jobEl.querySelector(selector);
                            if (titleEl) break;
                        }
                        
                        // Enhanced price extraction
                        const priceSelectors = [
                            '.price, .payment, .reward, .amount, .money, .pay',
                            '[class*="price"], [class*="payment"], [class*="reward"]',
                            '[class*="money"], [class*="pay"], [class*="amount"]'
                        ];
                        
                        let priceEl = null;
                        for (const selector of priceSelectors) {
                            priceEl = jobEl.querySelector(selector);
                            if (priceEl) break;
                        }
                        
                        // Enhanced description extraction
                        const descSelectors = [
                            '.description, .desc, .brief, .summary, .details',
                            '[class*="desc"], [class*="detail"]'
                        ];
                        
                        let descEl = null;
                        for (const selector of descSelectors) {
                            descEl = jobEl.querySelector(selector);
                            if (descEl) break;
                        }
                        
                        // Enhanced time extraction
                        const timeSelectors = [
                            '.time, .duration, .estimate, [class*="time"]',
                            '.duration, [class*="duration"]'
                        ];
                        
                        let timeEl = null;
                        for (const selector of timeSelectors) {
                            timeEl = jobEl.querySelector(selector);
                            if (timeEl) break;
                        }
                        
                        // Enhanced link extraction
                        const linkEl = jobEl.querySelector('a[href*="/job/"], a[href*="/task/"], a[href*="/campaign/"]') || titleEl;
                        
                        // Extract data with fallbacks
                        const title = titleEl ? titleEl.textContent.trim() : 
                                     jobEl.textContent.trim().split('\n')[0] || `Job ${index + 1}`;
                        
                        const priceText = priceEl ? priceEl.textContent.trim() : 
                                         jobEl.textContent.match(/\$\d+\.?\d*/)?.[0] || '$0.00';
                        
                        const description = descEl ? descEl.textContent.trim() : 
                                           jobEl.textContent.trim().substring(0, 200);
                        
                        const timeText = timeEl ? timeEl.textContent.trim() : '';
                        const link = linkEl ? linkEl.href : '';
                        
                        // Parse price with enhanced regex
                        const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
                        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
                        
                        // Parse time with enhanced regex
                        const timeMatch = timeText.match(/(\d+)\s*(min|minute|hour|hr|sec|second)/i);
                        let estimatedTime = 300; // Default 5 minutes
                        if (timeMatch) {
                            const timeValue = parseInt(timeMatch[1]);
                            const timeUnit = timeMatch[2].toLowerCase();
                            if (timeUnit.includes('hour') || timeUnit.includes('hr')) {
                                estimatedTime = timeValue * 3600;
                            } else if (timeUnit.includes('sec')) {
                                estimatedTime = timeValue;
                            } else {
                                estimatedTime = timeValue * 60;
                            }
                        }
                        
                        // Extract job ID with enhanced methods
                        let jobId = jobEl.getAttribute('data-job-id') || 
                                   jobEl.getAttribute('data-id') ||
                                   jobEl.getAttribute('data-campaign-id') ||
                                   `scraped_${Date.now()}_${index}`;
                        
                        if (link && !jobId.startsWith('scraped_')) {
                            const idMatch = link.match(/\/(?:job|task|campaign)\/(\d+)/);
                            if (idMatch) {
                                jobId = idMatch[1];
                            }
                        }
                        
                        // Quality filters
                        if (title && title.length > 3 && price >= 0 && 
                            !title.toLowerCase().includes('no jobs') &&
                            !title.toLowerCase().includes('loading')) {
                            extractedJobs.push({
                                id: jobId,
                                title: title,
                                description: description,
                                price: price,
                                estimatedTime: estimatedTime,
                                link: link,
                                category: 'general',
                                scraped: true,
                                scrapedAt: new Date().toISOString(),
                                enhanced: true
                            });
                        }
                    } catch (err) {
                        console.log('Error extracting job:', err);
                    }
                });
                
                return extractedJobs;
            });
            
            this.logger.success(`[✓] Enhanced scraping extracted ${jobs.length} jobs from Microworkers`);
            this.lastScrapeTime = new Date();
            
            // Convert to standard format
            return jobs.map(job => this.normalizeScrapedJob(job));
            
        } catch (error) {
            this.logger.error(`[✗] Enhanced scraping failed: ${error.message}`);
            
            // Try to take screenshot for debugging
            try {
                await this.page.screenshot({ path: 'scraping_error.png', fullPage: true });
                this.logger.debug('[◎] Screenshot saved as scraping_error.png');
            } catch (screenshotError) {
                // Ignore screenshot errors
            }
            
            throw error;
        }
    }

    normalizeScrapedJob(scrapedJob) {
        return {
            id: `mw_scraped_${scrapedJob.id}`,
            originalId: scrapedJob.id,
            title: scrapedJob.title,
            description: scrapedJob.description,
            category: this.categorizeJob(scrapedJob.title, scrapedJob.description),
            reward: scrapedJob.price,
            estimatedTime: scrapedJob.estimatedTime,
            instructions: scrapedJob.description,
            requirements: [],
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            maxWorkers: 1,
            availableSlots: 1,
            createdAt: new Date(),
            attempts: 0,
            maxAttempts: 3,
            link: scrapedJob.link,
            scraped: true,
            scrapedAt: scrapedJob.scrapedAt,
            enhanced: scrapedJob.enhanced,
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
            // Rate limiting
            if (this.lastScrapeTime) {
                const timeSince = Date.now() - this.lastScrapeTime.getTime();
                if (timeSince < this.minDelay) {
                    this.logger.debug(`[◎] Rate limiting: waiting ${this.minDelay - timeSince}ms`);
                    await this.sleep(this.minDelay - timeSince);
                }
            }
            
            const jobs = await this.scrapeJobs();
            
            // Log scraping results
            await this.system.logger.logSecurity('jobs_scraped', {
                source: 'microworkers_enhanced_scraper',
                jobCount: jobs.length,
                enhanced: true,
                timestamp: new Date().toISOString()
            });
            
            return jobs;
            
        } catch (error) {
            this.logger.error(`[✗] Failed to get jobs: ${error.message}`);
            return [];
        }
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
    }
}

module.exports = MicroworkersScraper;

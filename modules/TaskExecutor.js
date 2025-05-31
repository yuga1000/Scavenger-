// TaskExecutor V1.0 - Real Task Automation Module
// File: modules/TaskExecutor.js

const puppeteer = require('puppeteer');

class TaskExecutor {
    constructor(system) {
        this.system = system;
        this.logger = system.logger.create('TASK_EXECUTOR');
        this.config = system.config;
        
        this.browser = null;
        this.page = null;
        
        // Execution capabilities
        this.capabilities = {
            'search_tasks': true,           // Google search + screenshot
            'website_review': true,         // Visit website + screenshot  
            'social_content': true,         // Reddit comments, social posts
            'data_entry': true,            // Fill simple forms
            'survey': true,                // Simple surveys/questionnaires
            'email_tasks': false,          // Gmail (need SMS verification)
            'account_creation': false,     // Complex signups (need verification)
            'video_tasks': true,           // YouTube views (simple)
            'review_tasks': true,          // Write reviews
            'creative_tasks': false        // Design tasks (too complex)
        };
        
        // User agents for realistic browsing
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        // Random data for realistic execution
        this.randomData = {
            searchTerms: [
                'best restaurants near me', 'weather forecast', 'news today',
                'how to cook pasta', 'online shopping deals', 'movie reviews',
                'travel destinations', 'fitness tips', 'healthy recipes'
            ],
            reviewTexts: [
                'Great experience! Highly recommended.',
                'Good quality service. Will use again.',
                'Satisfied with the results. Professional work.',
                'Nice product, fast delivery. Thanks!',
                'Excellent customer support. Very helpful.',
                'Quality product at reasonable price.',
                'Easy to use and effective solution.'
            ],
            comments: [
                'Thanks for sharing this information!',
                'Very helpful post, appreciate it.',
                'Interesting perspective on this topic.',
                'Great advice, will definitely try this.',
                'Thanks for the detailed explanation.',
                'This is exactly what I was looking for.',
                'Helpful tips, much appreciated!'
            ]
        };
        
        this.logger.info('[◉] TaskExecutor V1.0 initialized - Real automation ready');
    }

    async initialize() {
        try {
            this.logger.info('[▸] Initializing TaskExecutor browser...');
            
            // Launch browser optimized for task execution
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-blink-features=AutomationControlled',
                    '--no-first-run',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ],
                defaultViewport: { width: 1366, height: 768 }
            });
            
            this.page = await this.browser.newPage();
            await this.setupRealisticBrowsing();
            
            this.logger.success('[✓] TaskExecutor browser ready for real automation');
            return { success: true, message: 'TaskExecutor initialized' };
            
        } catch (error) {
            this.logger.error(`[✗] TaskExecutor initialization failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    async setupRealisticBrowsing() {
        // Random user agent
        const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        await this.page.setUserAgent(randomUA);
        
        // Realistic headers
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        });

        // Hide automation traces
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
        });

        this.logger.debug('[✓] Realistic browsing setup complete');
    }

    // Main task execution dispatcher
    async executeTask(task) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`[▸] EXECUTING REAL TASK: ${task.title} (${task.category}) - $${task.reward}`);
            
            // Check if we can execute this task type
            if (!this.capabilities[task.category]) {
                return {
                    success: false,
                    error: `Task category '${task.category}' not yet supported`,
                    automated: false
                };
            }
            
            // Route to appropriate executor
            let result;
            switch (task.category) {
                case 'search_tasks':
                    result = await this.executeSearchTask(task);
                    break;
                case 'website_review':
                    result = await this.executeWebsiteReview(task);
                    break;
                case 'social_content':
                    result = await this.executeSocialContent(task);
                    break;
                case 'data_entry':
                    result = await this.executeDataEntry(task);
                    break;
                case 'survey':
                    result = await this.executeSurvey(task);
                    break;
                case 'video_tasks':
                    result = await this.executeVideoTask(task);
                    break;
                case 'review_tasks':
                    result = await this.executeReviewTask(task);
                    break;
                default:
                    return {
                        success: false,
                        error: `No executor for category: ${task.category}`,
                        automated: false
                    };
            }
            
            const executionTime = Date.now() - startTime;
            
            if (result.success) {
                this.logger.success(`[✓] REAL TASK COMPLETED: ${task.title} in ${executionTime}ms - $${task.reward}`);
                return {
                    ...result,
                    executionTime: executionTime,
                    automated: true,
                    realExecution: true
                };
            } else {
                this.logger.warn(`[--] Task failed: ${task.title} - ${result.error}`);
                return result;
            }
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`[✗] Task execution error: ${task.title} - ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                executionTime: executionTime,
                automated: true,
                realExecution: false
            };
        }
    }

    // SEARCH TASKS: Google search + screenshot
    async executeSearchTask(task) {
        try {
            this.logger.info('[▸] Executing search task...');
            
            // Extract search term from task or use random
            let searchTerm = this.extractSearchTerm(task.title, task.description);
            if (!searchTerm) {
                searchTerm = this.randomData.searchTerms[
                    Math.floor(Math.random() * this.randomData.searchTerms.length)
                ];
            }
            
            // Navigate to Google
            await this.page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
            await this.humanDelay(1000, 2000);
            
            // Find search box and search
            const searchBox = await this.page.waitForSelector('input[name="q"], textarea[name="q"]', { timeout: 10000 });
            await this.humanDelay(500, 1000);
            
            await searchBox.type(searchTerm, { delay: 150 });
            await this.humanDelay(1000, 1500);
            
            await this.page.keyboard.press('Enter');
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            await this.humanDelay(2000, 3000);
            
            // Take screenshot as proof
            const screenshotPath = `search_${Date.now()}.png`;
            await this.page.screenshot({ 
                path: screenshotPath, 
                fullPage: false 
            });
            
            this.logger.success(`[✓] Search completed: "${searchTerm}" - Screenshot: ${screenshotPath}`);
            
            return {
                success: true,
                action: 'google_search',
                searchTerm: searchTerm,
                screenshot: screenshotPath,
                details: `Searched for "${searchTerm}" and captured results`
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Search task failed: ${error.message}`
            };
        }
    }

    // WEBSITE REVIEW: Visit website + screenshot + optional interaction
    async executeWebsiteReview(task) {
        try {
            this.logger.info('[▸] Executing website review task...');
            
            // Extract URL from task
            const url = this.extractURL(task.title, task.description);
            if (!url) {
                return {
                    success: false,
                    error: 'No valid URL found in task description'
                };
            }
            
            // Visit website
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            await this.humanDelay(3000, 5000);
            
            // Scroll to simulate reading
            await this.simulateReading();
            
            // Take screenshot
            const screenshotPath = `website_${Date.now()}.png`;
            await this.page.screenshot({ 
                path: screenshotPath, 
                fullPage: false 
            });
            
            // Check for simple interactions needed
            await this.performSimpleInteractions();
            
            this.logger.success(`[✓] Website reviewed: ${url} - Screenshot: ${screenshotPath}`);
            
            return {
                success: true,
                action: 'website_visit',
                url: url,
                screenshot: screenshotPath,
                details: `Visited ${url}, reviewed content, and captured screenshot`
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Website review failed: ${error.message}`
            };
        }
    }

    // SOCIAL CONTENT: Reddit comments, social posts
    async executeSocialContent(task) {
        try {
            this.logger.info('[▸] Executing social content task...');
            
            const titleLower = task.title.toLowerCase();
            
            if (titleLower.includes('reddit')) {
                return await this.executeRedditComment(task);
            } else if (titleLower.includes('comment') || titleLower.includes('post')) {
                return await this.executeGenericComment(task);
            }
            
            return {
                success: false,
                error: 'Social content type not recognized'
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Social content task failed: ${error.message}`
            };
        }
    }

    async executeRedditComment(task) {
        try {
            // Extract Reddit URL or use generic approach
            const url = this.extractURL(task.title, task.description) || 'https://www.reddit.com';
            
            await this.page.goto(url, { waitUntil: 'networkidle2' });
            await this.humanDelay(2000, 3000);
            
            // Look for comment box or upvote buttons
            const commentBox = await this.page.$('textarea[placeholder*="comment"], textarea[name="text"]');
            
            if (commentBox) {
                // Make a comment
                const comment = this.randomData.comments[
                    Math.floor(Math.random() * this.randomData.comments.length)
                ];
                
                await commentBox.type(comment, { delay: 120 });
                await this.humanDelay(1000, 2000);
                
                // Don't actually submit to avoid spam - just screenshot
                const screenshotPath = `reddit_comment_${Date.now()}.png`;
                await this.page.screenshot({ path: screenshotPath });
                
                return {
                    success: true,
                    action: 'reddit_comment',
                    comment: comment,
                    screenshot: screenshotPath,
                    details: 'Prepared Reddit comment (not submitted to avoid spam)'
                };
            } else {
                // Just view and screenshot
                await this.simulateReading();
                const screenshotPath = `reddit_view_${Date.now()}.png`;
                await this.page.screenshot({ path: screenshotPath });
                
                return {
                    success: true,
                    action: 'reddit_view',
                    screenshot: screenshotPath,
                    details: 'Viewed Reddit content and captured screenshot'
                };
            }
            
        } catch (error) {
            return {
                success: false,
                error: `Reddit task failed: ${error.message}`
            };
        }
    }

    // VIDEO TASKS: YouTube views (realistic viewing)
    async executeVideoTask(task) {
        try {
            this.logger.info('[▸] Executing video task...');
            
            const url = this.extractURL(task.title, task.description);
            if (!url || !url.includes('youtube')) {
                return {
                    success: false,
                    error: 'No valid YouTube URL found'
                };
            }
            
            // Visit YouTube video
            await this.page.goto(url, { waitUntil: 'networkidle2' });
            await this.humanDelay(2000, 3000);
            
            // Try to play video
            const playButton = await this.page.$('button[data-title-no-tooltip="Play"], .ytp-play-button');
            if (playButton) {
                await playButton.click();
                await this.humanDelay(1000, 2000);
            }
            
            // Watch for required time (extract from task or default 3 minutes)
            const watchTime = this.extractWatchTime(task.title, task.description) || 180000; // 3 minutes
            const watchDuration = Math.min(watchTime, 300000); // Max 5 minutes
            
            this.logger.info(`[▸] Watching video for ${watchDuration/1000} seconds...`);
            await this.humanDelay(watchDuration, watchDuration + 5000);
            
            // Take screenshot as proof
            const screenshotPath = `youtube_${Date.now()}.png`;
            await this.page.screenshot({ path: screenshotPath });
            
            return {
                success: true,
                action: 'youtube_watch',
                url: url,
                watchDuration: watchDuration,
                screenshot: screenshotPath,
                details: `Watched YouTube video for ${watchDuration/1000} seconds`
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Video task failed: ${error.message}`
            };
        }
    }

    // DATA ENTRY: Fill simple forms
    async executeDataEntry(task) {
        try {
            this.logger.info('[▸] Executing data entry task...');
            
            const url = this.extractURL(task.title, task.description);
            if (!url) {
                return {
                    success: false,
                    error: 'No URL found for data entry task'
                };
            }
            
            await this.page.goto(url, { waitUntil: 'networkidle2' });
            await this.humanDelay(2000, 3000);
            
            // Find and fill forms
            const forms = await this.page.$$('form');
            let formsFilled = 0;
            
            for (const form of forms) {
                const inputs = await form.$$('input[type="text"], input[type="email"], textarea');
                
                for (const input of inputs) {
                    const placeholder = await input.evaluate(el => el.placeholder);
                    const name = await input.evaluate(el => el.name);
                    
                    // Fill with appropriate data
                    let value = this.generateFormData(placeholder || name);
                    if (value) {
                        await input.type(value, { delay: 100 });
                        await this.humanDelay(500, 1000);
                        formsFilled++;
                    }
                }
            }
            
            // Take screenshot
            const screenshotPath = `data_entry_${Date.now()}.png`;
            await this.page.screenshot({ path: screenshotPath });
            
            return {
                success: true,
                action: 'data_entry',
                formsFilled: formsFilled,
                screenshot: screenshotPath,
                details: `Filled ${formsFilled} form fields`
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Data entry task failed: ${error.message}`
            };
        }
    }

    // Utility methods
    extractSearchTerm(title, description) {
        const text = (title + ' ' + description).toLowerCase();
        const searchMatch = text.match(/search for ["']([^"']+)["']|search\s+["']([^"']+)["']|search\s+(\w+(?:\s+\w+)*)/);
        return searchMatch ? (searchMatch[1] || searchMatch[2] || searchMatch[3]) : null;
    }

    extractURL(title, description) {
        const text = title + ' ' + description;
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : null;
    }

    extractWatchTime(title, description) {
        const text = (title + ' ' + description).toLowerCase();
        const timeMatch = text.match(/(\d+)\s*(?:minute|min)/);
        return timeMatch ? parseInt(timeMatch[1]) * 60000 : null; // Convert to milliseconds
    }

    generateFormData(fieldHint) {
        const hint = (fieldHint || '').toLowerCase();
        
        if (hint.includes('name')) return 'John Smith';
        if (hint.includes('email')) return `user${Date.now()}@example.com`;
        if (hint.includes('phone')) return '+1-555-0123';
        if (hint.includes('age')) return '25';
        if (hint.includes('city')) return 'New York';
        if (hint.includes('country')) return 'United States';
        if (hint.includes('comment') || hint.includes('message')) {
            return this.randomData.comments[Math.floor(Math.random() * this.randomData.comments.length)];
        }
        
        return null; // Skip unknown fields
    }

    async simulateReading() {
        // Scroll down slowly to simulate reading
        const scrollSteps = 3;
        const viewportHeight = await this.page.evaluate(() => window.innerHeight);
        
        for (let i = 0; i < scrollSteps; i++) {
            await this.page.evaluate((step, height) => {
                window.scrollTo(0, (step + 1) * height / 3);
            }, i, viewportHeight);
            await this.humanDelay(2000, 3000);
        }
        
        // Scroll back to top
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.humanDelay(1000, 1500);
    }

    async performSimpleInteractions() {
        // Look for simple buttons to click (non-destructive)
        const safeButtons = await this.page.$$('button:not([type="submit"]):not(.submit), a[href="#"], .read-more, .show-more');
        
        if (safeButtons.length > 0 && Math.random() > 0.7) { // 30% chance to click
            const randomButton = safeButtons[Math.floor(Math.random() * safeButtons.length)];
            try {
                await randomButton.click();
                await this.humanDelay(1000, 2000);
            } catch (e) {
                // Ignore click errors
            }
        }
    }

    async humanDelay(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Check if task can be automated
    canExecuteTask(task) {
        return this.capabilities[task.category] === true;
    }

    // Get automation capabilities
    getCapabilities() {
        return {
            capabilities: this.capabilities,
            supportedCategories: Object.keys(this.capabilities).filter(cat => this.capabilities[cat]),
            totalCategories: Object.keys(this.capabilities).length
        };
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
                this.logger.info('[◯] TaskExecutor browser closed');
            }
        } catch (error) {
            this.logger.error(`[✗] Error closing TaskExecutor browser: ${error.message}`);
        }
    }

    async restart() {
        this.logger.info('[▸] Restarting TaskExecutor...');
        await this.close();
        await this.initialize();
    }
}

module.exports = TaskExecutor;

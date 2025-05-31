// MicroworkersScraper V4.1 Simple - No Puppeteer Version
// File: modules/MicroworkersScraper.js

class MicroworkersScraper {
    constructor(system) {
        this.system = system;
        this.logger = system.logger.create('MW_SCRAPER');
        this.config = system.config;
        
        this.isLoggedIn = false;
        this.lastScrapeTime = null;
        
        // Rate limiting
        this.minDelay = 3000; // 3 seconds between requests
        
        this.logger.info('[◉] MicroworkersScraper V4.1 Simple initialized (No Puppeteer)');
    }

    async initialize() {
        try {
            this.logger.info('[▸] Initializing simple scraper (API simulation mode)...');
            this.logger.success('[✓] Simple scraper initialized');
            return { success: true, message: 'Simple scraper initialized' };
        } catch (error) {
            this.logger.error(`[✗] Initialization failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    async getAvailableJobs() {
        try {
            this.logger.info('[▸] Simulating job scraping (demo mode)...');
            
            // Rate limiting
            if (this.lastScrapeTime) {
                const timeSince = Date.now() - this.lastScrapeTime.getTime();
                if (timeSince < this.minDelay) {
                    this.logger.debug(`[◎] Rate limiting: waiting ${this.minDelay - timeSince}ms`);
                    await this.sleep(this.minDelay - timeSince);
                }
            }
            
            // Simulate realistic job data
            const jobs = this.generateDemoJobs();
            
            this.lastScrapeTime = new Date();
            this.logger.success(`[✓] Simulated ${jobs.length} jobs (demo mode)`);
            
            // Log scraping results
            await this.system.logger.logSecurity('jobs_scraped', {
                source: 'microworkers_simple_scraper',
                jobCount: jobs.length,
                demo: true,
                timestamp: new Date().toISOString()
            });
            
            return jobs;
            
        } catch (error) {
            this.logger.error(`[✗] Failed to get jobs: ${error.message}`);
            return [];
        }
    }

    generateDemoJobs() {
        const jobTemplates = [
            {
                title: "Website Review and Rating",
                description: "Visit website and provide honest review and rating",
                price: 0.05,
                category: 'website_review',
                estimatedTime: 300
            },
            {
                title: "Social Media Like and Follow",
                description: "Like posts and follow social media accounts",
                price: 0.03,
                category: 'social_media',
                estimatedTime: 180
            },
            {
                title: "App Download and Review",
                description: "Download mobile app and write review",
                price: 0.08,
                category: 'app_review',
                estimatedTime: 420
            },
            {
                title: "Survey Completion",
                description: "Complete market research survey",
                price: 0.12,
                category: 'survey',
                estimatedTime: 600
            },
            {
                title: "Data Entry Task",
                description: "Enter data from provided sources",
                price: 0.06,
                category: 'data_entry',
                estimatedTime: 360
            },
            {
                title: "Video Watching Task",
                description: "Watch video and answer questions",
                price: 0.04,
                category: 'video_tasks',
                estimatedTime: 240
            },
            {
                title: "Search Engine Task",
                description: "Perform searches and click results",
                price: 0.07,
                category: 'search_tasks',
                estimatedTime: 300
            },
            {
                title: "Account Registration",
                description: "Register account on specified platform",
                price: 0.09,
                category: 'signup_tasks',
                estimatedTime: 480
            }
        ];

        // Generate 3-8 random jobs
        const jobCount = Math.floor(Math.random() * 6) + 3;
        const jobs = [];

        for (let i = 0; i < jobCount; i++) {
            const template = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
            
            // Add some variation to price and time
            const priceVariation = (Math.random() - 0.5) * 0.02; // ±0.01
            const timeVariation = (Math.random() - 0.5) * 120; // ±60 seconds
            
            const job = {
                id: `demo_${Date.now()}_${i}`,
                title: template.title,
                description: template.description,
                price: Math.max(0.01, template.price + priceVariation),
                estimatedTime: Math.max(60, template.estimatedTime + timeVariation),
                category: template.category,
                scraped: true,
                demo: true,
                scrapedAt: new Date().toISOString(),
                link: `https://microworkers.com/job/demo_${i}`
            };

            jobs.push(this.normalizeScrapedJob(job));
        }

        return jobs;
    }

    normalizeScrapedJob(scrapedJob) {
        return {
            id: `mw_simple_${scrapedJob.id}`,
            originalId: scrapedJob.id,
            title: scrapedJob.title,
            description: scrapedJob.description,
            category: scrapedJob.category,
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
            demo: scrapedJob.demo || false,
            scrapedAt: scrapedJob.scrapedAt,
            originalData: scrapedJob
        };
    }

    async close() {
        try {
            this.logger.info('[◯] Simple scraper closed');
        } catch (error) {
            this.logger.error(`[✗] Error closing simple scraper: ${error.message}`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Health check
    async isHealthy() {
        return true; // Simple version is always healthy
    }

    async restart() {
        this.logger.info('[▸] Restarting simple scraper...');
        await this.initialize();
        this.isLoggedIn = false;
    }
}

module.exports = MicroworkersScraper;

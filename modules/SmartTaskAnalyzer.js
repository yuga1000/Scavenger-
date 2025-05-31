// Smart Task Analyzer V1.0 - AI-Powered Task Selection
// File: modules/SmartTaskAnalyzer.js

class SmartTaskAnalyzer {
    constructor(system) {
        this.system = system;
        this.logger = system.logger.create('SMART_ANALYZER');
        
        // Learning data
        this.taskHistory = [];
        this.successPatterns = new Map();
        this.timePatterns = new Map();
        this.profitabilityScores = new Map();
        
        // AI scoring weights
        this.weights = {
            successRate: 0.3,      // 30% - how often we succeed
            profitability: 0.25,   // 25% - $/hour ratio
            automation: 0.2,       // 20% - can we automate it
            difficulty: 0.15,      // 15% - complexity level
            reliability: 0.1       // 10% - platform stability
        };
        
        // Keyword analysis for automation potential
        this.automationKeywords = {
            high: ['search', 'visit', 'click', 'view', 'open', 'screenshot'],
            medium: ['comment', 'review', 'rating', 'survey', 'form'],
            low: ['write', 'create', 'design', 'translate', 'analysis'],
            impossible: ['call', 'phone', 'speak', 'record', 'video', 'selfie']
        };
        
        this.logger.info('[◉] Smart Task Analyzer initialized with AI learning');
    }

    // Main task scoring function
    analyzeTask(task) {
        const scores = {
            successRate: this.calculateSuccessRate(task),
            profitability: this.calculateProfitability(task),
            automation: this.calculateAutomationPotential(task),
            difficulty: this.calculateDifficulty(task),
            reliability: this.calculateReliability(task)
        };
        
        // Weighted total score
        const totalScore = Object.entries(scores).reduce((total, [key, score]) => {
            return total + (score * this.weights[key]);
        }, 0);
        
        // Add learning bonus
        const learningBonus = this.getLearningBonus(task);
        const finalScore = Math.min(100, totalScore + learningBonus);
        
        return {
            totalScore: Math.round(finalScore),
            breakdown: scores,
            recommendation: this.getRecommendation(finalScore),
            automationLevel: this.getAutomationLevel(scores.automation),
            estimatedTime: this.estimateCompletionTime(task),
            profitPerHour: this.calculateProfitPerHour(task)
        };
    }

    calculateSuccessRate(task) {
        const category = task.category;
        const platform = task.platform;
        const key = `${platform}_${category}`;
        
        if (this.successPatterns.has(key)) {
            return this.successPatterns.get(key);
        }
        
        // Default success rates by category
        const defaultRates = {
            search_tasks: 95,
            website_review: 90,
            video_tasks: 85,
            social_content: 80,
            data_entry: 75,
            survey: 70,
            email_tasks: 60,
            account_creation: 50,
            creative_tasks: 40
        };
        
        return defaultRates[category] || 65;
    }

    calculateProfitability(task) {
        const reward = task.reward;
        const estimatedTime = task.estimatedTime / 3600; // Convert to hours
        const hourlyRate = estimatedTime > 0 ? reward / estimatedTime : 0;
        
        // Score based on hourly rate
        if (hourlyRate >= 15) return 100;
        if (hourlyRate >= 10) return 85;
        if (hourlyRate >= 7) return 70;
        if (hourlyRate >= 5) return 55;
        if (hourlyRate >= 3) return 40;
        if (hourlyRate >= 1) return 25;
        return 10;
    }

    calculateAutomationPotential(task) {
        const text = (task.title + ' ' + task.description).toLowerCase();
        
        // Check automation keywords
        const highKeywords = this.automationKeywords.high.filter(keyword => 
            text.includes(keyword)).length;
        const mediumKeywords = this.automationKeywords.medium.filter(keyword => 
            text.includes(keyword)).length;
        const lowKeywords = this.automationKeywords.low.filter(keyword => 
            text.includes(keyword)).length;
        const impossibleKeywords = this.automationKeywords.impossible.filter(keyword => 
            text.includes(keyword)).length;
        
        if (impossibleKeywords > 0) return 0;
        if (highKeywords >= 2) return 95;
        if (highKeywords >= 1) return 80;
        if (mediumKeywords >= 2) return 60;
        if (mediumKeywords >= 1) return 45;
        if (lowKeywords >= 1) return 25;
        
        return 35; // Default moderate potential
    }

    calculateDifficulty(task) {
        let difficultyScore = 50; // Start at medium
        
        const text = (task.title + ' ' + task.description).toLowerCase();
        
        // Easy indicators
        const easyWords = ['simple', 'easy', 'quick', 'basic', 'just', 'only'];
        const easyCount = easyWords.filter(word => text.includes(word)).length;
        difficultyScore -= easyCount * 10;
        
        // Hard indicators  
        const hardWords = ['complex', 'detailed', 'analysis', 'research', 'expert', 'professional'];
        const hardCount = hardWords.filter(word => text.includes(word)).length;
        difficultyScore += hardCount * 15;
        
        // Time-based difficulty
        if (task.estimatedTime > 1800) difficultyScore += 20; // >30 min
        if (task.estimatedTime < 300) difficultyScore -= 15;  // <5 min
        
        // Reward-based difficulty (high reward usually = harder)
        if (task.reward > 0.5) difficultyScore += 25;
        if (task.reward < 0.1) difficultyScore -= 10;
        
        return Math.max(0, Math.min(100, 100 - difficultyScore)); // Invert so higher = easier
    }

    calculateReliability(task) {
        const platform = task.platform;
        
        // Platform reliability scores
        const platformScores = {
            microworkers: 85,
            clickworker: 90,
            spare5: 80,
            toloka: 85
        };
        
        let score = platformScores[platform] || 70;
        
        // Bonus for scraped tasks (more likely to be real)
        if (task.scraped) score += 5;
        
        // Penalty for very new tasks (might be fake)
        const taskAge = Date.now() - task.createdAt.getTime();
        if (taskAge < 300000) score -= 10; // Less than 5 minutes old
        
        return Math.max(0, Math.min(100, score));
    }

    getLearningBonus(task) {
        // Bonus based on historical performance
        const similarTasks = this.taskHistory.filter(t => 
            t.category === task.category && 
            Math.abs(t.reward - task.reward) < 0.05);
        
        if (similarTasks.length < 3) return 0; // Not enough data
        
        const avgSuccess = similarTasks.reduce((sum, t) => sum + (t.success ? 1 : 0), 0) / similarTasks.length;
        const avgProfitability = similarTasks.reduce((sum, t) => sum + t.profitPerHour, 0) / similarTasks.length;
        
        // Bonus for historically good task types
        if (avgSuccess > 0.8 && avgProfitability > 5) return 15;
        if (avgSuccess > 0.7 && avgProfitability > 3) return 10;
        if (avgSuccess > 0.6) return 5;
        
        return 0;
    }

    getRecommendation(score) {
        if (score >= 85) return 'EXCELLENT - Execute immediately';
        if (score >= 70) return 'GOOD - High priority';
        if (score >= 55) return 'FAIR - Consider if no better options';
        if (score >= 40) return 'POOR - Low priority';
        return 'SKIP - Not recommended';
    }

    getAutomationLevel(automationScore) {
        if (automationScore >= 90) return 'FULL_AUTO';
        if (automationScore >= 70) return 'HIGH_AUTO';
        if (automationScore >= 50) return 'MEDIUM_AUTO';
        if (automationScore >= 30) return 'LOW_AUTO';
        return 'MANUAL_ONLY';
    }

    estimateCompletionTime(task) {
        const baseTime = task.estimatedTime;
        const category = task.category;
        
        // Adjustment factors based on automation potential
        const automationMultipliers = {
            search_tasks: 0.2,      // Very fast automation
            website_review: 0.3,    // Fast automation  
            video_tasks: 0.8,       // Slower (need to actually watch)
            social_content: 0.4,    // Medium automation
            data_entry: 0.3,        // Fast automation
            survey: 0.6,           // Medium (need to read)
            email_tasks: 1.5,      // Slower (complex verification)
            account_creation: 2.0,  // Very slow (verification needed)
            creative_tasks: 3.0    // Manual work required
        };
        
        const multiplier = automationMultipliers[category] || 1.0;
        return Math.round(baseTime * multiplier);
    }

    calculateProfitPerHour(task) {
        const estimatedTime = this.estimateCompletionTime(task) / 3600; // Convert to hours
        return estimatedTime > 0 ? task.reward / estimatedTime : 0;
    }

    // Learn from completed tasks
    learnFromTask(task, result) {
        const taskData = {
            category: task.category,
            platform: task.platform,
            reward: task.reward,
            estimatedTime: task.estimatedTime,
            actualTime: result.executionTime || 0,
            success: result.success,
            automated: result.automated || false,
            profitPerHour: this.calculateProfitPerHour(task),
            completedAt: new Date()
        };
        
        this.taskHistory.push(taskData);
        
        // Update success patterns
        const key = `${task.platform}_${task.category}`;
        const categoryTasks = this.taskHistory.filter(t => 
            t.platform === task.platform && t.category === task.category);
        
        if (categoryTasks.length >= 3) {
            const successRate = categoryTasks.reduce((sum, t) => sum + (t.success ? 1 : 0), 0) / categoryTasks.length * 100;
            this.successPatterns.set(key, successRate);
        }
        
        // Keep only last 500 tasks to prevent memory bloat
        if (this.taskHistory.length > 500) {
            this.taskHistory = this.taskHistory.slice(-500);
        }
        
        this.logger.debug(`[◎] Learned from task: ${task.category} - Success: ${result.success}`);
    }

    // Get insights for decision making
    getInsights() {
        if (this.taskHistory.length < 10) {
            return { message: 'Not enough data for insights yet', tasks: this.taskHistory.length };
        }
        
        const recent = this.taskHistory.slice(-50); // Last 50 tasks
        
        // Best performing categories
        const categoryPerformance = {};
        recent.forEach(task => {
            if (!categoryPerformance[task.category]) {
                categoryPerformance[task.category] = { total: 0, successful: 0, profit: 0 };
            }
            categoryPerformance[task.category].total++;
            if (task.success) categoryPerformance[task.category].successful++;
            categoryPerformance[task.category].profit += task.profitPerHour;
        });
        
        const insights = Object.entries(categoryPerformance).map(([category, data]) => ({
            category,
            successRate: (data.successful / data.total * 100).toFixed(1),
            avgProfitPerHour: (data.profit / data.total).toFixed(2),
            tasks: data.total
        })).sort((a, b) => parseFloat(b.avgProfitPerHour) - parseFloat(a.avgProfitPerHour));
        
        return {
            totalTasks: this.taskHistory.length,
            recentTasks: recent.length,
            overallSuccessRate: (recent.filter(t => t.success).length / recent.length * 100).toFixed(1),
            bestCategories: insights.slice(0, 3),
            worstCategories: insights.slice(-2),
            recommendations: this.generateRecommendations(insights)
        };
    }

    generateRecommendations(insights) {
        const recommendations = [];
        
        if (insights.length > 0) {
            const best = insights[0];
            if (parseFloat(best.avgProfitPerHour) > 5) {
                recommendations.push(`Focus on ${best.category} tasks - ${best.avgProfitPerHour}$/hour average`);
            }
            
            const worst = insights[insights.length - 1];
            if (parseFloat(worst.successRate) < 50) {
                recommendations.push(`Avoid ${worst.category} tasks - only ${worst.successRate}% success rate`);
            }
        }
        
        return recommendations;
    }

    // Export learning data for backup
    exportLearningData() {
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            taskHistory: this.taskHistory,
            successPatterns: Object.fromEntries(this.successPatterns),
            insights: this.getInsights()
        };
    }
}

module.exports = SmartTaskAnalyzer;

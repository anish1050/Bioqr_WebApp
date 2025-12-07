// ===== STATUS PAGE JAVASCRIPT =====

class StatusPageManager {
    constructor() {
        this.refreshInterval = null;
        this.subscribeForm = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        this.initAutoRefresh();
        this.initSubscribeForm();
        this.animateElements();
    }

    // Auto-refresh functionality
    initAutoRefresh() {
        const refreshElement = document.querySelector('.auto-refresh');
        if (refreshElement) {
            this.startAutoRefresh();
            
            // Allow manual refresh on click
            refreshElement.addEventListener('click', () => {
                this.refreshStatus();
            });
        }
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.refreshStatus();
        }, 30000);
    }

    refreshStatus() {
        // Simulate status refresh (in a real app, this would fetch from an API)
        const refreshIcon = document.querySelector('.auto-refresh i');
        if (refreshIcon) {
            refreshIcon.style.animation = 'spin 1s linear';
            
            // Reset animation after completion
            setTimeout(() => {
                refreshIcon.style.animation = 'spin 2s linear infinite';
            }, 1000);
        }

        // Update last refreshed time
        this.updateLastRefreshed();
        
        // Simulate slight changes in metrics (for demo purposes)
        this.simulateMetricUpdates();
    }

    updateLastRefreshed() {
        const refreshText = document.querySelector('.auto-refresh');
        if (refreshText) {
            const timeSpan = refreshText.querySelector('span');
            if (timeSpan) {
                const now = new Date();
                const timeString = now.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                timeSpan.textContent = `Last updated at ${timeString}`;
            }
        }
    }

    simulateMetricUpdates() {
        // Update response times with small variations
        const responseTimeElements = document.querySelectorAll('.metric-value');
        responseTimeElements.forEach(element => {
            if (element.textContent.includes('ms')) {
                const currentValue = parseFloat(element.textContent);
                const variation = (Math.random() - 0.5) * 10; // ±5ms variation
                const newValue = Math.max(1, currentValue + variation);
                element.textContent = `${newValue.toFixed(0)}ms`;
            }
        });
    }

    // Subscribe form functionality
    initSubscribeForm() {
        this.subscribeForm = document.querySelector('.subscribe-form form');
        if (this.subscribeForm) {
            this.subscribeForm.addEventListener('submit', (e) => {
                this.handleSubscription(e);
            });
        }
    }

    handleSubscription(event) {
        event.preventDefault();
        
        const emailInput = this.subscribeForm.querySelector('input[type="email"]');
        const submitButton = this.subscribeForm.querySelector('button[type="submit"]');
        
        if (!emailInput || !emailInput.value.trim()) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Validate email format
        if (!this.isValidEmail(emailInput.value)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Disable button and show loading state
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Subscribing...';

        // Simulate API call
        setTimeout(() => {
            // Reset button
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            
            // Clear form
            emailInput.value = '';
            
            // Show success message
            this.showNotification('Successfully subscribed to status updates!', 'success');
        }, 1500);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }


    // Animation effects
    animateElements() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationDelay = `${Math.random() * 0.3}s`;
                    entry.target.classList.add('animate-fadeInUp');
                }
            });
        }, observerOptions);

        // Observe all cards and sections
        const animatedElements = document.querySelectorAll(
            '.service-card, .chart-container, .incident-item, .subscribe-section'
        );
        
        animatedElements.forEach(el => observer.observe(el));

        // Animate uptime charts on load
        this.animateUptimeCharts();
    }

    animateUptimeCharts() {
        const charts = document.querySelectorAll('.uptime-chart');
        charts.forEach((chart, index) => {
            // Add a loading animation
            chart.style.opacity = '0';
            chart.style.transform = 'scaleX(0)';
            
            setTimeout(() => {
                chart.style.transition = 'all 1s ease-out';
                chart.style.opacity = '1';
                chart.style.transform = 'scaleX(1)';
            }, index * 200);
        });
    }

    // Utility functions
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px 24px',
            borderRadius: '8px',
            color: '#ffffff',
            fontWeight: '500',
            fontSize: '14px',
            zIndex: '9999',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease-out',
            backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        });

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // Cleanup
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// CSS for animations
const animationStyles = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .animate-fadeInUp {
        animation: fadeInUp 0.8s ease-out forwards;
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .notification-content i {
        font-size: 16px;
    }
`;

// Inject animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// Initialize status page manager
const statusPageManager = new StatusPageManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    statusPageManager.destroy();
});


// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusPageManager;
}

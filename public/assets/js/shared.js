// ===== SHARED JAVASCRIPT UTILITIES =====

// Global state
const globalState = {
    sidebarOpen: false,
    currentPage: location.pathname.split('/').pop() || 'index.html'
};

// DOM elements cache
const elements = {
    progressBar: document.getElementById('progress-bar'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.querySelector('.sidebar-toggle'),
    toast: document.getElementById('toast'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// Initialize shared functionality
function initShared() {
    setupEventListeners();
    setupProgressBar();
    updateProgressBar();
    
    console.log('Shared utilities initialized');
}

// Event listeners setup
function setupEventListeners() {
    // Sidebar toggle
    if (elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Progress bar on scroll
    window.addEventListener('scroll', updateProgressBar);
    window.addEventListener('resize', handleResize);
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            globalState.sidebarOpen && 
            elements.sidebar &&
            !elements.sidebar.contains(e.target) && 
            !elements.sidebarToggle.contains(e.target)) {
            toggleSidebar();
        }
    });
    
    // Smooth scrolling for anchor links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
}

// Sidebar functionality
function toggleSidebar() {
    globalState.sidebarOpen = !globalState.sidebarOpen;
    if (elements.sidebar) {
        elements.sidebar.classList.toggle('open', globalState.sidebarOpen);
    }
}

// Progress bar functionality
function setupProgressBar() {
    if (!elements.progressBar) return;
    updateProgressBar();
}

function updateProgressBar() {
    if (!elements.progressBar) return;
    
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    
    elements.progressBar.style.width = `${Math.min(scrollPercent, 100)}%`;
}

// Toast notification system
function showToast(type, message, icon = null) {
    if (!elements.toast) return;
    
    const toastIcon = elements.toast.querySelector('.toast-icon');
    const toastMessage = elements.toast.querySelector('.toast-message');
    
    // Set content
    if (toastIcon && icon) {
        toastIcon.className = `toast-icon ${icon}`;
    }
    if (toastMessage) {
        toastMessage.textContent = message;
    }
    
    // Set type
    elements.toast.className = `toast ${type}`;
    
    // Show toast
    setTimeout(() => {
        elements.toast.classList.add('show');
    }, 100);
    
    // Hide after 4 seconds
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 4000);
}

// Loading overlay
function showLoading(message = 'Loading...') {
    if (!elements.loadingOverlay) return;
    
    const loadingText = elements.loadingOverlay.querySelector('p');
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    elements.loadingOverlay.classList.add('show');
}

function hideLoading() {
    if (!elements.loadingOverlay) return;
    elements.loadingOverlay.classList.remove('show');
}

// Responsive handling
function handleResize() {
    // Close sidebar on desktop
    if (window.innerWidth > 768 && globalState.sidebarOpen) {
        toggleSidebar();
    }
}

// Form utilities
function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = 'var(--danger-color)';
            setTimeout(() => {
                field.style.borderColor = '';
            }, 3000);
        }
    });
    
    return isValid;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Animation utilities
function animateOnScroll() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);
    
    // Observe elements with animation classes
    const animateElements = document.querySelectorAll('.animate-on-scroll, .card, .hero, .section');
    
    animateElements.forEach(el => {
        if (!el.classList.contains('no-animate')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        }
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Storage utilities
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

// API utilities
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Global functions (called from HTML)
window.toggleSidebar = toggleSidebar;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initShared();
        animateOnScroll();
    });
} else {
    initShared();
    animateOnScroll();
}

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleSidebar,
        showToast,
        showLoading,
        hideLoading,
        validateForm,
        validateEmail,
        sanitizeInput,
        setLocalStorage,
        getLocalStorage,
        fetchWithTimeout
    };
}
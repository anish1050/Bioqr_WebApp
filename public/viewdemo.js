// ===== BIOQR DEMO PAGE JAVASCRIPT =====

// Global state management
const state = {
    currentDemo: 'video',
    sidebarOpen: false,
    biometricScanned: false,
    qrGenerated: false,
    securityLevel: 'low'
};

// DOM elements cache
const elements = {
    // Progress bar
    progressBar: document.getElementById('progress-bar'),
    
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.querySelector('.sidebar-toggle'),
    
    // Demo panels
    demoPanels: document.querySelectorAll('.demo-panel'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    
    // Video elements
    video: document.getElementById('demo-video'),
    videoOverlay: document.getElementById('video-overlay'),
    playIcon: document.getElementById('play-icon'),
    ctrlPlayIcon: document.getElementById('ctrl-play-icon'),
    volumeIcon: document.getElementById('volume-icon'),
    videoProgress: document.getElementById('video-progress'),
    timeDisplay: document.getElementById('time-display'),
    
    // Interactive elements
    bioScanner: document.getElementById('bio-scanner'),
    qrGenerator: document.getElementById('qr-generator'),
    bioStatus: document.getElementById('bio-status'),
    qrStatus: document.getElementById('qr-status'),
    authStatus: document.getElementById('auth-status'),
    securityLevel: document.getElementById('security-level'),
    levelText: document.getElementById('level-text'),
    
    // Toast
    toast: document.getElementById('toast'),
    
    // Loading overlay
    loadingOverlay: document.getElementById('loading-overlay')
};

// Initialize the demo page
function init() {
    setupEventListeners();
    setupVideoProgress();
    setupProgressBar();
    updateProgressBar();
    
    // Initialize animations
    animateOnScroll();
    
    console.log('BioQR Demo initialized successfully');
}

// Event listeners setup
function setupEventListeners() {
    // Sidebar toggle
    if (elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Demo tab navigation
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const demoType = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
            showDemo(demoType);
        });
    });
    
    // Video controls
    if (elements.video) {
        elements.video.addEventListener('loadedmetadata', updateTimeDisplay);
        elements.video.addEventListener('timeupdate', updateVideoProgress);
        elements.video.addEventListener('play', () => updatePlayIcon(true));
        elements.video.addEventListener('pause', () => updatePlayIcon(false));
        elements.video.addEventListener('ended', () => updatePlayIcon(false));
    }
    
    if (elements.videoProgress) {
        elements.videoProgress.addEventListener('input', seekVideo);
    }
    
    // Progress bar on scroll
    window.addEventListener('scroll', updateProgressBar);
    window.addEventListener('resize', handleResize);
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            state.sidebarOpen && 
            !elements.sidebar.contains(e.target) && 
            !elements.sidebarToggle.contains(e.target)) {
            toggleSidebar();
        }
    });
}

// Sidebar functionality
function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    elements.sidebar.classList.toggle('open', state.sidebarOpen);
}

// Demo navigation
function showDemo(demoType) {
    // Update state
    state.currentDemo = demoType;
    
    // Update tab buttons
    elements.tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(demoType)) {
            btn.classList.add('active');
        }
    });
    
    // Update demo panels
    elements.demoPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `${demoType}-demo`) {
            panel.classList.add('active');
        }
    });
    
    // Trigger specific demo initialization
    switch (demoType) {
        case 'video':
            initVideoDemo();
            break;
        case 'interactive':
            initInteractiveDemo();
            break;
        case 'features':
            initFeaturesDemo();
            break;
    }
    
    showToast('success', `Switched to ${demoType} demo`, 'fas fa-check');
}

// Video demo functionality
function initVideoDemo() {
    if (elements.video) {
        elements.video.load();
        updateTimeDisplay();
    }
}

function toggleVideo() {
    if (!elements.video) return;
    
    if (elements.video.paused) {
        elements.video.play();
        elements.videoOverlay.classList.add('hidden');
    } else {
        elements.video.pause();
        elements.videoOverlay.classList.remove('hidden');
    }
}

function toggleMute() {
    if (!elements.video) return;
    
    elements.video.muted = !elements.video.muted;
    const icon = elements.volumeIcon;
    if (icon) {
        icon.className = elements.video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
}

function toggleFullscreen() {
    if (!elements.video) return;
    
    if (elements.video.requestFullscreen) {
        elements.video.requestFullscreen();
    } else if (elements.video.webkitRequestFullscreen) {
        elements.video.webkitRequestFullscreen();
    } else if (elements.video.msRequestFullscreen) {
        elements.video.msRequestFullscreen();
    }
}

function updatePlayIcon(isPlaying) {
    const playIcon = 'fas fa-play';
    const pauseIcon = 'fas fa-pause';
    
    if (elements.playIcon) {
        elements.playIcon.className = isPlaying ? pauseIcon : playIcon;
    }
    
    if (elements.ctrlPlayIcon) {
        elements.ctrlPlayIcon.className = isPlaying ? pauseIcon : playIcon;
    }
}

function updateVideoProgress() {
    if (!elements.video || !elements.videoProgress) return;
    
    const progress = (elements.video.currentTime / elements.video.duration) * 100;
    elements.videoProgress.value = progress || 0;
    updateTimeDisplay();
}

function seekVideo() {
    if (!elements.video || !elements.videoProgress) return;
    
    const time = (elements.videoProgress.value / 100) * elements.video.duration;
    elements.video.currentTime = time;
}

function updateTimeDisplay() {
    if (!elements.video || !elements.timeDisplay) return;
    
    const current = formatTime(elements.video.currentTime || 0);
    const duration = formatTime(elements.video.duration || 0);
    elements.timeDisplay.textContent = `${current} / ${duration}`;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Interactive demo functionality
function initInteractiveDemo() {
    resetSimulator();
}

function startBioScan() {
    showLoading('Scanning biometric data...');
    
    // Simulate biometric scanning
    setTimeout(() => {
        hideLoading();
        state.biometricScanned = true;
        
        // Update UI
        const scanner = document.querySelector('.scanner-ring');
        scanner.classList.add('scanning');
        
        // Update status
        updateIndicator('bio-status', 'success', 'Biometric: Verified');
        
        // Enable QR generation
        const generateBtn = document.querySelector('.generate-btn');
        if (generateBtn) {
            generateBtn.disabled = false;
        }
        
        updateSecurityLevel();
        showToast('success', 'Biometric scan completed successfully!', 'fas fa-fingerprint');
    }, 2000);
}

function generateQR() {
    if (!state.biometricScanned) {
        showToast('warning', 'Please complete biometric scan first', 'fas fa-exclamation-triangle');
        return;
    }
    
    showLoading('Generating secure QR code...');
    
    setTimeout(() => {
        hideLoading();
        state.qrGenerated = true;
        
        // Update QR display
        const qrDisplay = document.querySelector('.qr-display');
        const qrPlaceholder = document.querySelector('.qr-placeholder');
        
        if (qrDisplay && qrPlaceholder) {
            qrPlaceholder.innerHTML = `
                <div style="width: 80px; height: 80px; background: linear-gradient(45deg, #3b82f6, #22c5be); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-qrcode" style="font-size: 2rem; color: white;"></i>
                </div>
                <p style="margin-top: 8px; font-size: 0.75rem;">Secure QR Generated</p>
            `;
            qrDisplay.style.borderColor = '#22c5be';
        }
        
        // Update status
        updateIndicator('qr-status', 'success', 'QR Code: Generated');
        updateIndicator('auth-status', 'success', 'Authentication: Complete');
        
        updateSecurityLevel();
        showToast('success', 'QR code generated successfully!', 'fas fa-qrcode');
    }, 1500);
}

function resetSimulator() {
    state.biometricScanned = false;
    state.qrGenerated = false;
    state.securityLevel = 'low';
    
    // Reset scanner
    const scanner = document.querySelector('.scanner-ring');
    if (scanner) {
        scanner.classList.remove('scanning');
    }
    
    // Reset QR display
    const qrDisplay = document.querySelector('.qr-display');
    const qrPlaceholder = document.querySelector('.qr-placeholder');
    
    if (qrDisplay && qrPlaceholder) {
        qrPlaceholder.innerHTML = `
            <i class="fas fa-qrcode"></i>
            <p>QR Code will appear here</p>
        `;
        qrDisplay.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    }
    
    // Reset buttons
    const generateBtn = document.querySelector('.generate-btn');
    if (generateBtn) {
        generateBtn.disabled = true;
    }
    
    // Reset indicators
    updateIndicator('bio-status', 'default', 'Biometric: Pending');
    updateIndicator('qr-status', 'default', 'QR Code: Pending');
    updateIndicator('auth-status', 'default', 'Authentication: Waiting');
    
    updateSecurityLevel();
    showToast('info', 'Simulator reset', 'fas fa-redo');
}

function updateIndicator(id, type, text) {
    const indicator = document.getElementById(id);
    if (!indicator) return;
    
    // Remove all status classes
    indicator.classList.remove('success', 'warning', 'danger');
    
    // Add new status class
    if (type !== 'default') {
        indicator.classList.add(type);
    }
    
    // Update text
    const textElement = indicator.querySelector('span');
    if (textElement) {
        textElement.textContent = text;
    }
}

function updateSecurityLevel() {
    let level = 'Low';
    let width = '30%';
    
    if (state.biometricScanned && state.qrGenerated) {
        level = 'Maximum';
        width = '100%';
    } else if (state.biometricScanned) {
        level = 'Medium';
        width = '60%';
    }
    
    state.securityLevel = level.toLowerCase();
    
    if (elements.securityLevel) {
        elements.securityLevel.style.width = width;
    }
    
    if (elements.levelText) {
        elements.levelText.textContent = level;
    }
}

// Features demo functionality
function initFeaturesDemo() {
    // Add click animations to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            card.style.transform = 'translateY(-12px) scale(1.02)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);
        });
    });
}

function showFeatureDetail(feature) {
    const features = {
        biometric: 'Advanced multi-modal biometric authentication with industry-leading accuracy.',
        qr: 'Dynamic QR codes with time-based expiry and encrypted payload for maximum security.',
        security: 'Multi-layer security architecture ensuring zero-breach protection.',
        monitoring: 'Real-time security monitoring with instant threat detection and response.'
    };
    
    showToast('info', features[feature] || 'Feature information', 'fas fa-info-circle');
}

// Action functions
function startTrial() {
    showToast('success', 'Redirecting to trial signup...', 'fas fa-rocket');
    setTimeout(() => {
        window.location.href = 'register.html';
    }, 1000);
}

function downloadDemo() {
    showToast('info', 'Demo download initiated...', 'fas fa-download');
    // Simulate download
    setTimeout(() => {
        showToast('success', 'Demo downloaded successfully!', 'fas fa-check');
    }, 2000);
}

function getStarted() {
    showToast('success', 'Redirecting to getting started...', 'fas fa-arrow-right');
    setTimeout(() => {
        window.location.href = '../';
    }, 1000);
}

// Progress bar functionality
function setupProgressBar() {
    if (!elements.progressBar) return;
    
    // Initial progress
    updateProgressBar();
}

function updateProgressBar() {
    if (!elements.progressBar) return;
    
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    
    elements.progressBar.style.width = `${Math.min(scrollPercent, 100)}%`;
}

// Video progress setup
function setupVideoProgress() {
    if (!elements.video || !elements.videoProgress) return;
    
    // Set initial state
    elements.videoProgress.value = 0;
    updateTimeDisplay();
}

// Toast notification system
function showToast(type, message, icon) {
    if (!elements.toast) return;
    
    const toastContent = elements.toast.querySelector('.toast-content');
    const toastIcon = elements.toast.querySelector('.toast-icon');
    const toastMessage = elements.toast.querySelector('.toast-message');
    
    // Set content
    if (toastIcon) toastIcon.className = `toast-icon ${icon}`;
    if (toastMessage) toastMessage.textContent = message;
    
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

// Animations and scroll effects
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
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll(
        '.hero-content, .demo-nav, .simulator-card, .feature-card, .video-card'
    );
    
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Responsive handling
function handleResize() {
    // Close sidebar on desktop
    if (window.innerWidth > 768 && state.sidebarOpen) {
        toggleSidebar();
    }
    
    // Update video controls layout
    updateVideoControlsLayout();
}

function updateVideoControlsLayout() {
    const videoControls = document.querySelector('.video-controls');
    if (!videoControls) return;
    
    if (window.innerWidth <= 480) {
        videoControls.style.flexWrap = 'wrap';
        videoControls.style.gap = '0.5rem';
    } else {
        videoControls.style.flexWrap = 'nowrap';
        videoControls.style.gap = '1rem';
    }
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

// Global functions (called from HTML)
window.toggleSidebar = toggleSidebar;
window.showDemo = showDemo;
window.toggleVideo = toggleVideo;
window.toggleMute = toggleMute;
window.toggleFullscreen = toggleFullscreen;
window.startBioScan = startBioScan;
window.generateQR = generateQR;
window.resetSimulator = resetSimulator;
window.showFeatureDetail = showFeatureDetail;
window.startTrial = startTrial;
window.downloadDemo = downloadDemo;
window.getStarted = getStarted;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Error handling
window.addEventListener('error', (e) => {
    console.error('Demo page error:', e);
    showToast('error', 'An error occurred. Please refresh the page.', 'fas fa-exclamation-circle');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        init,
        toggleSidebar,
        showDemo,
        toggleVideo,
        showToast,
        state
    };
}
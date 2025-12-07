// ===== CONTACT PAGE JAVASCRIPT =====

// Contact page state
const contactState = {
    formSubmitted: false,
    formData: {}
};

// Initialize contact page
function initContact() {
    setupContactForm();
    setupContactActions();
    console.log('Contact page initialized');
}

// Setup contact form
function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', handleFormSubmit);

    // Real-time validation
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (contactState.formSubmitted) {
        showToast('warning', 'Form already submitted. Please wait...', 'fas fa-exclamation-triangle');
        return;
    }

    const form = e.target;
    
    // Validate form
    if (!validateContactForm(form)) {
        showToast('error', 'Please fill in all required fields correctly', 'fas fa-exclamation-circle');
        return;
    }

    // Show loading
    showLoading('Sending your message...');
    contactState.formSubmitted = true;
    
    const submitBtn = form.querySelector('#submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    try {
        // Collect form data
        const formData = new FormData(form);
        
        // Add additional data
        formData.append('timestamp', new Date().toISOString());
        formData.append('userAgent', navigator.userAgent);
        formData.append('page', 'contact');

        // Submit form
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            showToast('success', 'Message sent successfully! We\'ll get back to you within 24 hours.', 'fas fa-check');
            form.reset();
            
            // Store submission data
            setLocalStorage('lastContactSubmission', {
                timestamp: new Date().toISOString(),
                success: true
            });
            
            // Show thank you message
            showThankYouMessage();
        } else {
            throw new Error('Form submission failed');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showToast('error', 'Failed to send message. Please try again or contact us directly.', 'fas fa-exclamation-circle');
        
        // Reset form state
        contactState.formSubmitted = false;
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }

    hideLoading();
}

// Validate contact form
function validateContactForm(form) {
    let isValid = true;
    
    // Check required fields
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });
    
    // Validate email format
    const emailField = form.querySelector('#email');
    if (emailField && emailField.value && !validateEmail(emailField.value)) {
        showFieldError(emailField, 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate phone format (if provided)
    const phoneField = form.querySelector('#phone');
    if (phoneField && phoneField.value && !validatePhone(phoneField.value)) {
        showFieldError(phoneField, 'Please enter a valid phone number');
        isValid = false;
    }

    return isValid;
}

// Validate individual field
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    clearFieldError(field);
    
    // Check if required field is empty
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    // Validate email
    if (field.type === 'email' && value && !validateEmail(value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
    }
    
    // Validate phone
    if (field.type === 'tel' && value && !validatePhone(value)) {
        showFieldError(field, 'Please enter a valid phone number');
        return false;
    }
    
    // Validate message length
    if (field.name === 'message' && value && value.length < 10) {
        showFieldError(field, 'Please provide a more detailed message');
        return false;
    }
    
    return true;
}

// Show field error
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.style.borderColor = 'var(--danger-color)';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = `
        color: var(--danger-color);
        font-size: var(--font-sm);
        margin-top: var(--spacing-xs);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    `;
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    field.parentNode.appendChild(errorDiv);
}

// Clear field error
function clearFieldError(field) {
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
    field.style.borderColor = '';
}

// Validate phone number
function validatePhone(phone) {
    // Simple phone validation - allows various formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
}

// Setup contact actions
function setupContactActions() {
    // Set up contact option buttons
    const contactOptions = document.querySelectorAll('.contact-option-card');
    contactOptions.forEach(card => {
        card.addEventListener('click', () => {
            card.style.transform = 'translateY(-12px) scale(1.02)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);
        });
    });
}

// Contact action functions
function openLiveChat() {
    showToast('info', 'Opening live chat...', 'fas fa-comments');
    
    // Simulate opening chat widget
    setTimeout(() => {
        showToast('success', 'Live chat opened! Our support team will be with you shortly.', 'fas fa-check');
    }, 1000);
}

function openSupportTicket() {
    showToast('info', 'Redirecting to support portal...', 'fas fa-ticket-alt');
    
    // Simulate redirect
    setTimeout(() => {
        window.open('https://support.bioqr.com/tickets/new', '_blank');
    }, 1000);
}

function scheduleCall() {
    showToast('info', 'Opening calendar booking...', 'fas fa-calendar-alt');
    
    // Simulate calendar booking
    setTimeout(() => {
        window.open('https://calendly.com/bioqr-sales', '_blank');
    }, 1000);
}

function scrollToForm() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = form.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }, 500);
    }
}

// Show thank you message
function showThankYouMessage() {
    const thankYouModal = document.createElement('div');
    thankYouModal.className = 'thank-you-modal';
    thankYouModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1100;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    thankYouModal.innerHTML = `
        <div class="thank-you-content" style="
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            border-radius: var(--radius-2xl);
            padding: var(--spacing-2xl);
            text-align: center;
            max-width: 500px;
            margin: var(--spacing-lg);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transform: translateY(20px);
            transition: transform 0.3s ease;
        ">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, var(--success-color), var(--secondary-color));
                border-radius: var(--radius-full);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto var(--spacing-lg);
            ">
                <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
            </div>
            <h2 style="margin-bottom: var(--spacing-md); color: var(--text-primary);">Thank You!</h2>
            <p style="margin-bottom: var(--spacing-lg); color: var(--text-secondary);">
                Your message has been sent successfully. Our team will review your inquiry and get back to you within 24 hours.
            </p>
            <p style="margin-bottom: var(--spacing-xl); color: var(--text-tertiary); font-size: var(--font-sm);">
                For urgent matters, you can reach us directly at <strong>+91 98765 43210</strong> or via our live chat.
            </p>
            <button onclick="closeThankYouModal()" class="btn btn-primary">
                <i class="fas fa-arrow-right"></i>
                Continue
            </button>
        </div>
    `;
    
    document.body.appendChild(thankYouModal);
    
    // Animate in
    setTimeout(() => {
        thankYouModal.style.opacity = '1';
        const content = thankYouModal.querySelector('.thank-you-content');
        content.style.transform = 'translateY(0)';
    }, 100);
    
    // Auto close after 10 seconds
    setTimeout(() => {
        closeThankYouModal();
    }, 10000);
}

function closeThankYouModal() {
    const modal = document.querySelector('.thank-you-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    
    // Reset form state
    contactState.formSubmitted = false;
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        submitBtn.disabled = false;
    }
}

// Auto-save form data
function setupFormAutoSave() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea, select');
    
    // Load saved data
    const savedData = getLocalStorage('contactFormData', {});
    inputs.forEach(input => {
        if (savedData[input.name]) {
            input.value = savedData[input.name];
        }
    });
    
    // Save on input
    inputs.forEach(input => {
        input.addEventListener('input', debounce(() => {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            setLocalStorage('contactFormData', data);
        }, 1000));
    });
    
    // Clear saved data on successful submission
    form.addEventListener('submit', () => {
        setTimeout(() => {
            if (contactState.formSubmitted) {
                setLocalStorage('contactFormData', {});
            }
        }, 2000);
    });
}

// Global functions
window.openLiveChat = openLiveChat;
window.openSupportTicket = openSupportTicket;
window.scheduleCall = scheduleCall;
window.scrollToForm = scrollToForm;
window.closeThankYouModal = closeThankYouModal;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initContact();
        setupFormAutoSave();
    });
} else {
    initContact();
    setupFormAutoSave();
}
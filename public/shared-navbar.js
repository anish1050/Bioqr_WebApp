// Shared Navbar JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-nav');
    const menuIcon = mobileMenuBtn.querySelector('.menu-icon');
    const closeIcon = mobileMenuBtn.querySelector('.close-icon');
    
    let isMenuOpen = false;
    
    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', function() {
        isMenuOpen = !isMenuOpen;
        
        if (isMenuOpen) {
            mainNav.classList.add('nav-open');
            menuIcon.style.display = 'none';
            closeIcon.style.display = 'block';
        } else {
            mainNav.classList.remove('nav-open');
            menuIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (isMenuOpen && !mainNav.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
            isMenuOpen = false;
            mainNav.classList.remove('nav-open');
            menuIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        }
    });
    
    // Close menu when clicking on a nav link (mobile)
    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 1024) {
                isMenuOpen = false;
                mainNav.classList.remove('nav-open');
                menuIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            }
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024 && isMenuOpen) {
            isMenuOpen = false;
            mainNav.classList.remove('nav-open');
            menuIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        }
    });
    
    // Set active page navigation
    setActiveNavigation();
});

// Function to set active navigation based on current page
function setActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.main-nav a');
    
    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        
        // Remove any existing active classes
        link.classList.remove('active');
        
        // Add active class to current page
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
        
        // Special case for home page
        if (currentPath === '/' && (linkPath === '/' || linkPath === '/index.html')) {
            link.classList.add('active');
        }
    });
}

// Add active page styling
const style = document.createElement('style');
style.textContent = `
    .main-nav a.active {
        color: var(--accent) !important;
    }
    
    .main-nav a.active::after {
        width: 100% !important;
        background: var(--gradient-accent) !important;
    }
`;
document.head.appendChild(style);
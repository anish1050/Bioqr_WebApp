// Global variables
let currentUserId = 1; // This would normally come from login session
const API_BASE = 'http://localhost:3000';
let currentSection = 'dashboard';

// Token management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE}/bioqr/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (response.ok && data.success && data.tokens) {
      console.log('🔄 Access token refreshed successfully');
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      processQueue(null, data.tokens.accessToken);
      return data.tokens.accessToken;
    } else {
      throw new Error(data.message || 'Refresh failed');
    }
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    processQueue(error, null);
    forceRedirectToLogin();
    throw error;
  } finally {
    isRefreshing = false;
  }
}

async function authenticatedFetch(url, options = {}) {
  // Deep clone options to avoid mutating original
  const fetchOptions = { ...options };
  fetchOptions.headers = { ...fetchOptions.headers };

  // Add auth header
  let accessToken = localStorage.getItem('accessToken');
  if (accessToken && !fetchOptions.headers['Authorization']) {
    fetchOptions.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    let response = await fetch(url, fetchOptions);

    if (response.status === 401 || response.status === 403) {
       // Clone response to check body without consuming it
       try {
          const clonedRes = response.clone();
          const errorData = await clonedRes.json();
          
          if (errorData.message && (errorData.message.includes('expired') || errorData.message.includes('valid') || errorData.message.includes('Access token required'))) {
              console.log('🔄 Token likely expired, attempting refresh...');
              const newToken = await refreshAccessToken();
              
              // Retry request with new token
              fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
              return fetch(url, fetchOptions);
          }
       } catch (e) {
          // If we can't parse JSON or specifically identify expiry, we might still want to try refreshing for 403/401
          // But strict checking prevents infinite loops on genuine unauthorized access
          if (response.status === 401 && !isRefreshing) {
             const newToken = await refreshAccessToken();
             fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
             return fetch(url, fetchOptions);
          }
       }
    }
    return response;
  } catch (error) {
    throw error;
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Dashboard initialized');
  
  // Check for OAuth tokens in URL (from social login)
  handleOAuthTokens();
  
  // Comprehensive authentication check
  if (!isUserAuthenticated()) {
    console.log('❌ Authentication failed, redirecting to login...');
    forceRedirectToLogin();
    return;
  }
  
  // Prevent browser caching
  preventBrowserCaching();
  
  // Set up session monitoring
  setupSessionMonitoring();
  
  // Parse user info and update UI
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo);
      currentUserId = user.id;
      
      // Try to enhance profile with social data if available
      if (user.provider && user.access_token) {
        enhanceUserProfileWithSocialData(user)
          .then(enhancedUser => {
            // Update localStorage with enhanced data
            localStorage.setItem('userInfo', JSON.stringify(enhancedUser));
            updateUserProfile(enhancedUser);
          })
          .catch(error => {
            console.warn('Failed to enhance user profile:', error);
            updateUserProfile(user);
          });
      } else {
        updateUserProfile(user);
      }
    } catch (e) {
      console.error('Error parsing user info:', e);
    }
  }
  
  // Initialize UI components
  initializeNavigation();
  initializeFileUpload();
  initializeMobileMenu();
  initializeLogout();
  
  // Also initialize search functionality
  initializeSearch();
  
  // Load initial data
  fetchFiles();
  updateStats();
  
  // Show welcome section by default
  showSection('dashboard');
});

// Comprehensive authentication check function
function isUserAuthenticated() {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userInfo = localStorage.getItem('userInfo');
  const logoutFlag = localStorage.getItem('userLoggedOut');
  
  // Check if user manually logged out
  if (logoutFlag === 'true') {
    console.log('🔐 User previously logged out');
    return false;
  }
  
  // Check if tokens exist
  if (!accessToken || !refreshToken || !userInfo) {
    console.log('🔐 Missing authentication tokens');
    return false;
  }
  
  // Verify token format (basic check)
  try {
    JSON.parse(userInfo);
    return true;
  } catch (e) {
    console.log('🔐 Invalid user info format');
    return false;
  }
}

// Handle OAuth tokens from URL
function handleOAuthTokens() {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('token');
  const refreshToken = urlParams.get('refresh');
  const userInfo = urlParams.get('user');
  const provider = urlParams.get('provider');
  const socialAccessToken = urlParams.get('social_token');
  
  if (accessToken && refreshToken && userInfo) {
    try {
      const decodedUserInfo = decodeURIComponent(userInfo);
      const user = JSON.parse(decodedUserInfo);
      
      // Add provider and social access token if available
      if (provider) {
        user.provider = provider;
      }
      if (socialAccessToken) {
        user.access_token = socialAccessToken;
      }
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userInfo', JSON.stringify(user));
      localStorage.removeItem('userLoggedOut');
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      console.log('✅ OAuth tokens stored successfully');
      
      // Enhance profile with social data if available
      if (user.provider && user.access_token) {
        enhanceUserProfileWithSocialData(user)
          .then(enhancedUser => {
            localStorage.setItem('userInfo', JSON.stringify(enhancedUser));
            updateUserProfile(enhancedUser);
            showToast(`Welcome ${getUserDisplayName(enhancedUser)}! Login successful.`, 'success');
          })
          .catch(error => {
            console.warn('Failed to enhance profile:', error);
            updateUserProfile(user);
            showToast(`Welcome ${getUserDisplayName(user)}! Login successful.`, 'success');
          });
      } else {
        updateUserProfile(user);
        showToast(`Welcome ${getUserDisplayName(user)}! Login successful.`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Error handling OAuth tokens:', error);
      showToast('Authentication error occurred.', 'error');
    }
  }
}

// Prevent browser caching
function preventBrowserCaching() {
  // Set cache control headers via JavaScript
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
  
  // Add no-cache headers to all future requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    if (args[1]) {
      args[1].headers = {
        ...args[1].headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
    }
    return originalFetch.apply(this, args);
  };
}

// Session monitoring and security
function setupSessionMonitoring() {
  // Monitor for other tab logouts
  window.addEventListener('storage', function(e) {
    if (e.key === 'userLoggedOut' && e.newValue === 'true') {
      console.log('🔐 User logged out from another tab');
      forceRedirectToLogin();
    }
  });
  
  // Periodic token validation
  setInterval(async () => {
    if (!await validateSession()) {
      console.log('🔐 Session validation failed');
      forceRedirectToLogin();
    }
  }, 300000); // Check every 5 minutes
}

// Validate session with server
async function validateSession() {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return false;
  
  try {
    const response = await authenticatedFetch(`${API_BASE}/api/validate-session`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

// Force redirect to login
function forceRedirectToLogin() {
  localStorage.setItem('userLoggedOut', 'true');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userInfo');
  
  // Clear any cached data
  clearCachedData();
  
  window.location.href = '/login.html';
}

// Clear cached data
function clearCachedData() {
  // Clear any dashboard-specific cached data
  sessionStorage.clear();
}

// Helper function to determine the best display name for a user
function getUserDisplayName(user) {
  // Priority order for display names:
  // 1. Full name from social providers (GitHub, Google)
  // 2. Username
  // 3. Name field
  // 4. Extract name from email
  // 5. Default fallback
  
  // Check for social login names
  if (user.provider) {
    if (user.provider === 'github' && user.github_name) {
      return user.github_name;
    }
    if (user.provider === 'google' && user.google_name) {
      return user.google_name;
    }
  }
  
  // Check for username (preferred for regular accounts)
  if (user.username && user.username !== user.email) {
    return user.username;
  }
  
  // Check for explicit name field
  if (user.name && user.name.trim()) {
    return user.name.trim();
  }
  
  // Try to extract name from display_name or full_name fields
  if (user.display_name && user.display_name.trim()) {
    return user.display_name.trim();
  }
  
  if (user.full_name && user.full_name.trim()) {
    return user.full_name.trim();
  }
  
  // Extract name from email (before @)
  if (user.email) {
    const emailName = user.email.split('@')[0];
    // Clean up common email patterns
    return emailName.replace(/[._-]/g, ' ').replace(/\d+$/g, '').trim() || emailName;
  }
  
  // Final fallback
  return 'User';
}

// Helper function to generate initials from a name
function getInitials(name) {
  if (!name || typeof name !== 'string') {
    return 'U';
  }
  
  // Split name into words and take first letter of each
  const words = name.trim().split(/\s+/);
  
  if (words.length === 1) {
    // Single word - take first two characters
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple words - take first letter of first two words
    return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
  }
}

// Enhanced function to fetch user profile data from social providers
async function enhanceUserProfileWithSocialData(user) {
  if (!user.provider || !user.access_token) {
    return user;
  }
  
  // Check if we already have cached profile data
  const cacheKey = `profile_${user.provider}_${user.id}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      // Check if cache is less than 1 hour old
      if (Date.now() - parsed.timestamp < 3600000) {
        return { ...user, ...parsed.data };
      }
    } catch (e) {
      // Invalid cache, continue to fetch
    }
  }
  
  try {
    let profileData = {};
    
    if (user.provider === 'github') {
      profileData = await fetchGitHubProfile(user.access_token);
    } else if (user.provider === 'google') {
      profileData = await fetchGoogleProfile(user.access_token);
    }
    
    // Cache the profile data
    localStorage.setItem(cacheKey, JSON.stringify({
      data: profileData,
      timestamp: Date.now()
    }));
    
    // Merge the profile data with existing user data
    return { ...user, ...profileData };
  } catch (error) {
    console.warn('Failed to fetch enhanced profile data:', error);
    return user;
  }
}

// Fetch GitHub profile information
async function fetchGitHubProfile(accessToken) {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'BioQR-App'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        github_name: data.name || data.login,
        github_avatar: data.avatar_url,
        github_bio: data.bio,
        github_location: data.location,
        github_company: data.company
      };
    }
  } catch (error) {
    console.error('Error fetching GitHub profile:', error);
  }
  
  return {};
}

// Fetch Google profile information
async function fetchGoogleProfile(accessToken) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        google_name: data.name,
        google_avatar: data.picture,
        google_given_name: data.given_name,
        google_family_name: data.family_name,
        google_locale: data.locale
      };
    }
  } catch (error) {
    console.error('Error fetching Google profile:', error);
  }
  
  return {};
}

// Update user avatar with profile picture or initials
function updateUserAvatar(user, initialsElement) {
  const avatarContainer = document.getElementById('user-avatar');
  if (!avatarContainer) return;
  
  let avatarUrl = null;
  
  // Check for social provider avatars
  if (user.provider === 'github' && user.github_avatar) {
    avatarUrl = user.github_avatar;
  } else if (user.provider === 'google' && user.google_avatar) {
    avatarUrl = user.google_avatar;
  } else if (user.avatar_url) {
    avatarUrl = user.avatar_url;
  }
  
  if (avatarUrl) {
    // Create or update profile image
    let imgElement = avatarContainer.querySelector('.profile-image');
    if (!imgElement) {
      imgElement = document.createElement('img');
      imgElement.className = 'profile-image';
      imgElement.style.cssText = `
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        display: block;
      `;
      avatarContainer.appendChild(imgElement);
    }
    
    // Hide initials and show image
    if (initialsElement) {
      initialsElement.style.display = 'none';
    }
    
    imgElement.src = avatarUrl;
    imgElement.alt = `${getUserDisplayName(user)}'s avatar`;
    
    // Handle image load error - fallback to initials
    imgElement.onerror = () => {
      imgElement.style.display = 'none';
      if (initialsElement) {
        initialsElement.style.display = 'block';
      }
    };
    
  } else {
    // Remove any existing profile image and show initials
    const existingImg = avatarContainer.querySelector('.profile-image');
    if (existingImg) {
      existingImg.remove();
    }
    
    if (initialsElement) {
      initialsElement.style.display = 'block';
    }
  }
}

// Update user profile in UI
function updateUserProfile(user) {
  // Determine the best display name based on available data
  const displayName = getUserDisplayName(user);
  const userEmail = user.email || '';
  
  // Update user profile in sidebar
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userInitialsEl = document.getElementById('user-initials');
  const welcomeNameEl = document.getElementById('welcome-name');
  
  if (userNameEl) userNameEl.textContent = displayName;
  if (userEmailEl) userEmailEl.textContent = userEmail;
  if (welcomeNameEl) welcomeNameEl.textContent = displayName;
  
  if (userInitialsEl) {
    const initials = getInitials(displayName);
    userInitialsEl.textContent = initials;
  }
  
  // Update user avatar with profile picture if available
  updateUserAvatar(user, userInitialsEl);
  
  // Update hidden user ID field
  const userIdField = document.getElementById('user_id');
  if (userIdField) userIdField.value = user.id || currentUserId;
}

// Initialize navigation
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      showSection(section);
      
      // Update active state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// Show specific section
function showSection(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => section.classList.remove('active'));
  
  // Show target section
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
    currentSection = sectionName;
    
    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      pageTitle.textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    }
    
    // Load section-specific data
    if (sectionName === 'files') {
      fetchFiles();
    } else if (sectionName === 'dashboard') {
      loadDashboardData();
    }
  }
}

// Make showSection globally available
window.showSection = showSection;

// Load dashboard data
function loadDashboardData() {
  fetchFiles();
  updateStats();
  loadRecentActivity();
}

// Initialize mobile menu
function initializeMobileMenu() {
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const navbarNav = document.querySelector('.navbar-nav');
  
  if (mobileToggle && navbarNav) {
    mobileToggle.addEventListener('click', () => {
      navbarNav.classList.toggle('mobile-open');
    });
    
    // Close nav when clicking outside
    document.addEventListener('click', (e) => {
      if (!navbarNav.contains(e.target) && !mobileToggle.contains(e.target)) {
        navbarNav.classList.remove('mobile-open');
      }
    });
  }
}

// Initialize file upload
function initializeFileUpload() {
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('file-drop-zone');
  const uploadForm = document.getElementById('uploadForm');
  const selectedFilesContainer = document.getElementById('selected-files');
  
  if (!fileInput || !dropZone || !uploadForm) return;
  
  // File input change handler
  fileInput.addEventListener('change', handleFileSelection);
  
  // Drag and drop handlers
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);
  
  // Form submit handler
  uploadForm.addEventListener('submit', handleFileUpload);
  
  // Browse link handler
  const browseLink = dropZone.querySelector('.browse-link');
  if (browseLink) {
    browseLink.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }
}

// Handle file selection
function handleFileSelection(e) {
  const files = Array.from(e.target.files);
  displaySelectedFiles(files);
}

// Handle drag over
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
}

// Handle file drop
function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  
  const files = Array.from(e.dataTransfer.files);
  const fileInput = document.getElementById('fileInput');
  
  // Update file input
  const dt = new DataTransfer();
  files.forEach(file => dt.items.add(file));
  fileInput.files = dt.files;
  
  displaySelectedFiles(files);
}

// Display selected files
function displaySelectedFiles(files) {
  const container = document.getElementById('selected-files');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (files.length === 0) return;
  
  const fileList = document.createElement('div');
  fileList.className = 'selected-file-list';
  
  files.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'selected-file-item';
    fileItem.innerHTML = `
      <div class="file-details">
        <span class="file-name">${file.name}</span>
        <span class="file-size">${formatFileSize(file.size)}</span>
      </div>
      <button type="button" class="remove-file" data-index="${index}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    
    fileList.appendChild(fileItem);
  });
  
  container.appendChild(fileList);
  
  // Add remove file handlers
  container.querySelectorAll('.remove-file').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      removeFile(index);
    });
  });
}

// Remove file from selection
function removeFile(index) {
  const fileInput = document.getElementById('fileInput');
  const files = Array.from(fileInput.files);
  
  files.splice(index, 1);
  
  const dt = new DataTransfer();
  files.forEach(file => dt.items.add(file));
  fileInput.files = dt.files;
  
  displaySelectedFiles(files);
}

// Handle file upload
async function handleFileUpload(e) {
  e.preventDefault();
  
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  
  console.log('🚀 File upload started');
  
  // Validate file input exists
  if (!fileInput) {
    console.error('❌ File input element not found');
    showToast('Upload form error. Please refresh the page.', 'error');
    return;
  }
  
  // Validate files are selected
  if (!fileInput.files.length) {
    console.log('❌ No files selected');
    showToast('Please select at least one file to upload.', 'error');
    return;
  }
  
  console.log(`📁 Selected ${fileInput.files.length} file(s)`);
  
  // Check authentication
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    console.error('❌ No access token found');
    showToast('Please log in to upload files.', 'error');
    forceRedirectToLogin();
    return;
  }
  
  // Validate file sizes
  const maxSize = 10 * 1024 * 1024; // 10MB
  const files = Array.from(fileInput.files);
  const oversizedFiles = files.filter(file => file.size > maxSize);
  
  if (oversizedFiles.length > 0) {
    console.error('❌ Files too large:', oversizedFiles.map(f => `${f.name}: ${formatFileSize(f.size)}`));
    showToast(`File(s) too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum size is 10MB.`, 'error');
    return;
  }
  
  // Validate current user ID
  if (!currentUserId) {
    console.error('❌ No user ID available');
    showToast('User session error. Please log in again.', 'error');
    forceRedirectToLogin();
    return;
  }
  
  console.log('✅ All validations passed, starting upload...');
  
  // Validate empty files
  const emptyFiles = files.filter(file => file.size === 0);
  if (emptyFiles.length > 0) {
    console.error('❌ Empty files detected:', emptyFiles.map(f => f.name));
    showToast(`Cannot upload empty files: ${emptyFiles.map(f => f.name).join(', ')}`, 'error');
    return;
  }
  
  // Show loading state
  const btnText = uploadBtn.querySelector('.btn-text');
  const btnLoader = uploadBtn.querySelector('.btn-loader');
  
  if (!btnText || !btnLoader) {
    console.error('❌ Upload button elements not found');
    showToast('Upload form error. Please refresh the page.', 'error');
    return;
  }
  
  btnText.style.display = 'none';
  btnLoader.style.display = 'flex';
  uploadBtn.disabled = true;
  
  // Update button text to show progress for multiple files
  if (files.length > 1) {
    const loaderText = btnLoader.querySelector('span') || btnLoader;
    if (loaderText.tagName !== 'DIV') {
      loaderText.textContent = `Uploading 0/${files.length} files...`;
    }
  }
  
  try {
    const accessToken = localStorage.getItem('accessToken');
    const files = Array.from(fileInput.files);
    const uploadResults = [];
    
    // Upload files one by one since server expects single file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file); // Server expects 'file', not 'files'
      formData.append('user_id', currentUserId);
      
      console.log(`🚀 Uploading file ${i + 1}/${files.length}: ${file.name} (${formatFileSize(file.size)})`);
      
      // Update progress in button for multiple files
      if (files.length > 1) {
        const loaderText = btnLoader.querySelector('span');
        if (loaderText && loaderText.tagName !== 'DIV') {
          loaderText.textContent = `Uploading ${i + 1}/${files.length} files...`;
        }
      }
      
      const response = await authenticatedFetch(`${API_BASE}/bioqr/files/upload`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error(`❌ Failed to upload ${file.name}:`, result);
        throw new Error(result.message || `Failed to upload ${file.name}`);
      }
      
      console.log(`✅ Successfully uploaded ${file.name} with ID:`, result.file_id);
      uploadResults.push({ file: file.name, result });
      
      // Show individual progress for multiple files (but not too spammy)
      if (files.length > 1 && files.length <= 5) {
        showToast(`Uploaded ${i + 1}/${files.length}: ${file.name}`, 'success');
      }
    }
    
    // All files uploaded successfully
    showToast(`Successfully uploaded ${uploadResults.length} file(s)!`, 'success');
    
    // Clear form
    fileInput.value = '';
    document.getElementById('selected-files').innerHTML = '';
    
    // Refresh file list
    fetchFiles();
    updateStats();
  } catch (error) {
    console.error('Upload error:', error);
    
    // Show more specific error message
    let errorMessage = 'Upload failed. Please try again.';
    
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message.includes('401')) {
      errorMessage = 'Authentication failed. Please log in again.';
      // Redirect to login if token expired
      setTimeout(() => {
        forceRedirectToLogin();
      }, 2000);
    } else if (error.message.includes('413')) {
      errorMessage = 'File too large. Maximum size is 10MB.';
    } else if (error.message.includes('400')) {
      errorMessage = 'Invalid file format or bad request.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    showToast(errorMessage, 'error');
  } finally {
    // Reset button state
    btnText.style.display = 'flex';
    btnLoader.style.display = 'none';
    uploadBtn.disabled = false;
  }
}

// Fetch and display files
async function fetchFiles() {
  const loadingEl = document.getElementById('loading');
  const containerEl = document.getElementById('file-container');
  
  if (loadingEl) loadingEl.style.display = 'flex';
  
  try {
    const response = await authenticatedFetch(`${API_BASE}/bioqr/files/${currentUserId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }
    
    const data = await response.json();
    const files = data.files || [];
    displayFiles(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    showToast('Failed to load files.', 'error');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// Display files in the UI
function displayFiles(files) {
  const container = document.getElementById('file-container');
  if (!container) return;
  
  if (files.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13,2 13,9 20,9"/>
          </svg>
        </div>
        <h4>No files uploaded yet</h4>
        <p>Upload your first file to get started</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = files.map(file => `
    <div class="file-item" data-file-id="${file.id}">
      <div class="file-name">${file.filename}</div>
      <div class="file-info">
        <span>Size: ${formatFileSize(file.size)}</span> •
        <span>Uploaded: ${formatDate(file.uploaded_at)}</span>
      </div>
      <div class="file-actions">
        <button class="btn view-btn" onclick="viewFile(${file.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
          View
        </button>
        <button class="btn delete-btn" onclick="deleteFile(${file.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
          </svg>
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Update statistics
async function updateStats() {
  try {
    const response = await authenticatedFetch(`${API_BASE}/bioqr/files/${currentUserId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const files = data.files || [];
      
      // Calculate stats from files
      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
      
      // Update header stats
      const totalFilesEl = document.getElementById('total-files');
      const totalSizeEl = document.getElementById('total-size');
      
      if (totalFilesEl) totalFilesEl.textContent = totalFiles;
      if (totalSizeEl) totalSizeEl.textContent = formatFileSize(totalSize);
      
      // Update dashboard stats cards
      const statTotalFilesEl = document.getElementById('stat-total-files');
      const statStorageUsedEl = document.getElementById('stat-storage-used');
      
      if (statTotalFilesEl) statTotalFilesEl.textContent = totalFiles;
      if (statStorageUsedEl) statStorageUsedEl.textContent = formatFileSize(totalSize);
    }
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Load recent activity
async function loadRecentActivity() {
  try {
    const response = await authenticatedFetch(`${API_BASE}/bioqr/files/${currentUserId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const files = (data.files || []).slice(0, 5); // Get only first 5 for recent activity
      displayRecentActivity(files);
    }
  } catch (error) {
    console.error('Error loading recent activity:', error);
  }
}

// Display recent activity
function displayRecentActivity(files) {
  const container = document.getElementById('recent-files');
  if (!container) return;
  
  if (files.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No recent activity</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = files.slice(0, 5).map(file => {
    const preview = generateFilePreview(file);
    return `
      <div class="activity-item" onclick="viewFile(${file.id})" style="cursor: pointer;">
        <div class="activity-preview">
          ${preview}
        </div>
        <div class="activity-content">
          <span class="activity-name">${file.filename}</span>
          <div class="activity-meta">
            <span class="activity-size">${formatFileSize(file.size)}</span>
            <span class="activity-time">${formatDate(file.uploaded_at)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Generate file preview based on file type
function generateFilePreview(file) {
  const extension = file.filename.split('.').pop()?.toLowerCase() || '';
  
  if (file.mimetype.startsWith('image/')) {
    return `
      <div class="file-preview-image">
        <img src="${file.url}" alt="${file.filename}" loading="lazy" />
      </div>
    `;
  } else if (file.mimetype.startsWith('video/')) {
    return `
      <div class="file-preview-video">
        <video preload="metadata">
          <source src="${file.url}" type="${file.mimetype}">
        </video>
        <div class="video-overlay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5,3 19,12 5,21 5,3"/>
          </svg>
        </div>
      </div>
    `;
  } else if (file.mimetype.startsWith('audio/')) {
    return `
      <div class="file-preview-audio">
        <div class="audio-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
      </div>
    `;
  } else {
    // For other file types, show an icon based on extension
    const iconInfo = getFileIcon(extension);
    return `
      <div class="file-preview-document">
        <div class="document-icon" style="background: ${iconInfo.color};">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${iconInfo.svg}
          </svg>
          <span class="file-extension">${extension.toUpperCase()}</span>
        </div>
      </div>
    `;
  }
}

// Get file icon and color based on extension
function getFileIcon(extension) {
  const iconMap = {
    pdf: {
      color: '#e74c3c',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'
    },
    doc: {
      color: '#2980b9',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'
    },
    docx: {
      color: '#2980b9',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'
    },
    xls: {
      color: '#27ae60',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'
    },
    xlsx: {
      color: '#27ae60',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'
    },
    ppt: {
      color: '#e67e22',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'
    },
    pptx: {
      color: '#e67e22',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'
    },
    txt: {
      color: '#95a5a6',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>'
    },
    zip: {
      color: '#f39c12',
      svg: '<path d="M16 22h2a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3"/><polyline points="14,2 14,8 20,8"/><path d="M10 20v-1a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0Z"/><path d="M10 7h4"/><path d="M10 11h4"/>'
    },
    default: {
      color: '#7f8c8d',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'
    }
  };
  
  return iconMap[extension] || iconMap.default;
}


// View file
async function viewFile(fileId) {
  try {
    const response = await authenticatedFetch(`${API_BASE}/bioqr/files/download/${fileId}`);
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      throw new Error('Failed to view file');
    }
  } catch (error) {
    console.error('Error viewing file:', error);
    showToast('Failed to open file.', 'error');
  }
}

// Make viewFile globally available
window.viewFile = viewFile;

// Delete file
async function deleteFile(fileId) {
  if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await authenticatedFetch(`${API_BASE}/bioqr/files/delete/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      showToast('File deleted successfully.', 'success');
      fetchFiles();
      updateStats();
    } else {
      throw new Error('Failed to delete file');
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    showToast('Failed to delete file.', 'error');
  }
}

// Make deleteFile globally available
window.deleteFile = deleteFile;

// Initialize logout
function initializeLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// Handle logout
function handleLogout(e) {
  e.preventDefault();
  
  if (confirm('Are you sure you want to logout?')) {
    console.log('🔐 User logging out...');
    
    // Set logout flag
    localStorage.setItem('userLoggedOut', 'true');
    
    // Clear all authentication data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    
    // Clear session data
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = '/login.html';
  }
}

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Link copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy link.', 'error');
  });
}

// Make copyToClipboard globally available
window.copyToClipboard = copyToClipboard;

// Toast notification system
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = toast.querySelector('.toast-message');
  const toastIcon = toast.querySelector('.toast-icon');
  
  // Set message
  toastMessage.textContent = message;
  
  // Set icon based on type
  let iconSvg = '';
  switch (type) {
    case 'success':
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #22c55e;"><polyline points="20,6 9,17 4,12"/></svg>';
      break;
    case 'error':
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      break;
    case 'warning':
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #f59e0b;"><path d="m21.73,18-8-14a2,2 0 0,0 -3.46,0l-8,14A2,2 0 0,0 4,21H20A2,2 0 0,0 21.73,18Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      break;
    default:
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #0ea5e9;"><circle cx="12" cy="12" r="10"/><path d="m9,9h6"/><path d="m9,15h6"/></svg>';
  }
  
  toastIcon.innerHTML = iconSvg;
  
  // Show toast
  toast.classList.add('show');
  
  // Auto hide after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 5000);
  
  // Close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.onclick = () => {
    toast.classList.remove('show');
  };
}

// Search functionality
function initializeSearch() {
  const searchInput = document.getElementById('file-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const fileItems = document.querySelectorAll('.file-item');
      
      fileItems.forEach(item => {
        const fileName = item.querySelector('.file-name')?.textContent.toLowerCase() || '';
        if (fileName.includes(searchTerm)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
}
// File Upload Debugging and Testing Utilities
// Run these functions in the browser console to debug file upload issues

// Test file upload functionality
function testFileUploadSetup() {
  console.log('🔍 Testing file upload setup...\n');
  
  const checks = [
    {
      name: 'File input element exists',
      test: () => document.getElementById('fileInput'),
      fix: 'Ensure dashboard.html has <input type="file" id="fileInput" />'
    },
    {
      name: 'Drop zone element exists',
      test: () => document.getElementById('file-drop-zone'),
      fix: 'Ensure dashboard.html has <div id="file-drop-zone">'
    },
    {
      name: 'Upload form exists',
      test: () => document.getElementById('uploadForm'),
      fix: 'Ensure dashboard.html has <form id="uploadForm">'
    },
    {
      name: 'Upload button exists',
      test: () => document.getElementById('uploadBtn'),
      fix: 'Ensure dashboard.html has <button id="uploadBtn">'
    },
    {
      name: 'Selected files container exists',
      test: () => document.getElementById('selected-files'),
      fix: 'Ensure dashboard.html has <div id="selected-files">'
    },
    {
      name: 'Access token exists',
      test: () => localStorage.getItem('accessToken'),
      fix: 'User needs to log in. Token missing from localStorage.'
    },
    {
      name: 'User ID is set',
      test: () => window.currentUserId,
      fix: 'currentUserId global variable is not set. Check authentication flow.'
    },
    {
      name: 'API_BASE is defined',
      test: () => window.API_BASE,
      fix: 'API_BASE global variable is not set. Should be "http://localhost:3000"'
    },
    {
      name: 'handleFileUpload function exists',
      test: () => typeof handleFileUpload === 'function',
      fix: 'handleFileUpload function is not defined. Check dashboard.js loading.'
    },
    {
      name: 'initializeFileUpload function exists',
      test: () => typeof initializeFileUpload === 'function',
      fix: 'initializeFileUpload function is not defined. Check dashboard.js loading.'
    }
  ];
  
  const results = checks.map(check => {
    const result = check.test();
    const status = result ? '✅ PASS' : '❌ FAIL';
    
    console.log(`${status} - ${check.name}`);
    if (!result) {
      console.log(`   Fix: ${check.fix}`);
    } else if (typeof result === 'string' || typeof result === 'number') {
      console.log(`   Value: ${result}`);
    }
    
    return { ...check, passed: !!result, value: result };
  });
  
  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n📊 Summary: ${passedCount}/${results.length} checks passed`);
  
  if (passedCount === results.length) {
    console.log('🎉 All checks passed! File upload should work correctly.');
  } else {
    console.log('⚠️  Some checks failed. Fix the issues above before testing upload.');
  }
  
  return results;
}

// Test server connectivity
async function testServerConnectivity() {
  console.log('🌐 Testing server connectivity...\n');
  
  const API_BASE = window.API_BASE || 'http://localhost:3000';
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    console.log('❌ No access token found. Please log in first.');
    return false;
  }
  
  try {
    // Test authentication endpoint
    console.log('Testing authentication...');
    const authResponse = await fetch(`${API_BASE}/bioqr/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (authResponse.ok) {
      const userData = await authResponse.json();
      console.log('✅ Authentication working. User:', userData.user?.username || userData.user?.email);
    } else {
      console.log('❌ Authentication failed:', authResponse.status, authResponse.statusText);
      return false;
    }
    
    // Test file listing endpoint
    console.log('Testing file listing...');
    const currentUserId = window.currentUserId || (JSON.parse(localStorage.getItem('userInfo') || '{}')).id;
    
    if (!currentUserId) {
      console.log('❌ No user ID available');
      return false;
    }
    
    const filesResponse = await fetch(`${API_BASE}/bioqr/files/${currentUserId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (filesResponse.ok) {
      const filesData = await filesResponse.json();
      console.log('✅ File listing working. Files count:', filesData.files?.length || 0);
    } else {
      console.log('❌ File listing failed:', filesResponse.status, filesResponse.statusText);
      return false;
    }
    
    console.log('🎉 Server connectivity test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Server connectivity test failed:', error.message);
    return false;
  }
}

// Create a test file blob for upload testing
function createTestFile(name = 'test.txt', content = 'This is a test file created by the upload debugger.') {
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name, { type: 'text/plain' });
  
  console.log('📄 Created test file:', {
    name: file.name,
    size: file.size,
    type: file.type
  });
  
  return file;
}

// Simulate file selection for testing
function simulateFileSelection(files = null) {
  if (!files) {
    files = [createTestFile()];
  }
  
  const fileInput = document.getElementById('fileInput');
  if (!fileInput) {
    console.error('❌ File input not found');
    return false;
  }
  
  // Create DataTransfer to simulate file selection
  const dt = new DataTransfer();
  files.forEach(file => dt.items.add(file));
  
  fileInput.files = dt.files;
  
  // Trigger change event
  const event = new Event('change', { bubbles: true });
  fileInput.dispatchEvent(event);
  
  console.log(`✅ Simulated selection of ${files.length} file(s)`);
  return true;
}

// Test complete upload flow
async function testCompleteUploadFlow() {
  console.log('🧪 Testing complete upload flow...\n');
  
  // Step 1: Setup checks
  console.log('Step 1: Checking setup...');
  const setupResults = testFileUploadSetup();
  const setupPassed = setupResults.every(r => r.passed);
  
  if (!setupPassed) {
    console.log('❌ Setup checks failed. Cannot proceed with upload test.');
    return false;
  }
  
  // Step 2: Server connectivity
  console.log('\nStep 2: Testing server connectivity...');
  const serverOk = await testServerConnectivity();
  
  if (!serverOk) {
    console.log('❌ Server connectivity failed. Cannot proceed with upload test.');
    return false;
  }
  
  // Step 3: Simulate file selection
  console.log('\nStep 3: Simulating file selection...');
  const testFile = createTestFile(`upload-test-${Date.now()}.txt`);
  const selectionOk = simulateFileSelection([testFile]);
  
  if (!selectionOk) {
    console.log('❌ File selection simulation failed.');
    return false;
  }
  
  // Step 4: Trigger upload
  console.log('\nStep 4: Triggering upload...');
  const uploadBtn = document.getElementById('uploadBtn');
  
  if (!uploadBtn) {
    console.log('❌ Upload button not found.');
    return false;
  }
  
  // Click the upload button
  uploadBtn.click();
  
  console.log('✅ Upload triggered. Check the UI and network tab for results.');
  console.log('⏳ Upload may take a few moments. Watch for success/error messages.');
  
  return true;
}

// Check current authentication status
function checkAuthStatus() {
  console.log('🔐 Checking authentication status...\n');
  
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userInfo = localStorage.getItem('userInfo');
  
  console.log('Access Token:', accessToken ? '✅ Present' : '❌ Missing');
  console.log('Refresh Token:', refreshToken ? '✅ Present' : '❌ Missing');
  console.log('User Info:', userInfo ? '✅ Present' : '❌ Missing');
  
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo);
      console.log('User Details:', {
        id: user.id,
        username: user.username,
        email: user.email,
        provider: user.provider || 'local'
      });
    } catch (e) {
      console.log('❌ User info is corrupted');
    }
  }
  
  console.log('Current User ID:', window.currentUserId || 'Not set');
}

// Export functions for console use
if (typeof window !== 'undefined') {
  window.uploadDebug = {
    testFileUploadSetup,
    testServerConnectivity,
    createTestFile,
    simulateFileSelection,
    testCompleteUploadFlow,
    checkAuthStatus
  };
}

// Auto-run basic checks when script loads
console.log(`
🛠️  File Upload Debug Tools Loaded

Available functions:
- uploadDebug.testFileUploadSetup()     - Check if upload form is set up correctly
- uploadDebug.testServerConnectivity()  - Test server connection and auth
- uploadDebug.testCompleteUploadFlow()  - Run full upload test
- uploadDebug.checkAuthStatus()         - Check authentication status
- uploadDebug.createTestFile()          - Create a test file for upload
- uploadDebug.simulateFileSelection()   - Simulate selecting files

Quick start:
  uploadDebug.testCompleteUploadFlow()  // Run complete test
`);
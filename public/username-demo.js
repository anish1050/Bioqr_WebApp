// Demo script for testing username display functionality
// This script can be run in the browser console to test different user scenarios

// Demo user data for testing different scenarios
const demoUsers = {
  githubUser: {
    id: 1,
    email: 'user@github.com',
    username: 'johndoe',
    provider: 'github',
    github_name: 'John Doe',
    github_avatar: 'https://avatars.githubusercontent.com/u/12345?v=4',
    access_token: 'demo_token'
  },
  
  googleUser: {
    id: 2,
    email: 'jane.smith@gmail.com',
    username: 'janesmith',
    provider: 'google',
    google_name: 'Jane Smith',
    google_avatar: 'https://lh3.googleusercontent.com/a/demo-avatar',
    access_token: 'demo_token'
  },
  
  regularUser: {
    id: 3,
    email: 'mike.wilson@example.com',
    username: 'mikewilson',
    name: 'Mike Wilson'
  },
  
  emailOnlyUser: {
    id: 4,
    email: 'sarah.connor@company.com'
  },
  
  usernameFromEmail: {
    id: 5,
    email: 'alex.rodriguez123@domain.com',
    username: 'alex.rodriguez123@domain.com' // Same as email
  }
};

// Test function to demonstrate username display logic
function testUsernameDisplay() {
  console.log('=== BioQR Dashboard Username Display Demo ===\n');
  
  Object.entries(demoUsers).forEach(([userType, user]) => {
    const displayName = getUserDisplayName(user);
    const initials = getInitials(displayName);
    
    console.log(`${userType.toUpperCase()}:`);
    console.log(`  Email: ${user.email || 'N/A'}`);
    console.log(`  Username: ${user.username || 'N/A'}`);
    console.log(`  Provider: ${user.provider || 'None'}`);
    console.log(`  Display Name: "${displayName}"`);
    console.log(`  Initials: "${initials}"`);
    console.log(`  Welcome Message: "Welcome back, ${displayName}!"`);
    console.log('---');
  });
  
  console.log('\n=== Priority Order for Display Names ===');
  console.log('1. Social provider name (GitHub name, Google name)');
  console.log('2. Username (if different from email)');
  console.log('3. Explicit name field');
  console.log('4. Display name / full name fields');
  console.log('5. Extract from email (before @ symbol)');
  console.log('6. Default fallback: "User"');
}

// Function to simulate different login scenarios
function simulateLogin(userType) {
  if (!demoUsers[userType]) {
    console.error('Invalid user type. Available types:', Object.keys(demoUsers));
    return;
  }
  
  const user = demoUsers[userType];
  console.log(`\n=== Simulating ${userType} Login ===`);
  
  // Store in localStorage as the dashboard would
  localStorage.setItem('userInfo', JSON.stringify(user));
  
  // Update the dashboard UI
  if (typeof updateUserProfile === 'function') {
    updateUserProfile(user);
    console.log('Dashboard updated with user data');
  } else {
    console.log('updateUserProfile function not available (run this on dashboard page)');
  }
  
  console.log('User data stored in localStorage');
  console.log('Display name:', getUserDisplayName(user));
}

// Function to clear all demo data
function clearDemoData() {
  localStorage.removeItem('userInfo');
  // Clear profile caches
  Object.values(demoUsers).forEach(user => {
    if (user.provider) {
      localStorage.removeItem(`profile_${user.provider}_${user.id}`);
    }
  });
  console.log('Demo data cleared');
}

// Instructions for testing
console.log(`
=== BioQR Username Display Testing ===

To test the username display functionality:

1. Open browser console on the dashboard page
2. Run any of these commands:

   // Test display logic for all user types
   testUsernameDisplay();

   // Simulate specific login types
   simulateLogin('githubUser');
   simulateLogin('googleUser');
   simulateLogin('regularUser');
   simulateLogin('emailOnlyUser');
   simulateLogin('usernameFromEmail');

   // Clear demo data
   clearDemoData();

3. Available user types:
   - githubUser: User with GitHub OAuth
   - googleUser: User with Google OAuth
   - regularUser: Regular user with username
   - emailOnlyUser: User with only email
   - usernameFromEmail: User where username equals email

The dashboard will now show usernames instead of emails in:
- Welcome message: "Welcome back, [Name]!"
- User profile section
- Navigation bar user details
`);

// Export functions for use if this script is imported
if (typeof window !== 'undefined') {
  window.usernameDemo = {
    testUsernameDisplay,
    simulateLogin,
    clearDemoData,
    demoUsers
  };
}
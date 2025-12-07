import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 OAuth Configuration Validation\n');

// Check environment variables
const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'SESSION_SECRET'
];

console.log('📋 Environment Variables Check:');
let missingVars = [];
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log(`\n❌ Missing environment variables: ${missingVars.join(', ')}`);
  console.log('Please check your .env file.');
} else {
  console.log('\n✅ All required environment variables are present.');
}

console.log('\n🔗 OAuth Callback URLs:');
console.log('Google Callback: http://localhost:3000/auth/google/callback');
console.log('GitHub Callback: http://localhost:3000/auth/github/callback');

console.log('\n📝 Required OAuth App Settings:');
console.log('\n🔵 Google OAuth App:');
console.log('- Authorized JavaScript origins:');
console.log('  • http://localhost:3000');
console.log('  • http://localhost:5173');
console.log('  • http://localhost:5174'); 
console.log('  • http://localhost:5175');
console.log('- Authorized redirect URIs:');
console.log('  • http://localhost:3000/auth/google/callback');

console.log('\n🔶 GitHub OAuth App:');
console.log('- Homepage URL: http://localhost:3000');
console.log('- Authorization callback URL: http://localhost:3000/auth/github/callback');

console.log('\n🚀 To test OAuth:');
console.log('1. Ensure your server is running: npm start');
console.log('2. Go to: http://localhost:3000/oauth-debug.html');
console.log('3. Use the test buttons to diagnose issues');

// Test OAuth URLs
console.log('\n🧪 OAuth Test URLs:');
console.log('Google: http://localhost:3000/auth/google');
console.log('GitHub: http://localhost:3000/auth/github');

console.log('\n💡 Common Issues:');
console.log('1. OAuth app not configured with correct callback URLs');
console.log('2. JavaScript origins missing from Google OAuth app');  
console.log('3. OAuth app credentials expired or revoked');
console.log('4. Firewall blocking OAuth provider responses');
console.log('5. Browser blocking third-party cookies');
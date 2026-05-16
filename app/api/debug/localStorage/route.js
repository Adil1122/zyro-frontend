import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  // This is a server-side test, but we'll return HTML with JavaScript to test localStorage
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>LocalStorage Test</title>
    </head>
    <body>
      <h1>LocalStorage Test</h1>
      <div id="results"></div>
      
      <script>
        // Test localStorage functionality
        try {
          // Test write
          localStorage.setItem('test_key', 'test_value');
          const testValue = localStorage.getItem('test_key');
          
          // Test zyro_user
          const zyroUser = localStorage.getItem('zyro_user');
          const parsedUser = zyroUser ? JSON.parse(zyroUser) : null;
          
          // Display results
          document.getElementById('results').innerHTML = \`
            <h3>LocalStorage Test Results:</h3>
            <p><strong>Basic Test:</strong> \${testValue === 'test_value' ? 'PASS' : 'FAIL'}</p>
            <p><strong>Zyro User Data:</strong> \${zyroUser ? 'EXISTS' : 'MISSING'}</p>
            <p><strong>Parsed User:</strong> \${parsedUser ? JSON.stringify(parsedUser, null, 2) : 'NULL'}</p>
            <p><strong>User ID:</strong> \${parsedUser?.id || 'NOT FOUND'}</p>
            
            <h3>Actions:</h3>
            <button onclick="clearStorage()">Clear LocalStorage</button>
            <button onclick="goToLogin()">Go to Login</button>
            <button onclick="goToMarketing()">Go to Marketing</button>
          \`;
          
          // Clean up test
          localStorage.removeItem('test_key');
          
        } catch (error) {
          document.getElementById('results').innerHTML = \`
            <h3>Error:</h3>
            <p>\${error.message}</p>
          \`;
        }
        
        function clearStorage() {
          localStorage.clear();
          location.reload();
        }
        
        function goToLogin() {
          window.location.href = '/login';
        }
        
        function goToMarketing() {
          window.location.href = '/marketing';
        }
      </script>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

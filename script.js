// Helper function to parse data URLs
function parseDataUrl(url) {
  if (!url.startsWith('data:')) {
    throw new Error('Invalid data URL');
  }
  
  const commaIndex = url.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid data URL format');
  }
  
  const header = url.substring(0, commaIndex);
  const payload = url.substring(commaIndex + 1);
  
  const matches = header.match(/^data:([^;]+)(;base64)?$/);
  if (!matches) {
    throw new Error('Invalid data URL header');
  }
  
  const mime = matches[1] || 'text/plain';
  const isBase64 = !!matches[2];
  
  return { mime, isBase64, payload };
}

// Helper function to decode base64 to text
function decodeBase64ToText(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Helper function to parse CSV
function parseCsv(text) {
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  
  // Split into lines
  const lines = text.split('\n').filter(line => line.length > 0);
  if (lines.length === 0) return { rows: [] };
  
  // Detect delimiter
  const delimiters = [',', ';', '\t'];
  let delimiter = ',';
  let maxCount = 0;
  
  for (const delim of delimiters) {
    const count = (lines[0].match(new RegExp(delim, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      delimiter = delim;
    }
  }
  
  // Parse rows
  const rows = lines.map(line => {
    // Simple CSV parsing (doesn't handle all edge cases)
    return line.split(delimiter).map(field => {
      // Remove quotes if present
      if (field.startsWith('"') && field.endsWith('"')) {
        return field.substring(1, field.length - 1).replace(/""/g, '"');
      }
      return field;
    });
  });
  
  // Try to infer if first row is header
  if (rows.length > 0) {
    const firstRow = rows[0];
    const isHeader = firstRow.every(field => isNaN(Number(field)));
    
    if (isHeader) {
      return {
        headers: firstRow,
        rows: rows.slice(1)
      };
    }
  }
  
  return { rows };
}

// Main application logic
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('github-user-r8s2');
  const resultDiv = document.getElementById('result');
  const errorDiv = document.getElementById('error');
  const createdAtSpan = document.getElementById('github-created-at');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide previous results
    resultDiv.classList.add('d-none');
    errorDiv.classList.add('d-none');
    
    const username = document.getElementById('username').value.trim();
    if (!username) {
      showError('Please enter a GitHub username');
      return;
    }
    
    try {
      const userData = await fetchGitHubUser(username);
      const createdDate = new Date(userData.created_at);
      const formattedDate = createdDate.toISOString().split('T')[0];
      
      createdAtSpan.textContent = formattedDate;
      resultDiv.classList.remove('d-none');
    } catch (error) {
      showError(error.message);
    }
  });
  
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
  }
  
  async function fetchGitHubUser(username) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    
    const response = await fetch(`https://api.github.com/users/${username}`, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User not found');
      }
      if (response.status === 403) {
        throw new Error('Rate limit exceeded. Please try again later or provide a token.');
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
});
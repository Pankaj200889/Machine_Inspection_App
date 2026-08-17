const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/checklists',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6Im9wZXJhdG9yIiwidXNlcm5hbWUiOiJvcGVyYXRvciIsImlhdCI6MTc4Njk1NzIxNH0.m2nQ2mvAcLfrXGXtuB9I36kCor8o2yPYKjRG5OBWJFg'
  }
};

const req = http.request(options, (res) => {
  let d = '';
  res.on('data', chunk => d += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', d));
});

req.on('error', console.error);

req.write(JSON.stringify({ 
    machine_id: 1, 
    template_id: 1, 
    shift: 'A', 
    values: '[{"item_id": 1, "actual_value": "10"}]', 
    comments: 'Test' 
}));
req.end();

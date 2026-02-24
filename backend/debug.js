/**
 * Quick debug script — tests PATCH /users/me directly
 */
require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:3000/api/v1';

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE + path);
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function debug() {
    const email = `debug_${Date.now()}@example.com`;

    // 1. Register
    const reg = await request('POST', '/auth/register', { name: 'Debug User', email, password: 'pass1234' });
    console.log('Register:', reg.status, reg.body);
    const token = reg.body.token;

    // 2. PATCH /users/me
    const patch = await request('PATCH', '/users/me', { name: 'New Name' }, token);
    console.log('\nPATCH /users/me:', patch.status);
    console.log('Response:', JSON.stringify(patch.body, null, 2));
}

debug().catch(console.error);

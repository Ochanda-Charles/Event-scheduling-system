/**
 * END-TO-END SMOKE TEST
 * ---------------------
 * Tests every major endpoint to confirm the full system works.
 * Run with:  node test.js
 *
 * Requires server.js to already be running on PORT 3000.
 */

const http = require('http');

const BASE = 'http://localhost:3000/api/v1';
let TOKEN = '';
let USER_ID = '';
let BOOKING_ID = '';
let ORG_ID = '';
let NOTIF_ID = '';

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE + path);
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

// ─── Test runner ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

async function test(label, fn) {
    try {
        await fn();
        console.log(`  ✅ ${label}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ ${label}`);
        console.log(`     → ${err.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

// ─── Tests ────────────────────────────────────────────────────────────────────
async function run() {
    console.log('\n🧪 Running smoke tests against http://localhost:3000\n');
    const email = `test_${Date.now()}@example.com`;

    // ── Health ──────────────────────────────────────────────────────────────
    console.log('── HEALTH ──────────────────────────────────');
    await test('GET /health → 200 OK', async () => {
        const r = await request('GET', '/../../health');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.status === 'OK', 'Missing status:OK');
    });

    // ── Auth ─────────────────────────────────────────────────────────────────
    console.log('\n── AUTH ─────────────────────────────────────');
    await test('POST /auth/register → 201 + token', async () => {
        const r = await request('POST', '/auth/register', { name: 'Test User', email, password: 'password123' });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.body)}`);
        assert(r.body.token, 'No token returned');
        TOKEN = r.body.token;
        USER_ID = r.body.user.id;
    });

    await test('POST /auth/register → 400 duplicate email', async () => {
        const r = await request('POST', '/auth/register', { name: 'Test User', email, password: 'password123' });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
    });

    await test('POST /auth/login → 200 + token', async () => {
        const r = await request('POST', '/auth/login', { email, password: 'password123' });
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.token, 'No token returned');
    });

    await test('POST /auth/login → 401 wrong password', async () => {
        const r = await request('POST', '/auth/login', { email, password: 'wrongpassword' });
        assert(r.status === 401, `Expected 401, got ${r.status}`);
    });

    await test('GET /auth/verify → 200 valid token', async () => {
        const r = await request('GET', '/auth/verify', null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.valid === true, 'Expected valid:true');
    });

    await test('POST /auth/logout → 200', async () => {
        const r = await request('POST', '/auth/logout', {}, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    // ── Users ────────────────────────────────────────────────────────────────
    console.log('\n── USERS ────────────────────────────────────');
    await test('GET /users/me → 200 my profile', async () => {
        const r = await request('GET', '/users/me', null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.email === email, 'Wrong email returned');
    });

    await test('GET /users/me → 401 without token', async () => {
        const r = await request('GET', '/users/me');
        assert(r.status === 401, `Expected 401, got ${r.status}`);
    });

    await test('PATCH /users/me → 200 update name', async () => {
        const r = await request('PATCH', '/users/me', { name: 'Updated Name' }, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.user.name === 'Updated Name', 'Name not updated');
    });

    await test('PATCH /users/me/password → 200 change password', async () => {
        const r = await request('PATCH', '/users/me/password', { currentPassword: 'password123', newPassword: 'newpassword456' }, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test('POST /auth/login → 200 with new password', async () => {
        const r = await request('POST', '/auth/login', { email, password: 'newpassword456' });
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        TOKEN = r.body.token; // refresh token
    });

    // ── Bookings ─────────────────────────────────────────────────────────────
    console.log('\n── BOOKINGS ─────────────────────────────────');
    const futureStart = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    const futureEnd = new Date(Date.now() + 90000000).toISOString();

    await test('POST /bookings → 201 create booking', async () => {
        const r = await request('POST', '/bookings', { title: 'Team Standup', start: futureStart, end: futureEnd }, TOKEN);
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.body)}`);
        BOOKING_ID = r.body.booking.id;
    });

    await test('POST /bookings → 400 past date rejected', async () => {
        const r = await request('POST', '/bookings', { title: 'Old Meeting', start: '2020-01-01T10:00:00Z', end: '2020-01-01T11:00:00Z' }, TOKEN);
        assert(r.status === 400, `Expected 400, got ${r.status}`);
    });

    await test('POST /bookings → 400 end before start', async () => {
        const r = await request('POST', '/bookings', { title: 'Bad Meeting', start: futureEnd, end: futureStart }, TOKEN);
        assert(r.status === 400, `Expected 400, got ${r.status}`);
    });

    await test('GET /bookings → 200 list bookings', async () => {
        const r = await request('GET', '/bookings', null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.body), 'Expected array');
        assert(r.body.length > 0, 'Expected at least 1 booking');
    });

    await test(`GET /bookings/:id → 200 view booking`, async () => {
        const r = await request('GET', `/bookings/${BOOKING_ID}`, null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.title === 'Team Standup', 'Wrong title');
    });

    await test('PATCH /bookings/:id → 200 update title', async () => {
        const r = await request('PATCH', `/bookings/${BOOKING_ID}`, { title: 'Updated Standup' }, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.booking.title === 'Updated Standup', 'Title not updated');
    });

    await test('DELETE /bookings/:id → 200 cancel booking', async () => {
        const r = await request('DELETE', `/bookings/${BOOKING_ID}`, null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.booking.status === 'cancelled', 'Booking not cancelled');
    });

    await test('DELETE /bookings/:id → 404 already cancelled', async () => {
        const r = await request('DELETE', `/bookings/${BOOKING_ID}`, null, TOKEN);
        assert(r.status === 404, `Expected 404, got ${r.status}`);
    });

    // ── Organizations ────────────────────────────────────────────────────────
    console.log('\n── ORGANIZATIONS ────────────────────────────');
    await test('POST /organizations → 201 create', async () => {
        const r = await request('POST', '/organizations', { name: 'Test Org' }, TOKEN);
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.body)}`);
        ORG_ID = r.body.organization.id;
    });

    await test('GET /organizations → 200 list mine', async () => {
        const r = await request('GET', '/organizations', null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.body) && r.body.length > 0, 'Expected at least 1 org');
    });

    await test('GET /organizations/:id → 200 with members', async () => {
        const r = await request('GET', `/organizations/${ORG_ID}`, null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.body.members), 'Expected members array');
    });

    await test('PATCH /organizations/:id → 200 update name', async () => {
        const r = await request('PATCH', `/organizations/${ORG_ID}`, { name: 'Renamed Org' }, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.organization.name === 'Renamed Org', 'Name not updated');
    });

    // ── Notifications ────────────────────────────────────────────────────────
    console.log('\n── NOTIFICATIONS ────────────────────────────');
    await test('GET /notifications → 200 list', async () => {
        const r = await request('GET', '/notifications', null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.body), 'Expected array');
        if (r.body.length > 0) NOTIF_ID = r.body[0].id;
    });

    await test('GET /notifications/count → 200 unread count', async () => {
        const r = await request('GET', '/notifications/count', null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(typeof r.body.unread === 'number', 'Expected unread count');
    });

    await test('PATCH /notifications/read-all → 200', async () => {
        const r = await request('PATCH', '/notifications/read-all', {}, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test('GET /notifications/unread → 200 empty after mark-all', async () => {
        const r = await request('GET', '/notifications/unread', null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.length === 0, `Expected 0 unread, got ${r.body.length}`);
    });

    // ── Analytics ────────────────────────────────────────────────────────────
    console.log('\n── ANALYTICS ────────────────────────────────');
    await test('POST /analytics/event → 201 log event (anonymous)', async () => {
        const r = await request('POST', '/analytics/event', { eventType: 'PAGE_VIEW', metadata: { page: '/home' } });
        assert(r.status === 201, `Expected 201, got ${r.status}`);
    });

    await test('POST /analytics/event → 201 log event (authenticated)', async () => {
        const r = await request('POST', '/analytics/event', { eventType: 'BOOKING_VIEWED' }, TOKEN);
        assert(r.status === 201, `Expected 201, got ${r.status}`);
    });

    await test('GET /analytics/dashboard → 200', async () => {
        const r = await request('GET', '/analytics/dashboard', null, TOKEN);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.body.overview, 'Missing overview');
        assert(Array.isArray(r.body.breakdown), 'Missing breakdown');
    });

    // ── 404 ──────────────────────────────────────────────────────────────────
    console.log('\n── ERROR HANDLING ───────────────────────────');
    await test('GET /unknown-route → 404', async () => {
        const r = await request('GET', '/nonexistent-endpoint');
        assert(r.status === 404, `Expected 404, got ${r.status}`);
    });

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(45)}`);
    console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
    if (failed === 0) {
        console.log('  🎉 All tests passed! The system is fully working.\n');
    } else {
        console.log('  ⚠️  Some tests failed. See errors above.\n');
    }
}

run().catch(err => {
    console.error('\n💥 Test runner crashed:', err.message);
    process.exit(1);
});

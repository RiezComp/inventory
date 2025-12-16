const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTest() {
    try {
        console.log("1. Login...");
        const loginRes = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin', password: 'admin123' });

        if (!loginRes.token) {
            console.error("Login failed:", loginRes);
            return;
        }
        const token = loginRes.token;
        console.log("Login success.");

        console.log("2. Get Services...");
        const servicesRes = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/service',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!servicesRes.data || servicesRes.data.length === 0) {
            console.log("No services found. Please create one manually via UI first to test.");
            return;
        }

        const serviceId = servicesRes.data[0].id;
        console.log(`Checking Service ID: ${serviceId}`);

        console.log("3. Get Service Detail...");
        const detailRes = await request({
            hostname: 'localhost',
            port: 3000,
            path: `/api/service/${serviceId}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("Service Detail Response:");
        // console.log(JSON.stringify(detailRes, null, 2));

        if (detailRes.data && detailRes.data.parts_used) {
            console.log("Parts Used found:", detailRes.data.parts_used);
        } else {
            console.log("Warning: parts_used is missing or null!");
        }

    } catch (err) {
        console.error("Test failed:", err);
    }
}

runTest();

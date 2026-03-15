// Diagnostic script to test database connection with various configurations
import mysql from 'mysql2';
import dotenv from 'dotenv';
import * as net from 'net';

dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bioqr',
    port: parseInt(process.env.DB_PORT || '4000', 10),
};

console.log('🔍 Database Connection Diagnostic');
console.log('================================');
console.log('Host:', config.host);
console.log('Port:', config.port);
console.log('User:', config.user);
console.log('Database:', config.database);
console.log('');

// Step 1: Test raw TCP connectivity
console.log('1️⃣  Testing raw TCP connection...');
const socket = new net.Socket();
const tcpTest = new Promise((resolve) => {
    socket.setTimeout(5000);
    socket.on('connect', () => {
        console.log('   ✅ TCP connection established');
        socket.destroy();
        resolve(true);
    });
    socket.on('timeout', () => {
        console.log('   ❌ TCP connection timeout');
        socket.destroy();
        resolve(false);
    });
    socket.on('error', (err) => {
        console.log(`   ❌ TCP connection failed: ${err.code} - ${err.message}`);
        socket.destroy();
        resolve(false);
    });
    socket.connect(config.port, config.host);
});

tcpTest.then((success) => {
    if (!success) {
        console.log('\n❌ Cannot reach database server via TCP.');
        console.log('Possible causes:');
        console.log('  • IP not whitelisted in TiDB Cloud (most likely)');
        console.log('  • Firewall blocking outbound connections');
        console.log('  • TiDB cluster is down or paused');
        console.log('\n💡 Solution: Add your IP to TiDB Cloud allowlist');
        process.exit(1);
    }

    // Step 2: Test MySQL connection without SSL
    console.log('\n2️⃣  Testing MySQL connection (no SSL)...');
    const poolNoSSL = mysql.createPool({
        ...config,
        ssl: false,
        connectTimeout: 5000,
        connectionLimit: 1,
    });

    poolNoSSL.getConnection((err, conn) => {
        if (err) {
            console.log(`   ❌ Failed: ${err.code} - ${err.message}`);
        } else {
            console.log('   ✅ Connected without SSL');
            conn.release();
            poolNoSSL.end();
        }

        // Step 3: Test MySQL connection with SSL (no rejectUnauthorized)
        console.log('\n3️⃣  Testing MySQL connection (with SSL, no cert validation)...');
        const poolSSL = mysql.createPool({
            ...config,
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: false,
            },
            connectTimeout: 5000,
            connectionLimit: 1,
        });

        poolSSL.getConnection((err2, conn2) => {
            if (err2) {
                console.log(`   ❌ Failed: ${err2.code} - ${err2.message}`);
                console.log('\n❌ All connection attempts failed.');
                console.log('\n📋 Next steps:');
                console.log('1. Go to TiDB Cloud console (https://cloud.tidb.com)');
                console.log('2. Find your cluster: gateway01.ap-southeast-1.prod.aws.tidbcloud.com');
                console.log('3. Go to "Connection Info" or "Security Settings"');
                console.log('4. Add your IP to the allowlist: 192.168.0.104');
                console.log('5. Copy the connection string exactly as provided');
                console.log('6. Update your .env file with those values');
            } else {
                console.log('   ✅ Connected with SSL (no validation)');
                console.log('\n✅ SUCCESS! Connection works when SSL validation is disabled.');
                console.log('Note: This is OK for testing, but consider proper cert validation in production.');
                conn2.release();
            }
            poolSSL.end();
        });
    });
});

const app = require('./app');
const dotenv = require('dotenv');
const http = require('http');
const net = require('net');
const { connectDB, metricsStorage } = require('./database');
const authPackage = require('basic-auth');
const auth = require('./auth');

dotenv.config();

const startServer = async () => {
    await connectDB();

    const server = http.createServer(app);

    const PORT = process.env.PORT || 8080;

    server.on('connect', async (req, socket, head) => {
        const [targetHost, targetPort] = req.url.split(':');
        const port = parseInt(targetPort) || 443;

        const proxyAuth = req.headers['proxy-authorization'];
        if (!proxyAuth) {
            socket.end();
            return;
        }
        const credentials = authPackage.parse(proxyAuth);
        if (!credentials) {
            socket.end();
            return;
        }

        const user = await auth(credentials.name, credentials.pass);
        if (!user.id) {
            socket.end();
            return;
        }

        const serverSocket = net.connect(port, targetHost, () => {
            socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

            let bytesTransferred = 0;
            
            serverSocket.on('data', (chunk) => {
                bytesTransferred += chunk.length;
            });

            serverSocket.on('end', () => {
                metricsStorage.trackRequest(user.id, targetHost, bytesTransferred)
                    .catch(err => console.error('Error tracking HTTPS metrics:', err));
            });

            serverSocket.write(head);
            serverSocket.pipe(socket);
            socket.pipe(serverSocket);
        });

        serverSocket.on('error', (error) => {
            console.error('Server socket error:', error);
            socket.end();
        });

        socket.on('error', (error) => {
            console.error('Client socket error:', error);
            serverSocket.end();
        });
    });

    server.listen(PORT, () => {
        console.log(`Proxy server is running on http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
        console.error('Server error:', error);
    });

    const gracefulShutdown = async (signal) => {
        console.log(`\n${signal} received. Starting graceful shutdown...`);

        try {
            // Get total stats
            const stats = await metricsStorage.getTotalStats();
            
            console.log('\n=== Final Statistics ===');
            console.log(`Total Bandwidth Usage: ${stats.totalBandwidth}`);
            console.log('\nMost Visited Sites:');
            stats.topSites.forEach((site, index) => {
                console.log(`${index + 1}. ${site.domain} - ${site.visits} visits (${site.bytes})`);
            });
            
            // Close server
            server.close(() => {
                console.log('HTTP server closed');
            });
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
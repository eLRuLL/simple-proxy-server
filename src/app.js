const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const proxyAuth = require('./middleware/proxy-auth');
const dotenv = require('dotenv');
const { metricsStorage } = require('./database');
const responseSize = require('express-response-size');
const basicAuth = require('./middleware/auth');

dotenv.config();

const app = express();

app.get('/metrics', basicAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await metricsStorage.getUserStats(userId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

app.use('/', proxyAuth, (req, res, next) => {
    const target = req.url;
    createProxyMiddleware({
        selfHandleResponse: true,
        target,
        changeOrigin: true,
        // onProxyReq: (proxyReq, req, res) => {
        //     console.log(`Proxying request to: ${target}`);
        // },
        // onError: (err, req, res) => {
        //     console.error('Proxy error:', err);
        //     res.status(500).send('Proxy error: ' + err.message);
        // },
        on: {
            proxyRes: responseInterceptor(async (responseBuffer) => {
                const responseSize = responseBuffer.length;
                const domain = new URL(target).hostname;
                metricsStorage.trackRequest(req.user.id, domain, responseSize);
                return responseBuffer;
            })
        }
    })(req, res, next);
});

app.use(responseSize(300));

module.exports = app;

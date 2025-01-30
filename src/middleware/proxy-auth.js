const authPackage = require('basic-auth');
const auth = require('../auth');

const basicAuth = async (req, res, next) => {
    const proxyAuth = req.headers['proxy-authorization'];

    if (!proxyAuth) {
        res.setHeader('Proxy-Authenticate', 'Basic');
        return res.status(407).send('Proxy Authentication Required');
    }

    const credentials = authPackage.parse(proxyAuth);
    if (!credentials) {
        throw new Error('Invalid credentials format');
    }

    const user = await auth(credentials.name, credentials.pass);

    if (!user) {
        return res.status(407).send('Proxy Authentication Required');
    }

    req.user = user;
    next();
};

module.exports = basicAuth;

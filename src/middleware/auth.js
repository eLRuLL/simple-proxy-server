const authPackage = require('basic-auth');
const bcrypt = require('bcrypt');
const { User } = require('../database');

const basicAuth = async (req, res, next) => {
    const credentials = authPackage(req);

    if (!credentials) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const user = await User.findOne({ username: credentials.name });
        if (!user) {
            return res.status(401).send('Unauthorized');
        }
        const validPassword = await bcrypt.compare(credentials.pass, user.password);
        if (!validPassword) {
            return res.status(401).send('Unauthorized');
        }
        req.user = user;
        next();
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
};

module.exports = basicAuth;

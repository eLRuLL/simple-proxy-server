const { User } = require('./database');
const bcrypt = require('bcrypt');

const auth = async (username, password) => {
    const user = await User.findOne({ username });
    if (!user) {
        return false;
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return false;
    }

    return user;
}

module.exports = auth;

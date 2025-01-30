const {connectDB, User} = require('./src/database');
require('dotenv').config();

const createUser = async (username, password) => {
    try {
        await connectDB();
        const user = await User.createUser(username, password);
        console.log('User created successfully:', user.username);
        process.exit(0);
    } catch (error) {
        console.error('Error creating user:', error.message);
        process.exit(1);
    }
};

// Get username and password from command line arguments
const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
    console.error('Usage: node createUser.js <username> <password>');
    process.exit(1);
}

createUser(username, password);

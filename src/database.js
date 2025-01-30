const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

userSchema.statics.createUser = async function(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.create({
        username,
        password: hashedPassword,
    });
}

const metricSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    domain: { type: String, required: true },
    bytes_sent: { type: Number, default: 0 },
}, {
    timestamps: true,
    indexes: [
        { user_id: 1, domain: 1, timestamp: 1 }
    ]
});

const User = mongoose.model('User', userSchema);

const Metric = mongoose.model('Metric', metricSchema);

class MetricsStorage {
    async trackRequest(userId, domain, bytesSent) {
        await Metric.create({
            user_id: userId,
            domain,
            bytes_sent: bytesSent,
        });
    }

    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0B';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + sizes[i];
    }

    async getUserStats(userId) {
        try {
            // Get total bandwidth usage
            const bandwidthResult = await Metric.aggregate([
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_bytes: {
                            $sum: '$bytes_sent'
                        }
                    }
                }
            ]);

            const topSites = await Metric.aggregate([
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $group: {
                        _id: '$domain',
                        visits: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        url: '$_id',
                        visits: 1
                    }
                },
                {
                    $sort: { visits: -1 }
                },
                {
                    $limit: 10
                }
            ]);

            const totalBytes = bandwidthResult[0]?.total_bytes || 0;

            return {
                bandwidth_usage: this.formatBytes(totalBytes),
                top_sites: topSites
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    async getTotalStats() {
        try {
            const stats = await Metric.aggregate([
                {
                    $group: {
                        _id: '$domain',
                        bytes: { $sum: '$bytes_sent' },
                        visits: { $sum: 1 }
                    }
                },
                {
                    $sort: { visits: -1 }
                },
                {
                    $limit: 10
                }
            ]);
            
            const totalBandwidth = stats.reduce((sum, site) => sum + site.bytes, 0);

            const topSites = stats.map(site => ({
                domain: site._id,
                visits: site.visits,
                bytes: site.bytes
            }));

            return {
                totalBandwidth: this.formatBytes(totalBandwidth),
                topSites
            };
        } catch (error) {
            console.error('Error getting total stats:', error);
            throw error;
        }
    }
}

const metricsStorage = new MetricsStorage();

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}

module.exports = {metricsStorage, User, Metric, connectDB};

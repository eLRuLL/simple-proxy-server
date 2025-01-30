const StatsMiddleware = (req, res, next) => {
    const target = req.url;
    const domain = new URL(target).hostname;
    
    const originalWrite = res.write;
    const originalEnd = res.end;
    let bytesWritten = 0;

    res.write = function(chunk, ...args) {
        if (chunk) {
            bytesWritten += chunk.length;
        }
        return originalWrite.apply(res, [chunk, ...args]);
    };

    res.end = function(chunk, ...args) {
        if (chunk) {
            bytesWritten += chunk.length;
        }
        const userId = req.user?.id;
    };

    next();
};

module.exports = StatsMiddleware;
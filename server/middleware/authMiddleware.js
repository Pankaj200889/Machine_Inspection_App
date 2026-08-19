const jwt = require('jsonwebtoken');

const JWT_SECRET = 'HARDCODED_MACHINE_SECRET_2026';

const verifyUser = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized: ' + err.message });
        req.user = decoded;
        next();
    });
};

const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized: ' + err.message });
        if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
            return res.status(403).json({ error: 'Requires Admin role' });
        }
        req.user = decoded;
        next();
    });
};

const verifySuperAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized: ' + err.message });
        if (decoded.role !== 'super_admin') {
            return res.status(403).json({ error: 'Requires Super Admin role' });
        }
        req.user = decoded;
        next();
    });
};

module.exports = { verifyUser, verifyAdmin, verifySuperAdmin };

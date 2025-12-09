import jwt from 'jsonwebtoken'
export const authMiddleware = (req, res, next) => {
    const token = req.cookies.token; 
    if(!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized - No token provided' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if(err){
            return res.status(401).json({ success: false, message: 'Unauthorized - Invalid token' });
        }
        req.user = user;
        next();
    });
};
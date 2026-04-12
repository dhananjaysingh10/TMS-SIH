import jwt from 'jsonwebtoken';
import { errorHandler } from './error.js';

export const authMiddleware = (req, res, next) => {
    const token = req.cookies.access_token || req.cookies.token; 
    if(!token) {
        console.log("unauthorized: No token found");
        return next(errorHandler(401, 'Unauthorized'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if(err){
            console.log("Token verification failed:", err.message);
            return next(errorHandler(403, 'Forbidden'));
        }
        req.user = user;
        next();
    });
};
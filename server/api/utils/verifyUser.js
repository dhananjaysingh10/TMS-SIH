import jwt from 'jsonwebtoken'
export const authMiddleware = (req, res, next) => {
    const token = req.cookies.token; 
    if(!token) {
        return next(errorHandler(401, 'unauthorized'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if(err){
            console.log(err.message);
            return;
        }
        req.user = user;
        next();
    });
};
import dotenv from 'dotenv';

dotenv.config({path: '.env'});

export const PORT = process.env.PORT;

export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET!
export const ADMIN_REFRESH_TOKEN_SECRET = process.env.ADMIN_REFRESH_TOKEN_SECRET!

export const USER_JWT_SECRET = process.env.USER_JWT_SECRET!
export const USER_REFRESH_TOKEN_SECRET = process.env.USER_REFRESH_TOKEN_SECRET!

export const FRONTEND_URL = process.env.FRONTEND_URL!

export const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY!
export const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!
export const MAILGUN_API_URL = process.env.MAILGUN_API_URL!
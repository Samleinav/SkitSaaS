import dotenv from 'dotenv';
import { jwtVerify } from 'jose';

dotenv.config();
const token = process.argv[2];
const key = new TextEncoder().encode(process.env.AUTH_SECRET || '');

const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
console.log(JSON.stringify(payload, null, 2));

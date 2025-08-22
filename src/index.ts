import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes';
import sequelize from './db';
import session from 'express-session';
import './Models/associations';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check for session secret
if (!process.env.SESSION_SECRET) {
  console.warn('⚠️ SESSION_SECRET is not set in the .env file. Using a default, insecure secret. Please set a strong secret for production.');
}

const app = express();
const port = process.env.PORT || 3000;

console.log('Starting Express server...');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add express-session middleware
app.use(session({
  // This is the secret used to sign the session ID cookie.
  // It should be a long, random string stored securely in your .env file.
  secret: process.env.SESSION_SECRET || 'a-default-insecure-secret-for-development',

  // These options are recommended for most applications
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Use secure cookies in production (requires HTTPS)
}));

console.log('Loading routes...');
app.use('/', routes);

// Health check
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({ status: 'API running' });
});

// Connect to DB and start server
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established.');
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err: any) => {
    console.error('Unable to connect to the database:', err);
  }); 
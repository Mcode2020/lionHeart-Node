import { Request, Response } from 'express';
import { User } from '../../../Models/User';
import { UserLogs } from '../../../Models/UserLogs';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import session from 'express-session';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include session
interface SessionRequest extends Request {
  session: session.Session & {
    loginAttempts?: number;
    lockoutUntil?: number;
    userId?: number;
    redirect_force_class_details?: string;
    url_previous?: string;
  };
}

// Throttling config
const MAX_ATTEMPTS = 50;
const LOCKOUT_MINUTES = 15;

// Helper: get client IP
function getClientIp(req: Request): string {
  return req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
}

// Helper: log user event
async function logUserEvent({ site_type, user_id, ip_address, server, others }: any) {
  await UserLogs.create({
    site_type,
    user_id: user_id ? String(user_id) : '0', // ensure string for bigint
    ip_address,
    server: JSON.stringify(server),
    others: JSON.stringify(others),
    // created_at/updated_at handled by DB if needed
  });
}

// Helper: get previous URL for redirection
function getRedirectUrl(req: SessionRequest): string {
  if (req.session?.redirect_force_class_details) {
    return req.session.redirect_force_class_details;
  }
  if (req.session?.url_previous) {
    return req.session.url_previous;
  }
  if (req.query.previous) {
    return req.query.previous as string;
  }
  if (req.headers.referer && req.headers.referer !== process.env.APP_URL) {
    return req.headers.referer;
  }
  return '/profile';
}

// Helper: get login attempts from session
function getLoginAttempts(req: SessionRequest): number {
  return req.session?.loginAttempts || 0;
}

function setLoginAttempts(req: SessionRequest, attempts: number) {
  if (req.session) req.session.loginAttempts = attempts;
}

function setLockout(req: SessionRequest) {
  if (req.session) req.session.lockoutUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
}

function isLockedOut(req: SessionRequest): boolean {
  if (!req.session?.lockoutUntil) return false;
  return Date.now() < req.session.lockoutUntil;
}

export class LoginController {
  // Show login form
  async showLoginForm(req: Request, res: Response) {
    return res.status(200).json({ message: 'Show login form (API endpoint)' });
  }


//   async login(req: Request, res: Response) {
//     const sreq = req as SessionRequest;
//     const { email, password } = req.body;
//     console.log(email,password,"qqqqqqqqqqqqqqqqqqqqqqqqqqqq")
//     const ip = getClientIp(req);
//     let user: any = null;
//     let loginSuccess = false;
//     let message = '';
//     let userId = 0;

//     // Throttling
//     if (isLockedOut(sreq)) {
//       message = 'Too many attempts';
//       await logUserEvent({
//         site_type: 'parent',
//         user_id: 0,
//         ip_address: ip,
//         server: req.headers,
//         others: { message, request: email },
//       });
//       return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
//     }

//     try {
//       // Find user by email or username
//       user = await User.findOne({
//         where: {
//           [Op.or]: [
//             { email },
//             { username: email },
//           ],
//         },
//       });
//       // Password check (legacy and current)
//       if (user && user.password) {
//   let hash = user.password;

//   if (hash.startsWith("$2y$")) {
//     hash = "$2a$" + hash.slice(4);
//   }

//   const match = await bcrypt.compare(password, hash);
//   if (match) loginSuccess = true;
// }

      
//       if (loginSuccess) {
//         userId = user.id;

//         // Fetch roles and check for 'active' or 'parent'
//         const roles = await user.getRoles();
//         const roleNames = roles.map((r: any) => r.name);
//         if (!roleNames.includes('active') && !roleNames.includes('parent')) {
//           // Log invalid role attempt
//           message = 'Not Valid Role';
//           await logUserEvent({
//             site_type: 'parent',
//             user_id: userId,
//             ip_address: ip,
//             server: req.headers,
//             others: { message, request: email },
//           });
//           setLoginAttempts(sreq, 0);
//           return res.status(403).json({ error: 'You do not have the required role to log in.' });
//         }

//         // Log success
//         message = 'Login Successfully';
//         await logUserEvent({
//           site_type: 'parent',
//           user_id: userId,
//           ip_address: ip,
//           server: req.headers,
//           others: { message, request: email },
//         });
//         setLoginAttempts(sreq, 0);
//         if (!sreq.session) {
//           return res.status(500).json({ error: 'Session is not initialized. Please check your server configuration.' });
//         }
//         sreq.session.userId = user.id;
//         // Redirection logic
//         const redirectUrl = getRedirectUrl(sreq);

//         // Save the session before sending the response to prevent race conditions
//         return sreq.session.save((err) => {
//           if (err) {
//             console.error('Session save error:', err);
//             return res.status(500).json({ error: 'Failed to save session.' });
//           }
//           const token = jwt.sign({ user_id: user.id, email: user.email }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });
//           return res.status(200).json({ message: 'Login successful', user, token, redirect: redirectUrl });
//         });
//       } else {
//         // Failed login
//         let attempts = getLoginAttempts(sreq) + 1;
//         setLoginAttempts(sreq, attempts);
//         message = 'Invalid credentials';
//         await logUserEvent({
//           site_type: 'parent',
//           user_id: 0,
//           ip_address: ip,
//           server: req.headers,
//           others: { message, request: email },
//         });
//         if (attempts >= MAX_ATTEMPTS) {
//           setLockout(sreq);
//           return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
//         }
//         return res.status(401).json({ error: 'Invalid credentials' });
//       }
//     } catch (err: any) {
//       console.error('Login error:', err);
//       if (err instanceof Error) {
//         console.error('Error message:', err.message);
//         console.error('Error stack:', err.stack);
//       }
//       if (err.parent) {
//         console.error('MySQL error:', err.parent.sqlMessage || err.parent.message);
//       }
//       return res.status(500).json({
//         error: 'Server error',
//         details: err.parent?.sqlMessage || err.message || err
//       });
//     }
//   }
// import bcrypt from 'bcryptjs'; // ensure this import exists at top of file

async login(req: Request, res: Response) {
  const sreq = req as SessionRequest;
  const { email, password } = req.body;
  const ip = getClientIp(req);

  console.log("Login attempt with:", { email, password: password ?? '(empty)' });

  let user: any = null;
  let loginSuccess = false;
  let userId = 0;

  // Helper: compare a plaintext password to a PHP/Node bcrypt hash
  const comparePhpBcrypt = async (plain: string, dbHash: string): Promise<boolean> => {
    if (!dbHash) return false;

    // sanity/debug
    console.log("DB hash:", dbHash);
    console.log("DB hash length:", dbHash.length);
    const fmtOK = /^\$(2[aby])\$\d{2}\$[./A-Za-z0-9]{53}$/.test(dbHash);
    console.log("Hash format OK?", fmtOK);

    // Try candidates in order: as-is, $2a$, $2b$ (cover PHP/Node prefix variants)
    const candidates: string[] = [dbHash];
    if (dbHash.startsWith("$2y$")) {
      candidates.push("$2a$" + dbHash.slice(4));
      candidates.push("$2b$" + dbHash.slice(4));
    }

    for (const cand of candidates) {
      try {
        const ok = await bcrypt.compare(plain ?? "", cand);
        console.log(`Compare against prefix ${cand.slice(0,4)} →`, ok);
        if (ok) return true;
      } catch (e) {
        console.error("bcrypt.compare error for candidate:", cand.slice(0,7), e);
      }
    }
    return false;
  };

  // Throttling
  if (isLockedOut(sreq)) {
    await logUserEvent({
      site_type: 'parent',
      user_id: 0,
      ip_address: ip,
      server: req.headers,
      others: { message: 'Too many attempts', request: email },
    });
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  try {
    // Find user by email OR username (login with either)
    user = await User.findOne({
      where: { [Op.or]: [{ email }, { username: email }] },
    });

    console.log("User from DB:", user ? user.email : "Not found");

    if (user && user.password) {
      const matched = await comparePhpBcrypt(password, user.password);
      if (matched) loginSuccess = true;
    } else {
      console.log("No password field present on user record.");
    }

    if (loginSuccess) {
      userId = user.id;

      // Check roles
      const roles = await user.getRoles();
      const roleNames = roles.map((r: any) => r.name);
      console.log("User roles:", roleNames);

      if (!roleNames.includes('active') && !roleNames.includes('parent')) {
        await logUserEvent({
          site_type: 'parent',
          user_id: userId,
          ip_address: ip,
          server: req.headers,
          others: { message: 'Not Valid Role', request: email },
        });
        setLoginAttempts(sreq, 0);
        return res.status(403).json({ error: 'You do not have the required role to log in.' });
      }

      // Success log
      await logUserEvent({
        site_type: 'parent',
        user_id: userId,
        ip_address: ip,
        server: req.headers,
        others: { message: 'Login Successfully', request: email },
      });
      setLoginAttempts(sreq, 0);

      if (!sreq.session) {
        return res.status(500).json({ error: 'Session is not initialized. Please check your server configuration.' });
      }

      sreq.session.userId = user.id;
      const redirectUrl = getRedirectUrl(sreq);

      return sreq.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Failed to save session.' });
        }
        const token = jwt.sign(
          { user_id: user.id, email: user.email },
          process.env.JWT_SECRET || 'your_jwt_secret',
          { expiresIn: '7d' }
        );
        return res.status(200).json({ message: 'Login successful', user, token, redirect: redirectUrl });
      });
    }

    // Failed login
    const attempts = getLoginAttempts(sreq) + 1;
    setLoginAttempts(sreq, attempts);
    console.log("Login failed. Attempts:", attempts);

    await logUserEvent({
      site_type: 'parent',
      user_id: 0,
      ip_address: ip,
      server: req.headers,
      others: { message: 'Invalid credentials', request: email },
    });

    if (attempts >= MAX_ATTEMPTS) {
      setLockout(sreq);
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }
    return res.status(401).json({ error: 'Invalid credentials' });

  } catch (err: any) {
    console.error('Login error:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    if (err?.parent) {
      console.error('MySQL error:', err.parent.sqlMessage || err.parent.message);
    }
    return res.status(500).json({
      error: 'Server error',
      details: err?.parent?.sqlMessage || err.message || err
    });
  }
}



  // Handle logout
  async logout(req: Request, res: Response) {
    const sreq = req as SessionRequest;
    if (sreq.session) {
      sreq.session.destroy(() => {});
    }
    return res.status(200).json({ message: 'Logged out' });
  }
} 
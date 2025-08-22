import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';

import fs from 'fs';
import { LoginController } from './Http/Controllers/Auth/LoginController';
import { RegisterController } from './Http/Controllers/Auth/RegisterController';
import { ResetPasswordController } from './Http/Controllers/Auth/ResetPasswordController';
import { FindClassesController } from './Http/Controllers/Parent/FindClassesController';
import { ForgotPasswordController } from './Http/Controllers/Auth/ForgotPasswordController';
import { ChildController } from './Http/Controllers/ChildController';
import { ProfileController } from './Http/Controllers/Parent/ProfileController';
import { jwtAuthMiddleware } from './Http/Controllers/jwtAuthMiddleware';
import { CoachController } from './Http/Controllers/Coach/CoachController';
// import { VideoMeetingController } from './Http/Controllers/VideoMeetingController';
import { EventController } from './Http/Controllers/Parent/EventController';
import { CartController } from './Http/Controllers/Parent/CartController';
import { ContactCoachController } from './Http/Controllers/Parent/ContactCoachController';

console.log(">>> routes.ts loaded");

// Dummy auth middleware (replace with real one in your app)
const authMiddleware = (req: any, res: any, next: any) => {
  // Assume req.user is set if authenticated
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const loginController = new LoginController();
const registerController = new RegisterController();
const resetPasswordController = new ResetPasswordController();
const findClassesController = new FindClassesController();
const forgotPasswordController = new ForgotPasswordController();
const childController = new ChildController();
const profileController = new ProfileController();
const coachController = new CoachController();
// const videoMeetingController = new VideoMeetingController();
const eventController = new EventController();
const cartController = new CartController();
const contactCoachController = new ContactCoachController();

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Temporary storage - files will be moved to final location in controller
    cb(null, path.join(process.cwd(), 'temp-uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Auth routes
// router.get('/login', (req, res) => loginController.showLoginForm(req, res));
router.post('/login', (req, res) => loginController.login(req, res));
router.post('/logout', (req, res) => loginController.logout(req, res));

// Register routes
router.get('/register', (req, res) => registerController.showRegisterForm(req, res));
router.post('/register', (req, res) => registerController.register(req, res));

// Password reset routes
router.get('/password/reset/:token', (req, res) => resetPasswordController.show(req, res));
router.post('/password/reset/:token', (req, res) => resetPasswordController.reset(req, res));

// Forgot password routes
router.post('/password/forgot', (req, res) => forgotPasswordController.sendResetLinkEmail(req, res));
router.post('/password/reset/:token', (req, res) => forgotPasswordController.resetPassword(req, res));
router.get('/password/reset/:token', (req, res) => forgotPasswordController.showResetPasswordForm(req, res));

// Class search route
router.get('/class/search', (req, res) => findClassesController.search(req, res));

// FindClassesController routes
router.get('/class/list', (req, res) => findClassesController.search(req, res)); // Add missing /class/list route
router.get('/class/location-search', (req, res) => findClassesController.searchByLocation(req, res));
router.get('/class/live', (req, res) => findClassesController.liveClasses(req, res));
router.get('/class/free-trial', (req, res) => findClassesController.freeTrialClass(req, res));
router.get('/class/details/:alias', (req, res) => findClassesController.classDetails(req, res));
router.get('/class/event-by-zipcode', (req, res) => findClassesController.getEventUsingZipcode(req, res));
router.get('/class/search', (req, res) => findClassesController.search(req, res));

// Coach routes
router.get('/coaches', (req, res) => coachController.getCoaches(req, res));
router.post('/coaches/search', (req, res) => coachController.search(req, res));
router.get('/coaches/search', (req, res) => coachController.search(req, res));
router.get('/coaches/:username', (req, res) => coachController.viewCoachByUsername(req,res));

// Child routes (JWT protected)
router.post('/child/add', jwtAuthMiddleware, (req, res) => childController.add(req, res));
router.put('/child/:id', jwtAuthMiddleware, (req, res) => childController.update(req, res));
router.delete('/child/:id', jwtAuthMiddleware, (req, res) => childController.remove(req, res));

// Profile routes (JWT protected)
router.get('/profile/purchased-classes', jwtAuthMiddleware, (req, res) => {
  console.log(">>> /profile/purchased-classes route matched");
  profileController.purchasedClasses(req, res);
});
router.get('/profile', jwtAuthMiddleware, (req, res) => profileController.index(req, res));
router.get('/profile/memberships',jwtAuthMiddleware, (req, res) => profileController.memberships(req, res));
router.get('/profile/auto-enrolls/:alias', jwtAuthMiddleware, (req, res) => profileController.autoEnrolls(req, res));
router.post('/profile/remove-auto-enrollments', jwtAuthMiddleware, (req, res) => profileController.removeAutoEnrollments(req, res));
router.post('/profile/remove-enrollments', jwtAuthMiddleware, (req, res) => profileController.removeEnrollments(req, res));
router.get('/profile/edit', jwtAuthMiddleware, (req, res) => profileController.edit(req, res));
router.post('/profile/update-photo', jwtAuthMiddleware, express.raw({ type: 'image/*', limit: '5mb' }), (req, res) => profileController.updatePhoto(req, res));
router.post('/profile/update', jwtAuthMiddleware, (req, res) => profileController.update(req, res));
router.get('/profile/update-email/:token', jwtAuthMiddleware, (req, res) => profileController.updateEmail(req, res));
router.post('/profile/remove-membership/:membership_id', jwtAuthMiddleware, (req, res) => profileController.removeMembership(req, res));
// Video meetings route
// router.get('/video-meetings', jwtAuthMiddleware, (req, res) => videoMeetingController.getMeetings(req, res));

// Event routes
router.get('/event/fetch/:eventid', (req, res) => eventController.fetch(req, res));
router.get('/event/fetch-child-events', jwtAuthMiddleware, (req, res) => eventController.fetchChildEvents(req, res));

// Static file serving for uploaded images
router.use('/storage', (req, res, next) => {
  const filePath = path.join(process.cwd(), 'public', 'storage', req.url);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

// Cart routes
router.get('/cart', jwtAuthMiddleware, (req, res) => cartController.index(req, res));
router.get('/cart/membership', jwtAuthMiddleware, (req, res) => cartController.membershipCart(req, res));
router.post('/cart/add', jwtAuthMiddleware, (req, res) => cartController.add(req, res));
router.post('/cart/remove', jwtAuthMiddleware, (req, res) => cartController.remove(req, res));
router.post('/cart/update', jwtAuthMiddleware, (req, res) => cartController.update(req, res));
router.post('/cart/autoenroll', jwtAuthMiddleware, (req, res) => cartController.autoenroll(req, res));
router.get('/cart/reroute', (req, res) => cartController.reroute(req, res));
router.get('/password/confirm/list/:classid', (req, res) => cartController.viewconfirmPassword(req, res));
router.post('/password/confirm/:classid', (req, res) => cartController.confirmPassword(req, res));
router.post('/cart/add-donation', jwtAuthMiddleware, (req, res) => cartController.addDonation(req, res));
router.post('/cart/update-donation', jwtAuthMiddleware, (req, res) => cartController.UpdateDonation(req, res));

router.post('/contact-coach', (req, res, next) => contactCoachController.contact(req, res, next));

export default router;
import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../../../Models/User'; // Assuming User model path
import { ContactCoach } from '../../../Models/ContactCoach'; // Assuming ContactCoach model path
import { Thread } from '../../../Models/Thread'; // Assuming Thread model path
import { Participant } from '../../../Models/Participant'; // Assuming Participant model path
import { Message } from '../../../Models/Message'; // Assuming Message model path
import { firebaseAdmin } from '../../../config/firebase-config'; // Assuming Firebase config path
import moment from 'moment'; // For Carbon equivalent

// Placeholder for Mail service
class MailService {
    static async send(template: string, data: any, callback: (message: any) => void) {
        console.log(`Simulating email send: Template - ${template}, Data - ${JSON.stringify(data)}`);
        // In a real application, integrate with an email sending library like Nodemailer
        // For now, just log it.
        const message = {
            to: (email: string) => {
                console.log(`To: ${email}`);
                return message;
            },
            subject: (subject: string) => {
                console.log(`Subject: ${subject}`);
                return message;
            }
        };
        callback(message);
    }
}

// Placeholder for Auth service
class AuthService {
    static check(req: Request): boolean {
        // In a real application, check if user is authenticated via session or token
        return !!req.user; // Assuming req.user is set by authentication middleware
    }

    static id(req: Request): number | null {
        // In a real application, return authenticated user's ID
        return req.user ? req.user.id : null; // Assuming req.user.id is available
    }

    static user(req: Request): any | null {
        // In a real application, return authenticated user object
        return req.user || null; // Assuming req.user is available
    }
}

// Placeholder for config service
const config = {
    get: (key: string) => {
        if (key === 'lfk.FIREBASE_JSON_FILE') return ''; // Placeholder
        if (key === 'lfk.FIREBASE_DATABSE_URL') return 'https://your-firebase-project.firebaseio.com'; // Placeholder
        if (key === 'lfk.adminemail') return 'admin@example.com'; // Placeholder
        if (key === 'lfk.LEVEL3_URL') return 'http://localhost:3000'; // Placeholder
        return '';
    }
};

// Placeholder for Session service
class SessionService {
    static flash(key: string, message: string) {
        console.log(`Flash message: ${key} - ${message}`);
        // In a real application, use a session management library
    }
}

// Placeholder for Broadcast service
class BroadcastService {
    static toOthers(event: any) {
        console.log('Simulating broadcast to others:', event);
        // In a real application, integrate with a real-time broadcasting solution like Socket.IO or Pusher
    }
}

// Placeholder for str_limit equivalent
const str_limit = (str: string, limit: number) => {
    if (str.length <= limit) return str;
    return str.substring(0, limit);
};

// Placeholder for asset equivalent
const asset = (path: string) => {
    return `/assets/${path}`;
};

// Placeholder for url equivalent
const url = (path: string) => {
    return `/${path}`;
};

// Mock User model methods
User.prototype.GetThreadUser = async function(user: any) {
    // Simulate fetching a thread between two users
    // For now, always return null to simulate no existing thread
    return null; // Or implement actual logic if models are connected to DB
};

User.prototype.messages = function() {
    return {
        create: async (data: any) => {
            // Simulate message creation
            console.log('Simulating message creation:', data);
            return { id: Math.floor(Math.random() * 1000), thread_id: data.thread_id, ...data };
        }
    };
};

// Mock Participant model methods
Participant.firstOrCreate = async (data: any) => {
    console.log('Simulating Participant firstOrCreate:', data);
    return { ...data, last_read: null, save: () => {} };
};

// Mock Thread model methods
Thread.create = async (data: any) => {
    console.log('Simulating Thread create:', data);
    return { id: Math.floor(Math.random() * 1000), ...data };
};

Thread.with = function(relation: string) {
    return {
        find: async (id: number) => {
            console.log(`Simulating Thread.with(${relation}).find(${id})`);
            // Simulate fetching thread with participants
            return { participants: [] }; // Return mock data
        }
    };
};

// Mock ContactCoach model methods
ContactCoach.create = async (data: any) => {
    console.log('Simulating ContactCoach create:', data);
    return { id: Math.floor(Math.random() * 1000), ...data };
};

// Mock Firebase Admin SDK methods
const mockFirebaseDatabase = {
    getReference: (path: string) => {
        console.log(`Firebase getReference: ${path}`);
        return {
            push: (data: any) => {
                console.log(`Firebase push to ${path}:`, data);
            },
            getValue: () => {
                console.log(`Firebase getValue from ${path}`);
                return null; // Simulate no existing data for simplicity
            },
            set: (data: any) => {
                console.log(`Firebase set to ${path}:`, data);
            }
        };
    }
};

firebaseAdmin.database = () => mockFirebaseDatabase;

// Extend Request to include user property
declare global {
    namespace Express {
        interface Request {
            user?: any; // Define user property
        }
    }
}

export class ContactCoachController {
    public async contact(req: Request, res: Response, next: NextFunction) {
        console.log('ContactCoachController contact method called');
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { coach_id, message, cellphone } = req.body;

        // Validate cellphone format
        if (cellphone && !/^[0-9\s]*$/.test(cellphone)) {
            return res.status(400).json({ errors: [{ msg: 'Cellphone format is invalid.', param: 'cellphone' }] });
        }

        const user = await User.findByPk(coach_id); // Assuming findByPk for primary key lookup

        if (user) {
            const data = req.body;
            try {
                await MailService.send('email.contact-coach', { user, data }, (mailMessage: any) => {
                    mailMessage.to(user.email).subject('Contact Request!');
                });
            } catch (error: any) {
                console.error('Error sending email:', error);
            }
        }

        if (AuthService.check(req)) {
            try {
                const coach = await User.findByPk(coach_id);

                if (coach) {
                    const msg = await this.startMessageWithUser(req, coach, message || '');

                    if (msg) {
                        const firebaseMessageData = {
                            body: message,
                            created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
                            created_at_humanise: '1s before',
                            id: msg.id,
                            thread_id: msg.thread_id,
                            updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
                            user_id: AuthService.id(req)
                        };

                        const thread_data: { [key: number]: any } = {};
                        const authUserId = AuthService.id(req);
                        const authUser = AuthService.user(req);

                        if (authUserId && authUser) {
                            thread_data[authUserId] = {
                                thread_id: msg.thread_id,
                                created_by: authUserId,
                                users: [], // user_data is empty in PHP code
                                is_group: 0,
                                last_message: str_limit(message, 25),
                                last_message_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                                thread_subject: 'Contact Request!',
                                group_name: '',
                                group_image: '',
                                unread_count: 0,
                                user_id: coach.id,
                                user_name: coach.name,
                                user_image: coach.image,
                            };

                            if (user) {
                                thread_data[user.id] = {
                                thread_id: msg.thread_id,
                                created_by: authUserId,
                                users: [], // user_data is empty in PHP code
                                is_group: 0,
                                last_message: str_limit(message, 25),
                                last_message_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                                thread_subject: 'Contact Request!',
                                group_name: '',
                                group_image: '',
                                unread_count: 1,
                                user_id: authUserId,
                                user_name: authUser.name,
                                user_image: authUser.image,
                            };
                        }

                        await this.sendMessageToFireBase(msg.thread_id, firebaseMessageData);
                        await this.CreateUsersToFireBase(thread_data);
                    }
                    }
                } else {
                    // Coach not found
                }
            } catch (error: any) {
                console.error('Error in authenticated contact:', error);
            }

            const insertData = {
                user_id: AuthService.id(req),
                message: message,
                coach_id: coach_id
            };
            const insert = await ContactCoach.create(insertData);

            // Always return JSON response for API
            // if (!req.xhr) {
            //     SessionService.flash('success', 'Message Send successfully');
            //     return res.redirect('back');
            // }

            return res.status(200).json({ response: insert, message: 'Message Send successfully' });
        }

        // Always return JSON response for API
        // if (!req.xhr) {
        //     SessionService.flash('success', 'Message Send successfully');
        //     return res.redirect('back');
        // }
        return res.status(200).json({ response: true, message: 'Message Send successfully' });
    }

    private async startMessageWithUser(req: Request, user: any, body: string) {
        const authUser = AuthService.user(req);
        if (!authUser) return null;

        let thread = await authUser.GetThreadUser(user);
        let thread_created = false;

        if (!thread) {
            thread = await Thread.create({
                subject: authUser.name,
            });
            thread_created = true;
            const data = {
                thread_id: thread.id,
                group_name: null,
                subject: authUser.name,
                is_group: 0,
                created_by: authUser.id,
                created_at: moment().toDate(),
            };
            // await this.CreateThreadToFireBase(data); // Uncomment if needed
        }

        const message = await authUser.messages().create({
            body: body,
            thread_id: thread.id
        });

        const participant = await Participant.firstOrCreate({
            thread_id: thread.id,
            user_id: authUser.id,
        });
        const participant2 = await Participant.firstOrCreate({
            thread_id: thread.id,
            user_id: user.id,
        });

        participant.last_read = moment().toDate();
        participant.save();

        const userimageAuth = authUser.profile_image ? url(`storage/${authUser.profile_image}`) : asset('frontend-parent/images/default.png');
        const userimageTarget = user.profile_image ? `${config.get('lfk.LEVEL3_URL')}/storage/${user.profile_image}` : asset('frontend-parent/images/default.png');

        const participant_firebase: { [key: number]: any } = {};
        participant_firebase[user.id] = { thread: thread, user_image: userimageAuth, user_name: authUser.name };
        participant_firebase[authUser.id] = { thread: thread, user_image: userimageTarget, user_name: user.name };

        if (thread_created) {
            // await this.CreateUsersToFireBase(participant_firebase); // Uncomment if needed
        }

        try {
            BroadcastService.toOthers({}); // Simulate MessageSent event
        } catch (error: any) {
            console.error('Error broadcasting message:', error);
        }

        return message;
    }

    private async sendMessageToFireBase(thread_id: number, data: any) {
        if (typeof data === 'object' && data !== null) {
            const database = firebaseAdmin.database();
            const reference = database.getReference(String(thread_id));
            reference.push(data);
            return true;
        }
        return false;
    }

    // private async CreateThreadToFireBase(data: any) {
    //     if (typeof data === 'object' && data !== null) {
    //         const database = firebaseAdmin.database();
    //         const reference = database.getReference('Thread');
    //         reference.push(data);
    //         return true;
    //     }
    //     return false;
    // }

    private async CreateUsersToFireBase(data: { [key: number]: any }) {
        if (typeof data === 'object' && data !== null) {
            const database = firebaseAdmin.database();

            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const value = data[key];
                    const detailRef = database.getReference(`/UserThread/${key}`);
                    const detail_value = detailRef.getValue(); // This will be null in mock

                    if (detail_value) {
                        let unread_count = 0;
                        let thread_count = 0;
                        for (const k in detail_value as any) {
                            if ((detail_value as any).hasOwnProperty(k)) {
                                const v = detail_value[k];
                                if ((v as any).thread_id && (v as any).thread_id == value.thread_id) {
                                    thread_count++;
                                    unread_count = (v as any).unread_count;
                                    unread_count++;
                                    database.getReference(`/UserThread/${key}/${k}/unread_count/`).set(unread_count);
                                }
                            }
                        }
                        if (thread_count === 0) {
                            detailRef.push(value);
                        }
                    } else {
                        detailRef.push(value);
                    }
                }
            }
            return true;
        }
        return false;
    }

    public async update_unread_count(thread_id: number, currentUserId: number | null) {
        const database = firebaseAdmin.database();
        const thread = await Thread.with('participants').find(thread_id);

        if (thread && thread.participants) {
            for (const user of thread.participants) {
                const detailRef = database.getReference(`/UserThread/${user.user_id}/`);
                const detail_value = detailRef.getValue(); // This will be null in mock

                if (detail_value) {
                    let unread_count = 0;
                    for (const k in detail_value as any) {
                        if ((detail_value as any).hasOwnProperty(k)) {
                            const v = detail_value[k];
                            if (user.user_id !== currentUserId) {
                                if ((v as any).thread_id === thread_id) {
                                    unread_count = (v as any).unread_count;
                                    unread_count++;
                                    database.getReference(`/UserThread/${user.user_id}/${k}/unread_count/`).set(unread_count);
                                    database.getReference(`/UserThread/${user.user_id}/${k}/last_message_time/`).set(moment().format('YYYY-MM-DD HH:mm:ss'));
                                }
                            } else {
                                if ((v as any).thread_id === thread_id) {
                                    database.getReference(`/UserThread/${currentUserId}/${k}/unread_count/`).set(0);
                                    database.getReference(`/UserThread/${currentUserId}/${k}/last_message_time/`).set(moment().format('YYYY-MM-DD HH:mm:ss'));
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    public async SendMailToAdmin(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = req.body;

        try {
            await MailService.send('email.contact-coach', { data }, (mailMessage: any) => {
                mailMessage.to(config.get('lfk.adminemail')).subject('Create Class Request!');
            });
        } catch (error: any) {
            console.error('Error sending admin email:', error);
        }

        SessionService.flash('flash_success', 'Your Message send successfully. We are contact soon');
        return res.redirect('back'); // Simulate back redirect
    }
}
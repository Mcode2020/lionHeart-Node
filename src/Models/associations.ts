import { User } from './User';
import { Role } from './Role';
import { UserRole } from './UserRole';
import { Child } from './Child';
import { Event } from './Event';
import { Roster } from './Roster';
import { Enrollment } from './Enrollment';
import { ParentProfile } from './ParentProfile';
import { EmergencyContact } from './EmergencyContact';
import { UserMembership } from './UserMembership';
import { ChangeEmailRequest } from './ChangeEmailRequest';
import { PersonalApplication } from './PersonalApplication';
import { VideoMeeting } from './VideoMeeting';
import { VideoMeetingInvitations } from './VideoMeetingInvitations';
import { Zipcode } from './Zipcode';
import { SportsRotation } from './SportsRotation';
import { AnnualSchedule } from './AnnualSchedule';

User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id' });

// Child associations
User.hasMany(Child, { foreignKey: 'user_id' });
Child.belongsTo(User, { foreignKey: 'user_id' });

// Roster associations
Roster.belongsTo(Event, { foreignKey: 'event_splms_event_id', as: 'event' });
Roster.belongsTo(Child, { foreignKey: 'children_id', as: 'Child' });
Event.hasMany(Roster, { foreignKey: 'event_splms_event_id', as: 'Rosters' });
Child.hasMany(Roster, { foreignKey: 'children_id' });

// Enrollment associations
Enrollment.belongsTo(Child, { foreignKey: 'child_id' });
Enrollment.belongsTo(Event, { foreignKey: 'event_id', targetKey: 'splms_event_id' });
Enrollment.belongsTo(User, { foreignKey: 'user_id' });

// Profile associations
User.hasOne(ParentProfile, { foreignKey: 'user_id', as: 'profile' });
ParentProfile.belongsTo(User, { foreignKey: 'user_id' });

// Emergency contact associations
User.hasOne(EmergencyContact, { foreignKey: 'user_id', as: 'emergency' });
EmergencyContact.belongsTo(User, { foreignKey: 'user_id' });

// Membership associations
User.hasMany(UserMembership, { foreignKey: 'user_id', as: 'memberships' });
UserMembership.belongsTo(User, { foreignKey: 'user_id' });
UserMembership.belongsTo(Event, { foreignKey: 'splms_event_id', as: 'Event' });
UserMembership.belongsTo(Child, { foreignKey: 'children_id', as: 'Child' });
Event.hasMany(UserMembership, { foreignKey: 'splms_event_id', as: 'memberships' });
Child.hasMany(UserMembership, { foreignKey: 'children_id', as: 'memberships' });

// Email change request associations
User.hasMany(ChangeEmailRequest, { foreignKey: 'user_id', as: 'emailChangeRequests' });
ChangeEmailRequest.belongsTo(User, { foreignKey: 'user_id' });

// User has one PersonalApplication
User.hasOne(PersonalApplication, { foreignKey: 'user_id', as: 'personalApplication' });
PersonalApplication.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

VideoMeeting.hasMany(VideoMeetingInvitations, { foreignKey: 'video_meeting_id', as: 'invitations' });
VideoMeetingInvitations.belongsTo(VideoMeeting, { foreignKey: 'video_meeting_id', as: 'meeting' });

// An Event belongs to a User (the creator)
Event.belongsTo(User, { foreignKey: 'created_by', as: 'user' });
// A User can have many Events
User.hasMany(Event, { foreignKey: 'created_by', as: 'events' });

// An Event belongs to a Zipcode
Event.belongsTo(Zipcode, { foreignKey: 'event_zip', as: 'zipcode', targetKey: 'zipcode' });

// Event <-> SportsRotation associations
Event.hasMany(SportsRotation, { as: 'SportsRotation', foreignKey: 'splms_event_id' });
SportsRotation.belongsTo(Event, { foreignKey: 'splms_event_id', as: 'event' });

// Event <-> AnnualSchedule associations
// Event.hasMany(AnnualSchedule, { as: 'AnnualSchedule', foreignKey: 'splms_event_id' });
// AnnualSchedule.belongsTo(Event, { foreignKey: 'splms_event_id', as: 'event' });

// VideoMeeting <-> Event association
VideoMeeting.belongsTo(Event, { foreignKey: 'splms_event_id', as: 'event' });
Event.hasMany(VideoMeeting, { foreignKey: 'splms_event_id', as: 'videoMeetings' });
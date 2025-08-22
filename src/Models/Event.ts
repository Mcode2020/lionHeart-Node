import { DataTypes, Model, Op } from 'sequelize';
import sequelize from '../db';

export class Event extends Model {
  public splms_event_id!: number;
  public alias!: string;
  public event_start_date?: string;
  public event_end_date?: string;
  public title!: string;
  public type_of_event!: string;
  public max_participants?: number;
  public halt_date?: Date; // Added for regcutoff filter
  public pay_type?: string; // Added for parentClasses filter
  public isprivate?: number; // Added for publicClasses filter
  public enabled?: boolean;
  public freezed?: number;
  public membership_test?: string | number;
  public scheduled?: number;
  public password?: string;
  public no_class_days?: string | null;
  public auto_enroll_id?: number; // Added for auto-enrollment functionality
  public created_by?: number; // Added for coach relationship

  // PHP: ->ActiveMembershipsClasses()
  static activeMembershipsClasses() {
    return {
      enabled: 1,
      freezed: 0,
      [Op.or]: [
        { event_end_date: { [Op.gte]: new Date() } },
        { membership_test: 1 },
      ],
    };
  }

  // PHP: ->RegcutoffMembershipClasses()
  static regcutoffMembershipClasses() {
    return {
      [Op.or]: [
        { halt_date: { [Op.gte]: new Date() } },
        { membership_test: 1 }
      ]
    };
  }

  // PHP: ->scheduledClasses()
  static scheduledClasses() {
    return {
      scheduled: 1,
    };
  }

  // PHP: ->parentClasses()
  static parentClasses() {
    return {
      pay_type: { [Op.ne]: 'invoiced_account' },
    };
  }

  // PHP: ->publicClasses()
  static publicClasses() {
    return {
      isprivate: { [Op.ne]: 1 },
    };
  }

  // PHP: ->filter($request->all())
  static filter(query: any) {
    const where: any = {};
    if (query.term) { // Use 'term' for title search
      where.title = { [Op.like]: `%${query.term}%` };
    }
    if (query.type_of_event) {
      where.type_of_event = query.type_of_event;
    }
    // Add more filters as needed
    return where;
  }
}

Event.init({
  splms_event_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
  },
  alias: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  event_start_date: DataTypes.STRING,
  event_end_date: DataTypes.STRING,
  title: DataTypes.STRING,
  type_of_event: DataTypes.STRING,
  max_participants: DataTypes.INTEGER,
  halt_date: DataTypes.DATE,
  pay_type: DataTypes.STRING, // Added for parentClasses filter
  isprivate: DataTypes.TINYINT, // Added for publicClasses filter
  enabled: DataTypes.BOOLEAN,
  freezed: DataTypes.TINYINT,
  membership_test: DataTypes.STRING,
  scheduled: DataTypes.TINYINT,
  password: DataTypes.STRING,
  no_class_days: DataTypes.TEXT,
  auto_enroll_id: DataTypes.INTEGER, // Added for auto-enrollment functionality
  created_by: DataTypes.INTEGER, // Added for coach relationship
}, {
  sequelize,
  tableName: 'level3_splms_events',
  timestamps: false,
}); 
import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';
import { Role } from './Role';
import { UserRole } from './UserRole';
import { PersonalApplication } from './PersonalApplication';

export class User extends Model {
  public id!: number;
  public first_name!: string;
  public last_name?: string;
  public username!: string;
  public email!: string;
  public password!: string;
  public password_old?: string;
  public profile_image?: string; // Add profile_image property

  // Add other fields as needed

  // Add $add for TypeScript
  public $add!: (property: string, values: number[] | number) => Promise<void>;
  // Add addRoles for TypeScript
  public addRoles!: (roleIds: number[] | number) => Promise<void>;

  get name(): string {
    return `${this.first_name} ${this.last_name || ''}`.trim();
  }

  get image(): string {
    // Provide a default image or logic to construct the image URL
    return this.profile_image ? `/storage/${this.profile_image}` : '/assets/frontend-parent/images/default.png';
  }

  public async GetThreadUser(user: any): Promise<any> {
    // In a real application, this would query the database for a thread
    // between the current user (this) and the provided user.
    // For now, it's a mock.
    console.log(`Mock GetThreadUser for user ${this.id} with user ${user.id}`);
    return null; // Simulate no existing thread
  }

  public messages(): any {
    // In a real application, this would return a relation to messages
    // For now, it's a mock that allows creating messages.
    const currentUser = this;
    return {
      create: async (data: any) => {
        console.log(`Mock messages().create for user ${currentUser.id}:`, data);
        // Simulate message creation
        return { id: Math.floor(Math.random() * 1000), thread_id: data.thread_id, ...data };
      }
    };
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password_old: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'users',
  timestamps: false,
});

// Remove association definitions from here to avoid duplicate alias errors
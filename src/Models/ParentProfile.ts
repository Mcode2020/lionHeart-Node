import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class ParentProfile extends Model {
  public id!: number;
  public first_name?: string;
  public middle_name?: string;
  public last_name?: string;
  public email2?: string;
  public cellphone?: string;
  public alternatephone?: string;
  public fax?: string;
  public ssn?: string;
  public city?: string;
  public state?: string;
  public zipcode?: string;
  public address?: string;
  public address2?: string;
  public bankrupcy?: boolean;
  public felony?: boolean;
  public dob?: Date;
  public additional_email?: string;
  public additional_information?: string;
  public friend_referral?: string;
  public user_id!: number;
  public created_at?: Date;
  public updated_at?: Date;
  public deleted_at?: Date;
  public freezed!: number;
}

ParentProfile.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  middle_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cellphone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  alternatephone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fax: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ssn: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  zipcode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  address2: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bankrupcy: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  felony: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  additional_email: {
    type: DataTypes.STRING(191),
    allowNull: true,
  },
  additional_information: {
    type: DataTypes.STRING(191),
    allowNull: true,
  },
  friend_referral: {
    type: DataTypes.STRING(191),
    allowNull: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
  deleted_at: DataTypes.DATE,
  freezed: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'ParentProfile',
  tableName: 'parent_profile',
  timestamps: false, // Set to true if you want Sequelize to manage created_at/updated_at
  paranoid: true, // Enables soft deletes using deleted_at
  underscored: true, // Uses snake_case for automatically added fields
}); 
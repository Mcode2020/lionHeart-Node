import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class EmergencyContact extends Model {
  public id!: number;
  public user_id!: number;
  public first_name!: string;
  public last_name!: string;
  public address?: string;
  public phone!: string;
  public created_at?: Date;
  public updated_at?: Date;
}

EmergencyContact.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName: 'emergency_contacts',
  timestamps: false, // Set to true if you want Sequelize to manage created_at/updated_at
}); 
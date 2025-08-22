import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class ChangeEmailRequest extends Model {
  public id!: number;
  public user_id!: number;
  public email!: string;
  public verified!: number;
  public activation_link!: string;
  public activation_time?: string;
}

ChangeEmailRequest.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  verified: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
  },
  activation_link: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  activation_time: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'change_email_request',
  timestamps: false,
}); 
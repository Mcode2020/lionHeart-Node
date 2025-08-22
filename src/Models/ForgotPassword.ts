import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class ForgotPassword extends Model {
  public id!: number;
  public user_id!: number;
  public token!: string;
  public created_at!: Date;
  public valid_for?: number;
}

ForgotPassword.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  valid_for: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'password_resets',
  timestamps: false,
}); 
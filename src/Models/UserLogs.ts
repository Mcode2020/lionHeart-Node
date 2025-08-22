import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class UserLogs extends Model {
  public id!: number;
  public user_id!: string; // bigint(20) as string
  public ip_address?: string;
  public server?: string;
  public others?: string;
  public site_type?: string;
  public deleted_at?: Date;
  public created_at?: Date;
  public updated_at?: Date;
}

UserLogs.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  server: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  others: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  site_type: {
    type: DataTypes.ENUM('admin', 'coach', 'facility', 'parent', 'not_define'),
    allowNull: true,
    defaultValue: 'not_define',
  },
  deleted_at: DataTypes.DATE,
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName: 'user_logs',
  timestamps: false, // Set to true if you want Sequelize to manage created_at/updated_at
  underscored: true, // Use snake_case for auto fields
  paranoid: true,    // Use deleted_at for soft deletes
}); 
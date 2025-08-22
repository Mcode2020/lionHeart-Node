import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';
import { User } from './User';
import { UserRole } from './UserRole';

export class Role extends Model {
  public id!: number;
  public name!: string;
  public display_name?: string;
  public description?: string;
  public created_at?: Date;
  public updated_at?: Date;
}

Role.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  display_name: DataTypes.STRING,
  description: DataTypes.STRING,
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName: 'roles',
  timestamps: false,
}); 
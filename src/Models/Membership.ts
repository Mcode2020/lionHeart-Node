import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class Membership extends Model {
  public id!: number;
  public name?: string;
  public type?: string;
  public description?: string;
  public price?: number;
  public duration?: number;
  public duration_type?: string;
  public is_active?: boolean;
  public features?: string;
  public created_at?: Date;
  public updated_at?: Date;
}

Membership.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  duration_type: {
    type: DataTypes.ENUM('days', 'weeks', 'months', 'years'),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  features: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'memberships',
  timestamps: false,
}); 
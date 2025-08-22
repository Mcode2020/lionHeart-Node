import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class Enrollment extends Model {
  public id!: number;
  public child_id!: number;
  public event_id!: number;
  public user_id!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

Enrollment.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  child_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  event_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName: 'enrollments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}); 
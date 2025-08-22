import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class SportsRotation extends Model {
  public id!: number;
  public splms_event_id!: number;
  public interval_type?: string;
  public interval?: number;
  public total_rotation?: number;
  public rotation_sports?: string; // Serialized data
  public next_sport?: string;
  public repeat_cycle?: number;
  public next_class_start_date?: Date;
  public created_at?: Date;
  public updated_at?: Date;
  public deleted_at?: Date;

  // Custom getter for rotation_sports (matching PHP logic)
  getRotationSports(): any {
    if (!this.rotation_sports) return {};
    
    try {
      const value = JSON.parse(this.rotation_sports);
      const currentMonth = new Date().getMonth() + 1; // Get current month (1-12)
      const sequence: any = {};
      
      for (let i = 0; i < 12; i++) {
        const monthIndex = ((currentMonth + i - 1) % 12) + 1;
        sequence[monthIndex] = value[monthIndex] || null;
      }
      
      return sequence;
    } catch (error) {
      console.error('Error parsing rotation_sports:', error);
      return {};
    }
  }
}

SportsRotation.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  splms_event_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  interval_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  interval: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  total_rotation: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  rotation_sports: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Serialized JSON data for sports rotation by month',
  },
  next_sport: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  repeat_cycle: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  next_class_start_date: {
    type: DataTypes.DATE,
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
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'sports_rotations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true, // Enables soft deletes
}); 
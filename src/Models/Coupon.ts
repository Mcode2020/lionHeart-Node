import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class Coupon extends Model {
  public id!: number;
  public code!: string;
  public amount!: number;
  public individual?: number;
  public type?: string;
  public description?: string;
  public valid_from?: Date;
  public valid_until?: Date;
  public usage_limit?: number;
  public used_count?: number;
  public is_active?: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

Coupon.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  individual: {
    type: DataTypes.INTEGER.UNSIGNED,
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
  valid_from: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  valid_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usage_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  used_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'coupons',
  timestamps: false,
}); 
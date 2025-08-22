import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class Payments extends Model {
  public id!: number;
  public user_id?: number;
  public amount!: number;
  public payment_type?: string;
  public status?: string;
  public transaction_id?: string;
  public stripe_payment_intent_id?: string;
  public stripe_charge_id?: string;
  public description?: string;
  public metadata?: string;
  public created_at?: Date;
  public updated_at?: Date;
}

Payments.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  transaction_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripe_payment_intent_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripe_charge_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
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
  tableName: 'payments',
  timestamps: false,
}); 
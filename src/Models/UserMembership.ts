import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class UserMembership extends Model {
  public id!: number;
  public user_id!: number;
  public children_id!: number;
  public splms_event_id!: number;
  public park_id?: number;
  public facility_id?: number;
  public price?: number;
  public membership_type?: string;
  public old_membership_type?: string;
  public purchase_date?: string;
  public status?: string;
  public expired_date?: string;
  public free_trial_date?: string;
}

UserMembership.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: DataTypes.INTEGER.UNSIGNED,
  children_id: DataTypes.INTEGER.UNSIGNED,
  splms_event_id: DataTypes.INTEGER.UNSIGNED,
  park_id: DataTypes.INTEGER.UNSIGNED,
  facility_id: DataTypes.INTEGER.UNSIGNED,
  price: DataTypes.FLOAT,
  membership_type: DataTypes.STRING,
  old_membership_type: DataTypes.STRING,
  purchase_date: DataTypes.STRING,
  status: DataTypes.STRING,
  expired_date: DataTypes.STRING,
  free_trial_date: DataTypes.STRING,
}, {
  sequelize,
  tableName: 'user_memberships',
  timestamps: false,
}); 
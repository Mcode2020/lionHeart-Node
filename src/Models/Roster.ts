import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class Roster extends Model {
  public id!: number;
  public event_splms_event_id!: number;
  public children_id!: number;
  public payment_id!: number;
}

Roster.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  event_splms_event_id: DataTypes.INTEGER.UNSIGNED,
  children_id: DataTypes.INTEGER.UNSIGNED,
  payment_id: DataTypes.INTEGER.UNSIGNED,
}, {
  sequelize,
  tableName: 'rosters',
  timestamps: false,
});
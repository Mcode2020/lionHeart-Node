import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class TableNightInvitation extends Model {
  public id!: number;
  public email!: string;
  public user_id?: number;
  public splms_event_id?: number;
  public status?: string;
}

TableNightInvitation.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  user_id: DataTypes.INTEGER.UNSIGNED,
  splms_event_id: DataTypes.INTEGER.UNSIGNED,
  status: DataTypes.STRING,
}, {
  sequelize,
  tableName: 'table_night_invitations',
  timestamps: false,
}); 
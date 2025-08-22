import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class AnnualSchedule extends Model {
  public id!: number;
  // public splms_event_id?: number;
  // public title?: string;
  // public description?: string;
  // public start_date?: Date;
  // public end_date?: Date;
  // public enabled?: boolean;
  // public created_at?: Date;
  // public updated_at?: Date;
}

AnnualSchedule.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  // splms_event_id: {
  //   type: DataTypes.INTEGER.UNSIGNED,
  //   allowNull: true,
  // },
  // title: {
  //   type: DataTypes.STRING,
  //   allowNull: true,
  // },
  // description: {
  //   type: DataTypes.TEXT,
  //   allowNull: true,
  // },
  // start_date: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
  // end_date: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
  // enabled: {
  //   type: DataTypes.BOOLEAN,
  //   allowNull: true,
  //   defaultValue: true,
  // },
  // created_at: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
  // updated_at: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
}, {
  sequelize,
  tableName: 'annual_schedule',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
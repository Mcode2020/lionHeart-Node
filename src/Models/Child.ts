import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class Child extends Model {
  public id!: number;
  public user_id!: number;
  public first_name!: string;
  public last_name!: string;
  public birthday!: string;
  public gender!: string;
}

Child.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  first_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  birthday: DataTypes.STRING,
  gender: DataTypes.STRING,
}, {
  sequelize,
  tableName: 'children',
  timestamps: false,
}); 
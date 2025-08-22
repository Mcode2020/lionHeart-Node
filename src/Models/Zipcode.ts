import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class Zipcode extends Model {
  public id!: number;
  public country!: string;
  public zipcode!: string;
  public latitude!: string;
  public longitude!: string;
}

Zipcode.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  country: DataTypes.STRING,
  zipcode: { type: DataTypes.STRING, primaryKey: true },
  latitude: DataTypes.STRING,
  longitude: DataTypes.STRING,
}, {
  sequelize,
  tableName: 'zipcodes',
  timestamps: false,
}); 
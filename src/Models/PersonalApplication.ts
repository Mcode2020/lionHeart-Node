import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class PersonalApplication extends Model {
  public id!: number;
  public firstname!: string;
  public middlename!: string;
  public lastname!: string;
  public homephone?: string;
  public fax?: string;
  public ssn!: string;
  public city!: string;
  public state!: string;
  public territory?: string;
  public zipcode!: string;
  public address!: string;
  public address2!: string;
  public latitude?: string;
  public longitude?: string;
  public bankrupcy!: number;
  public felony!: number;
  public dob?: Date;
  public user_id!: number;
  public created_at?: Date;
  public updated_at?: Date;
  public membership!: number;
  public active!: number;
  public insured!: number;
  public quaification?: string;
  public sterling_data?: string;
  public payment_info?: string;
  public subscription_info?: string;
  public mentor_id?: number;
}

PersonalApplication.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  firstname: { type: DataTypes.STRING, allowNull: false },
  middlename: { type: DataTypes.STRING, allowNull: false },
  lastname: { type: DataTypes.STRING, allowNull: false },
  homephone: { type: DataTypes.STRING, allowNull: true },
  fax: { type: DataTypes.STRING, allowNull: true },
  ssn: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.STRING, allowNull: false },
  territory: { type: DataTypes.STRING(50), allowNull: true },
  zipcode: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.TEXT, allowNull: false },
  address2: { type: DataTypes.TEXT, allowNull: false },
  latitude: { type: DataTypes.STRING(55), allowNull: true },
  longitude: { type: DataTypes.STRING(55), allowNull: true },
  bankrupcy: { type: DataTypes.TINYINT, allowNull: false },
  felony: { type: DataTypes.TINYINT, allowNull: false },
  dob: { type: DataTypes.DATE, allowNull: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: true },
  updated_at: { type: DataTypes.DATE, allowNull: true },
  membership: { type: DataTypes.TINYINT, allowNull: false },
  active: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  insured: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  quaification: { type: DataTypes.TEXT, allowNull: true },
  sterling_data: { type: DataTypes.TEXT, allowNull: true },
  payment_info: { type: DataTypes.TEXT, allowNull: true },
  subscription_info: { type: DataTypes.TEXT, allowNull: true },
  mentor_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  sequelize,
  tableName: 'personal_applications',
  timestamps: false,
}); 
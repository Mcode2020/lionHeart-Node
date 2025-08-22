import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class UserRole extends Model {
  public user_id!: number;
  public role_id!: number;
}

UserRole.init({
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    primaryKey: true,
  },
  role_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    primaryKey: true,
  },
}, {
  sequelize,
  tableName: 'role_user',
  timestamps: false,
}); 
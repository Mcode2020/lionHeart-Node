import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class VideoMeetingInvitations extends Model {
  public id!: number;
  public video_meeting_id!: number;
  public email!: string;
  public post_view?: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

VideoMeetingInvitations.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  video_meeting_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  post_view: DataTypes.BOOLEAN,
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName: 'video_meeting_invitations',
  timestamps: false,
}); 
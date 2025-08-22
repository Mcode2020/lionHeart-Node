import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class VideoMeeting extends Model {
  public id!: number;
  public splms_event_id?: number;
  public title!: string;
  public payment_type?: 'parent_paid' | 'invoice_paid';
  public description?: string;
  public is_play_on_time?: boolean;
  public start_date_time?: Date;
  public end_date_time?: Date;
  public start_time?: string;
  public end_time?: string;
  public duration?: number;
  public class_day?: number;
  public timezone?: string;
  public is_archive?: boolean;
  public video_id?: string;
  public video_type?: 'vimeo' | 'youtube';
  public created_by?: number;
  public last_edited_by?: number;
  public created_at?: Date;
  public updated_at?: Date;
  public deleted_at?: Date;
  public video_pdf_name?: string;
  public video_pdf?: string;
}

VideoMeeting.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  splms_event_id: DataTypes.INTEGER.UNSIGNED,
  title: DataTypes.STRING,
  payment_type: DataTypes.ENUM('parent_paid', 'invoice_paid'),
  description: DataTypes.TEXT('long'),
  is_play_on_time: DataTypes.BOOLEAN,
  start_date_time: DataTypes.DATE,
  end_date_time: DataTypes.DATE,
  start_time: DataTypes.TIME,
  end_time: DataTypes.TIME,
  duration: DataTypes.INTEGER,
  class_day: DataTypes.TINYINT,
  timezone: DataTypes.STRING,
  is_archive: DataTypes.BOOLEAN,
  video_id: DataTypes.TEXT,
  video_type: DataTypes.ENUM('vimeo', 'youtube'),
  created_by: DataTypes.INTEGER.UNSIGNED,
  last_edited_by: DataTypes.INTEGER.UNSIGNED,
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
  deleted_at: DataTypes.DATE,
  video_pdf_name: DataTypes.STRING,
  video_pdf: DataTypes.STRING,
}, {
  sequelize,
  tableName: 'video_meetings',
  timestamps: false,
}); 
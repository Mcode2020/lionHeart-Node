import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_USER:', process.env.DB_USER);

const sequelize = new Sequelize(
  process.env.DB_DATABASE as string,
  process.env.DB_USER as string,
  process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) ,
    dialect: 'mysql',
    logging: (msg) => console.log('Sequelize:', msg),
  }
);

console.log('Sequelize instance created.');

export default sequelize; 
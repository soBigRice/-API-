import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const rawDatabasePort = process.env.DB_PORT ?? '3306';
  const parsedDatabasePort = Number(rawDatabasePort);

  if (Number.isNaN(parsedDatabasePort)) {
    throw new Error(`Invalid DB_PORT value: ${rawDatabasePort}`);
  }

  return {
    host: process.env.DB_HOST,
    port: parsedDatabasePort,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };
});

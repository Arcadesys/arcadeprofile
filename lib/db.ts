import postgres from 'postgres';
import { getRequiredDatabaseURL } from './env';

const connectionString = getRequiredDatabaseURL();
const isLocalConnection = /localhost|127\.0\.0\.1/i.test(connectionString);

const sql = postgres(connectionString, {
  ssl: isLocalConnection ? false : 'require',
  max: 5,
});

export default sql;

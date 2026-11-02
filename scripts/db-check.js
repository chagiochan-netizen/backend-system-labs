import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    connectionTimeoutMillis: 5000
});

try {
    const result = await pool.query(
        'SELECT current_database() AS database_name'
    );

    console.log(result.rows);
} catch (error) {
    console.error('Kết nối hoặc truy vấn thất bại:', error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
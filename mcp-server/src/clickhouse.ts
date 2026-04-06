import { createClient } from '@clickhouse/client';

const client = createClient({
  host: 'http://localhost:8123',
  username: 'default',
  password: 'password',
  database: 'default'
});

export async function initDB() {
  await client.exec({
    query: `
      CREATE TABLE IF NOT EXISTS telemetry_logs (
        timestamp DateTime,
        service String,
        level String,
        message String
      ) ENGINE = MergeTree()
      ORDER BY timestamp
    `
  });

  // Seed data if empty
  const countRes = await client.query({ query: 'SELECT count() as c FROM telemetry_logs' });
  const countData: any = await countRes.json();
  
  if (countData.data[0].c === "0") {
    console.error("Seeding ClickHouse with dummy telemetry data...");
    const values = [];
    const now = new Date();
    for(let i=0; i<500; i++) {
      const time = new Date(now.getTime() - Math.floor(Math.random() * 3600000));
      const isSpike = Math.random() > 0.95; // Create an artificial spike
      const service = isSpike ? 'payment-gateway' : 'auth-service';
      const level = isSpike ? 'ERROR' : 'INFO';
      const timeStr = time.toISOString().replace('T', ' ').substring(0, 19);
      values.push(`('${timeStr}', '${service}', '${level}', 'Log entry ${i}')`);
    }
    await client.exec({ query: `INSERT INTO telemetry_logs VALUES ${values.join(',')}` });
  }
}

export async function queryClickHouse(query: string) {
  const resultSet = await client.query({ query, format: 'JSONEachRow' });
  return resultSet.json();
}

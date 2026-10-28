import dns from 'dns';
import mongoose from 'mongoose';

// Optional: if "querySrv ETIMEOUT" appears with a mongodb+srv:// link, set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((x) => x.trim()));

export default async function connectDB() {
  const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
}

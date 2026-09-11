import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as { _mongo?: MongoClient };

function client() {
  if (!globalForMongo._mongo) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI غير معرّف. انسخ .env.example إلى .env.local واملأ القيم.");
    globalForMongo._mongo = new MongoClient(uri, {
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
  }
  return globalForMongo._mongo;
}

export async function db() {
  const mongo = client();
  await mongo.connect();
  return mongo.db(process.env.MONGODB_DB || "royal_quotes");
}

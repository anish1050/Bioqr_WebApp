import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI || "";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log("Connecting to Atlas...");
    if (!uri) throw new Error("MONGO_URI not found in .env");
    
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB Atlas!");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Failed to connect:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}
run();

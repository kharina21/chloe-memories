import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from 'mongoose';
const uri = "mongodb+srv://kharina21:Jreiking21@cluster0.j4uo2jq.mongodb.net/thoiu?appName=Cluster0";

console.log("Connecting to MongoDB with Google DNS configured...");
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("SUCCESS: Programmatic Google DNS configuration resolved the connection!");
    process.exit(0);
  })
  .catch(err => {
    console.error("FAILURE: Still failed to connect.");
    console.error("Error details:", err.message);
    process.exit(1);
  });

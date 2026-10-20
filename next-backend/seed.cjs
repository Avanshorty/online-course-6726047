const dns = require("node:dns");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

dns.setServers(["1.1.1.1"]);

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    const users = client.db("online_course").collection("users");

    await users.createIndex({ email: 1 }, { unique: true });

    for (const role of ["Teacher", "Student"]) {
      for (let i = 1; i <= 3; i++) {
        const username = `${role.toLowerCase()}${i}`;
        const email = `${username}@example.com`;

        await users.updateOne(
          { email },
          {
            $setOnInsert: {
              username,
              email,
              password: await bcrypt.hash("CourseTest2026", 10),
              role,
            },
          },
          { upsert: true }
        );

        console.log(`${role}: ${email}`);
      }
    }

    console.log("Test users ready.");
  } finally {
    await client.close();
  }
}

seed().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
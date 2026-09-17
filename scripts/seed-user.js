// Creates or updates one login. Never prints an existing password back out.
//
// Usage:
//   node scripts/seed-user.js <username> "<full name>" <OWNER_MANAGER|STAFF> [password]
//
// If password is omitted, a random one is generated and printed once —
// there is no self-service password change yet, so treat it as temporary.

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const [username, name, tier, providedPassword] = process.argv.slice(2);

  if (!username || !name || !tier) {
    console.error(
      'Usage: node scripts/seed-user.js <username> "<full name>" <OWNER_MANAGER|STAFF> [password]'
    );
    process.exit(1);
  }

  if (tier !== "OWNER_MANAGER" && tier !== "STAFF") {
    console.error("Tier must be OWNER_MANAGER or STAFF");
    process.exit(1);
  }

  const password = providedPassword || crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: { name, tier, passwordHash, active: true },
    create: { username, name, tier, passwordHash },
  });

  console.log(`User "${user.username}" (${user.tier}) is ready.`);
  if (!providedPassword) {
    console.log(`Temporary password: ${password}`);
    console.log("There's no change-password flow yet — treat this as temporary.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

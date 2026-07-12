import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const saltRounds = 12;

async function ensureUser(input: {
  username: string;
  password: string;
  role: Role;
}) {
  const password = await bcrypt.hash(input.password, saltRounds);

  const user = await prisma.user.upsert({
    where: {
      username: input.username,
    },
    update: {
      password,
      role: input.role,
    },
    create: {
      username: input.username,
      password,
      role: input.role,
    },
  });

  await prisma.world.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
    },
  });
}

async function main() {
  // Compte admin local : toujours garanti (secours si le SSO est en panne).
  await ensureUser({
    username: process.env.DEV_ADMIN_USERNAME ?? 'admin',
    password: process.env.DEV_ADMIN_PASSWORD ?? 'admin12345',
    role: Role.ADMIN,
  });

  // Compte enfant de dev : uniquement si demandé explicitement. En production
  // (SSO Authelia), ne pas définir DEV_CHILD_* — sinon le seed recréerait le
  // compte à chaque démarrage du conteneur, même après sa suppression.
  if (process.env.DEV_CHILD_USERNAME && process.env.DEV_CHILD_PASSWORD) {
    await ensureUser({
      username: process.env.DEV_CHILD_USERNAME,
      password: process.env.DEV_CHILD_PASSWORD,
      role: Role.CHILD,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });


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
  await ensureUser({
    username: process.env.DEV_ADMIN_USERNAME ?? 'admin',
    password: process.env.DEV_ADMIN_PASSWORD ?? 'admin12345',
    role: Role.ADMIN,
  });

  await ensureUser({
    username: process.env.DEV_CHILD_USERNAME ?? 'merlin',
    password: process.env.DEV_CHILD_PASSWORD ?? 'merlin12345',
    role: Role.CHILD,
  });
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


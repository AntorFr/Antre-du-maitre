import { prisma } from '../lib/prisma.js';
import { importDrsBestiary } from '../services/drs-bestiary/importer.js';

const args = new Set(process.argv.slice(2));
const useFixture = args.has('--fixture');
const maxCreaturesArg = process.argv.find((arg) =>
  arg.startsWith('--max-creatures='),
);
const maxPagesArg = process.argv.find((arg) => arg.startsWith('--max-pages='));

const maxCreatures = maxCreaturesArg
  ? Number.parseInt(maxCreaturesArg.split('=')[1] ?? '', 10)
  : undefined;
const maxPages = maxPagesArg
  ? Number.parseInt(maxPagesArg.split('=')[1] ?? '', 10)
  : undefined;

const result = await importDrsBestiary({
  prisma,
  useFixture,
  maxCreatures: Number.isFinite(maxCreatures) ? maxCreatures : undefined,
  maxPages: Number.isFinite(maxPages) ? maxPages : undefined,
});

console.log(`Imported ${result.imported} DRS monster(s).`);

await prisma.$disconnect();


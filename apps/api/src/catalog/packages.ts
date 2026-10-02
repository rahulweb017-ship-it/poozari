import type { Prisma } from '@prisma/client';

type PackageData = Omit<Prisma.PackageCreateManyInput, 'pujaId'>;

/**
 * Swap a puja's live packages for `packages`. A package a booking points at
 * cannot be deleted (Booking_packageId_fkey), so it is archived instead: it
 * drops out of the catalogue while the booking keeps its original package.
 */
export async function replacePujaPackages(
  tx: Prisma.TransactionClient,
  pujaId: string,
  packages: PackageData[],
) {
  await tx.package.updateMany({
    where: { pujaId, archived: false, bookings: { some: {} } },
    data: { archived: true },
  });
  await tx.package.deleteMany({ where: { pujaId, bookings: { none: {} } } });
  await tx.package.createMany({ data: packages.map((p) => ({ ...p, pujaId })) });
}

import type { Assignment, Booking, Payment, Review } from '@poozari/shared';
import { serializePuja } from '../catalog/serializers';

export const bookingInclude = {
  puja: {
    include: {
      packages: true,
      deities: true,
      festivals: true,
      benefits: true,
      temple: { include: { city: true } },
      city: true,
    },
  },
  package: true,
  addons: true,
  assignment: { include: { pandit: true } },
  payment: true,
  review: true,
} as const;

function serializeAssignment(a: any): Assignment {
  return {
    id: a.id,
    bookingId: a.bookingId,
    panditId: a.panditId,
    status: a.status,
    mode: a.mode,
    createdAt: a.createdAt?.toISOString?.() ?? String(a.createdAt),
    pandit: a.pandit
      ? {
          id: a.pandit.id,
          userId: a.pandit.userId,
          displayName: a.pandit.displayName,
          bio: a.pandit.bio,
          phone: a.pandit.phone,
          experienceYears: a.pandit.experienceYears,
          specializations: a.pandit.specializations,
          serviceCityIds: a.pandit.serviceCityIds,
          servicePincodes: a.pandit.servicePincodes,
          isActive: a.pandit.isActive,
          isAvailable: a.pandit.isAvailable,
          rating: a.pandit.rating,
        }
      : undefined,
  };
}

function serializePayment(p: any): Payment {
  return {
    id: p.id,
    bookingId: p.bookingId,
    amountInr: p.amountInr,
    status: p.status,
    razorpayOrderId: p.razorpayOrderId,
    razorpayPaymentId: p.razorpayPaymentId,
    createdAt: p.createdAt?.toISOString?.() ?? String(p.createdAt),
  };
}

function serializeReview(r: any): Review {
  return {
    id: r.id,
    bookingId: r.bookingId,
    customerName: r.customerName,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
  };
}

export function serializeBooking(b: any): Booking {
  return {
    id: b.id,
    reference: b.reference,
    customerId: b.customerId,
    puja: serializePuja(b.puja),
    package: {
      id: b.package.id,
      name: b.package.name,
      description: b.package.description ?? '',
      nameHi: b.package.nameHi ?? '',
      descriptionHi: b.package.descriptionHi ?? '',
      priceInr: b.package.priceInr,
      inclusions: b.package.inclusions ?? [],
    },
    addons: (b.addons ?? []).map((a: any) => ({
      id: a.id,
      addonId: a.addonId ?? null,
      name: a.name,
      nameHi: a.nameHi ?? '',
      priceInr: a.priceInr,
    })),
    status: b.status,
    devoteeName: b.devoteeName,
    gotra: b.gotra ?? '',
    contactPhone: b.contactPhone,
    contactEmail: b.contactEmail,
    preferredDate: b.preferredDate?.toISOString?.() ?? String(b.preferredDate),
    preferredTime: b.preferredTime ?? '',
    addressLine: b.addressLine ?? '',
    city: b.city ?? '',
    pincode: b.pincode,
    notes: b.notes ?? '',
    amountInr: b.amountInr,
    // Older bookings predate the split and were backfilled to the full amount.
    packageAmountInr: b.packageAmountInr || b.amountInr,
    assignment: b.assignment ? serializeAssignment(b.assignment) : null,
    payment: b.payment ? serializePayment(b.payment) : null,
    videoUrl: b.videoUrl,
    thumbnailUrl: b.thumbnailUrl,
    createdAt: b.createdAt?.toISOString?.() ?? String(b.createdAt),
    updatedAt: b.updatedAt?.toISOString?.() ?? String(b.updatedAt),
  };
}

import type { ProductOrder } from '@poozari/shared';
import { serializeProduct } from '../catalog/serializers';

export const productOrderInclude = {
  product: true,
} as const;

export function serializeProductOrder(order: any): ProductOrder {
  return {
    id: order.id,
    reference: order.reference,
    customerId: order.customerId,
    productId: order.productId,
    product: order.product ? serializeProduct(order.product) : undefined,
    status: order.status,
    productName: order.productName,
    productImageUrl: order.productImageUrl ?? null,
    unitPriceInr: order.unitPriceInr,
    quantity: order.quantity,
    totalAmountInr: order.totalAmountInr,
    customerName: order.customerName,
    contactPhone: order.contactPhone,
    contactEmail: order.contactEmail ?? null,
    addressLine: order.addressLine,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

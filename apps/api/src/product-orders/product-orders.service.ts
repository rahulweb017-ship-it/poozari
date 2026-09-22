import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type CreateProductOrderInput,
  makeProductOrderReference,
  PaymentStatus,
  ProductOrderStatus,
} from '@poozari/shared';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import { PrismaService } from '../prisma/prisma.service';
import { productOrderInclude, serializeProductOrder } from './product-order.serializer';

interface PaymentVerificationInput {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

@Injectable()
export class ProductOrdersService {
  private readonly logger = new Logger(ProductOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentGatewayService,
  ) {}

  async create(customerId: string, input: CreateProductOrderInput) {
    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || !product.isActive) throw new NotFoundException('Product not found');
    if (product.stockQuantity < input.quantity) {
      throw new BadRequestException('The requested quantity is not available');
    }

    const order = await this.prisma.productOrder.create({
      data: {
        reference: makeProductOrderReference(),
        customerId,
        productId: product.id,
        productName: product.name,
        productImageUrl: product.imageUrl,
        unitPriceInr: product.priceInr,
        quantity: input.quantity,
        totalAmountInr: product.priceInr * input.quantity,
        customerName: input.customerName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
      },
      include: productOrderInclude,
    });
    return serializeProductOrder(order);
  }

  async listForCustomer(customerId: string) {
    const orders = await this.prisma.productOrder.findMany({
      where: { customerId },
      include: productOrderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(serializeProductOrder);
  }

  async getForCustomer(customerId: string, id: string) {
    const order = await this.findOwned(customerId, id);
    return serializeProductOrder(order);
  }

  async createPaymentOrder(customerId: string, id: string) {
    const order = await this.findOwned(customerId, id);
    if (order.status !== ProductOrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('This product order is already paid');
    }

    const product = await this.prisma.product.findUnique({ where: { id: order.productId } });
    if (!product?.isActive || product.stockQuantity < order.quantity) {
      throw new BadRequestException('This product is no longer available in the requested quantity');
    }

    const gatewayOrder = await this.gateway.createOrder(
      order.totalAmountInr,
      order.reference,
      `order_dev_product_${order.id}`,
    );
    await this.prisma.productOrder.update({
      where: { id },
      data: {
        razorpayOrderId: gatewayOrder.orderId,
        paymentStatus: PaymentStatus.CREATED,
      },
    });
    return gatewayOrder;
  }

  async verifyPayment(customerId: string, id: string, input: PaymentVerificationInput) {
    const order = await this.findOwned(customerId, id);
    if (order.status === ProductOrderStatus.PAID) return serializeProductOrder(order);
    if (order.status !== ProductOrderStatus.PENDING_PAYMENT || !order.razorpayOrderId) {
      throw new BadRequestException('Create a payment order before verifying payment');
    }
    if (
      input.razorpay_order_id &&
      input.razorpay_order_id !== order.razorpayOrderId
    ) {
      throw new BadRequestException('Payment order does not match this product order');
    }
    if (!this.gateway.verifySignature(input)) {
      await this.prisma.productOrder.update({
        where: { id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment signature verification failed');
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.productOrder.updateMany({
        where: { id, status: ProductOrderStatus.PENDING_PAYMENT },
        data: {
          status: ProductOrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
          razorpayPaymentId: input.razorpay_payment_id ?? `pay_dev_product_${order.id}`,
          razorpaySignature: input.razorpay_signature ?? 'dev',
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('This product order has already been processed');
      }

      const stock = await tx.product.updateMany({
        where: {
          id: order.productId,
          isActive: true,
          stockQuantity: { gte: order.quantity },
        },
        data: { stockQuantity: { decrement: order.quantity } },
      });
      if (stock.count !== 1) {
        throw new BadRequestException('The requested quantity is no longer available');
      }
    });

    const paidOrder = await this.prisma.productOrder.findUnique({
      where: { id },
      include: productOrderInclude,
    });
    return serializeProductOrder(paidOrder);
  }

  /**
   * Settle whatever product order owns this Razorpay order id. Called by the
   * webhook, which knows the order id but not ours.
   *
   * The stock decrement mirrors verifyPayment, but a webhook cannot report a
   * sold-out race back to a customer, so running out of stock is logged as an
   * oversell to reconcile by hand rather than thrown — the money has already
   * been taken and refusing here would leave a paid order unrecorded.
   */
  async settleByOrderId(razorpayOrderId: string, paymentId: string): Promise<boolean> {
    const order = await this.prisma.productOrder.findFirst({ where: { razorpayOrderId } });
    if (!order) return false;
    if (order.status === ProductOrderStatus.PAID) return true;

    const claimed = await this.prisma.productOrder.updateMany({
      where: { id: order.id, status: ProductOrderStatus.PENDING_PAYMENT },
      data: {
        status: ProductOrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        razorpayPaymentId: paymentId,
        razorpaySignature: 'webhook',
      },
    });
    if (claimed.count === 1) {
      const stock = await this.prisma.product.updateMany({
        where: { id: order.productId, stockQuantity: { gte: order.quantity } },
        data: { stockQuantity: { decrement: order.quantity } },
      });
      if (stock.count !== 1) {
        this.logger.error(
          `Oversold product ${order.productId}: order ${order.reference} was paid ` +
            `(${paymentId}) but stock was insufficient. Reconcile by hand.`,
        );
      }
    }
    return true;
  }

  /** Record a webhook-reported failure, without touching an already paid order. */
  async failByOrderId(razorpayOrderId: string): Promise<boolean> {
    const order = await this.prisma.productOrder.findFirst({ where: { razorpayOrderId } });
    if (!order) return false;
    await this.prisma.productOrder.updateMany({
      where: { id: order.id, status: ProductOrderStatus.PENDING_PAYMENT },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
    return true;
  }

  private async findOwned(customerId: string, id: string) {
    const order = await this.prisma.productOrder.findUnique({
      where: { id },
      include: productOrderInclude,
    });
    if (!order) throw new NotFoundException('Product order not found');
    if (order.customerId !== customerId) throw new ForbiddenException();
    return order;
  }
}

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import crypto from 'crypto';
// Removed top-level adminDb import to prevent build-time initialization
// Removed top-level adminDb import to prevent build-time initialization

export async function POST(req: Request) {
  // Dynamically import adminDb only when the webhook is actually called
  const { adminDb } = await import('@/lib/firebaseAdmin');
  const { Timestamp, FieldValue } = await import('firebase-admin/firestore');

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers.get('x-paystack-signature');

  if (!secret || !signature) {
    return new Response('Missing secret or signature', { status: 400 });
  }

  const body = await req.text();
  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

  if (hash !== signature) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === 'charge.success') {
    const { metadata, amount, reference } = event.data;
    const { userId, type, ...otherMetadata } = metadata || {};

    if (!userId || !type) {
      console.error('Missing userId or type in metadata', metadata);
      return NextResponse.json({ status: 'ignored', message: 'Missing metadata' });
    }

    // ── IDEMPOTENCY CHECK ──────────────────────────────────────────────────
    // Paystack can retry webhooks. Don't process the same reference twice.
    const existingTxn = await adminDb
      .collection('transactions')
      .where('reference', '==', reference)
      .limit(1)
      .get();

    if (!existingTxn.empty) {
      return NextResponse.json({ status: 'ignored', message: 'Already processed' });
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
      const userRef = adminDb.collection('users').doc(userId);

      if (type === 'ticket') {
        const ticketType = otherMetadata.ticketType || 'daily';
        const price = amount / 100;
        
        // AMOUNT VALIDATION FOR TICKETS
        const pricingSnap = await adminDb.collection('adminfinance').doc('pricing').get();
        if (pricingSnap.exists) {
          const pricingData = pricingSnap.data();
          const expectedPrice = Number(pricingData?.tickets?.[ticketType]?.price);
          if (expectedPrice && price < expectedPrice) {
            console.error(`Spoofing detected: Ticket ${ticketType} requires ₦${expectedPrice}, but paid ₦${price}`);
            return NextResponse.json({ status: 'error', message: 'Invalid payment amount for ticket' }, { status: 400 });
          }
        }
        
        await userRef.update({
          tickets: FieldValue.arrayUnion({
            type: ticketType,
            amount: price,
            reference,
            timestamp: Timestamp.now(),
            status: 'paid'
          })
        });
      } else if (type === 'vip') {
        const vipLevel = Number(otherMetadata.vipLevel) || 1;
        const price = amount / 100;

        // AMOUNT VALIDATION FOR VIP
        const VIP_PRICES: Record<number, number> = { 1: 5000, 2: 7500, 3: 11000, 4: 15000, 5: 20000 };
        const expectedPrice = VIP_PRICES[vipLevel];
        
        if (!expectedPrice || price < expectedPrice) {
          console.error(`Spoofing detected: VIP level ${vipLevel} requires ₦${expectedPrice}, but paid ₦${price}`);
          return NextResponse.json({ status: 'error', message: 'Invalid payment amount for VIP' }, { status: 400 });
        }

        await userRef.update({
          vipLevel: vipLevel,
          vipHistory: FieldValue.arrayUnion({
            level: vipLevel,
            price: price,
            reference,
            timestamp: Timestamp.now()
          })
        });
      } else if (type === 'hub') {
        const hubId = otherMetadata.hubId;
        if (hubId) {
          const hubRef = adminDb.collection('transportCompanies').doc(hubId);
          await hubRef.update({
            paymentStatus: 'paid',
            paymentReference: reference,
            paymentAmount: amount / 100,
            updatedAt: Timestamp.now()
          });
        }
      }

      await adminDb.collection('transactions').add({
        userId,
        type,
        amount: amount / 100,
        reference,
        status: 'success',
        metadata,
        createdAt: Timestamp.now()
      });

      return NextResponse.json({ status: 'success' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return NextResponse.json({ status: 'error', message: 'Database update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ status: 'ignored' });
}

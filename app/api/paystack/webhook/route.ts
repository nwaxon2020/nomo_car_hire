import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
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

    try {
      const userRef = adminDb.collection('users').doc(userId);

      if (type === 'ticket') {
        const ticketType = otherMetadata.ticketType || 'daily';
        const price = amount / 100;
        
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

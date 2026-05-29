import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import { Timestamp } from 'firebase-admin/firestore'

// VIP Configuration (server-side only)
const VIP_CONFIG = {
  levels: [
    { level: 1, name: "Green VIP",  price: 5000  },
    { level: 2, name: "Yellow VIP", price: 7500  },
    { level: 3, name: "Purple VIP", price: 11000 },
    { level: 4, name: "Gold VIP",   price: 15000 },
    { level: 5, name: "Black VIP",  price: 20000 },
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, level, paymentReference } = body

    if (!userId || !level || !paymentReference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const vipLevel = VIP_CONFIG.levels.find(l => l.level === level)
    if (!vipLevel) {
      return NextResponse.json({ error: 'Invalid VIP level' }, { status: 400 })
    }

    // ─────────────────────────────────────────────────────────
    // REAL PAYSTACK VERIFICATION (server-side, key is secret)
    // ─────────────────────────────────────────────────────────
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 402 })
    }

    const verifyData = await verifyRes.json()

    // Validate payment status
    if (verifyData.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 402 })
    }

    // Validate amount matches the VIP level price (amount is in kobo = price × 100)
    const paidAmountNaira = verifyData.data.amount / 100
    if (paidAmountNaira < vipLevel.price) {
      return NextResponse.json({
        error: `Insufficient payment. Expected ₦${vipLevel.price}, received ₦${paidAmountNaira}`
      }, { status: 402 })
    }

    // Validate the userId in Paystack metadata matches the requester
    const metaUserId = verifyData.data?.metadata?.userId
    if (metaUserId && metaUserId !== userId) {
      return NextResponse.json({ error: 'Payment userId mismatch' }, { status: 403 })
    }

    // ─────────────────────────────────────────────────────────
    // IDEMPOTENCY CHECK — prevent double-processing same ref
    // ─────────────────────────────────────────────────────────
    const existingTxn = await adminDb
      .collection('transactions')
      .where('reference', '==', paymentReference)
      .limit(1)
      .get()

    if (!existingTxn.empty) {
      return NextResponse.json({ error: 'Payment reference already processed' }, { status: 409 })
    }

    // ─────────────────────────────────────────────────────────
    // WRITE — using Admin SDK (bypasses client rules securely)
    // ─────────────────────────────────────────────────────────
    const userRef = adminDb.collection('users').doc(userId)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userSnap.data()!
    const now = new Date()
    const expiryDate = new Date(now)
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    let newExpiryDate = expiryDate
    let newPurchaseDate = now

    // Extend from current expiry if still active
    if (userData.vipExpiryDate && userData.vipExpiryDate.toDate() > now) {
      const currentExpiry = userData.vipExpiryDate.toDate()
      currentExpiry.setFullYear(currentExpiry.getFullYear() + 1)
      newExpiryDate = currentExpiry
      newPurchaseDate = userData.vipPurchaseDate?.toDate() || now
    }

    await userRef.update({
      purchasedVipLevel: level,
      vipLevel: Math.max(level, userData.vipLevel || 0),
      vipPurchaseDate: Timestamp.fromDate(newPurchaseDate),
      vipExpiryDate: Timestamp.fromDate(newExpiryDate),
      updatedAt: Timestamp.now()
    })

    // Log the transaction
    await adminDb.collection('transactions').add({
      userId,
      type: 'vip',
      amount: paidAmountNaira,
      reference: paymentReference,
      status: 'success',
      vipLevel: level,
      createdAt: Timestamp.now()
    })

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${vipLevel.name}`,
      data: {
        level,
        name: vipLevel.name,
        expiryDate: newExpiryDate.toISOString(),
        purchaseDate: newPurchaseDate.toISOString()
      }
    })

  } catch (error) {
    console.error('Error processing VIP purchase:', error)
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 })
  }
}
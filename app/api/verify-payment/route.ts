import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'

// VIP Configuration
const VIP_CONFIG = {
  levels: [
    { level: 1, name: "Green VIP", color: "green", stars: 1, referralsRequired: 15, price: 5000 },
    { level: 2, name: "Yellow VIP", color: "yellow", stars: 2, referralsRequired: 20, price: 7500 },
    { level: 3, name: "Purple VIP", color: "purple", stars: 3, referralsRequired: 25, price: 11000 },
    { level: 4, name: "Gold VIP", color: "gold", stars: 4, referralsRequired: 30, price: 15000 },
    { level: 5, name: "Black VIP", color: "black", stars: 5, referralsRequired: 35, price: 20000 },
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, level, paymentReference } = body

    if (!userId || !level || !paymentReference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const vipLevel = VIP_CONFIG.levels.find(l => l.level === level)
    if (!vipLevel) {
      return NextResponse.json(
        { error: 'Invalid VIP level' },
        { status: 400 }
      )
    }

    // In production, verify payment with your payment gateway here
    // For now, we'll assume payment is successful

    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userSnap.data()
    const now = new Date()
    const expiryDate = new Date(now)
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    let newExpiryDate = expiryDate
    let newPurchaseDate = now

    // If user already has VIP and it's not expired, extend from current expiry
    if (userData.vipExpiryDate && userData.vipExpiryDate.toDate() > now) {
      const currentExpiry = userData.vipExpiryDate.toDate()
      currentExpiry.setFullYear(currentExpiry.getFullYear() + 1)
      newExpiryDate = currentExpiry
      newPurchaseDate = userData.vipPurchaseDate?.toDate() || now
    }

    // Update user's VIP status
    await updateDoc(userRef, {
      purchasedVipLevel: level,
      vipLevel: Math.max(level, userData.vipLevel || 0), // Keep higher level if referral-based is higher
      vipPurchaseDate: Timestamp.fromDate(newPurchaseDate),
      vipExpiryDate: Timestamp.fromDate(newExpiryDate),
      updatedAt: Timestamp.now()
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
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    )
  }
}
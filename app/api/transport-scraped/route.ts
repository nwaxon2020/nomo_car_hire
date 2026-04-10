import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'transport_listings.json');
        
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ listings: [], last_updated: null });
        }

        const jsonData = fs.readFileSync(filePath, 'utf-8');
        return NextResponse.json(JSON.parse(jsonData));
    } catch (error) {
        console.error("API Error reading listings:", error);
        return NextResponse.json({ listings: [], error: "Failed to load listings" }, { status: 500 });
    }
}

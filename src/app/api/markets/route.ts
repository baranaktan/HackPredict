import { NextRequest, NextResponse } from 'next/server';

// NO MOCK DATA - Only real data from backend API

export async function GET(request: NextRequest) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3334/api';
    
    // Fetch data from backend API
    const response = await fetch(`${API_BASE_URL}/markets/metadata`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Return market data from backend
    return NextResponse.json({ data: data.markets || [] });
  } catch (error) {
    console.error('Error fetching markets:', error);
    // Return empty array instead of mock data
    return NextResponse.json({ 
      data: [], 
      error: 'Backend API unavailable. Please ensure the server is running.' 
    }, { status: 503 });
  }
} 
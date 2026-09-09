import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const { cycleStartDate } = await request.json();
    
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { cycleStartDate: new Date(cycleStartDate) },
      create: { id: 1, cycleStartDate: new Date(cycleStartDate) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error updating cycle start date' }, { status: 500 });
  }
}

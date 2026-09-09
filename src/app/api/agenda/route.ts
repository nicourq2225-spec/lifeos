import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const events = await prisma.agendaEvent.findMany({
      orderBy: [
        { dayNumber: 'asc' },
        { startTime: 'asc' }
      ]
    });
    
    const settings = await prisma.settings.findFirst();

    return NextResponse.json({ events, cycleStartDate: settings?.cycleStartDate });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching agenda' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { dayNumber, startTime, endTime, title, type } = await request.json();
    const event = await prisma.agendaEvent.create({
      data: {
        dayNumber: parseInt(dayNumber),
        startTime,
        endTime,
        title,
        type
      }
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating event' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

    await prisma.agendaEvent.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting event' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, dayNumber, startTime, endTime, title, type } = await request.json();
    
    const event = await prisma.agendaEvent.update({
      where: { id: parseInt(id) },
      data: { dayNumber: parseInt(dayNumber), startTime, endTime, title, type }
    });
    
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating event' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { name, groupId } = await request.json();
    const habit = await prisma.habit.create({
      data: { name, groupId: parseInt(groupId) }
    });
    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating habit' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, groupId } = await request.json();
    const habit = await prisma.habit.update({
      where: { id: parseInt(id) },
      data: { name, groupId: parseInt(groupId) }
    });
    return NextResponse.json(habit);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating habit' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

    // First delete associated logs to avoid foreign key constraints
    await prisma.habitLog.deleteMany({
      where: { habitId: parseInt(id) }
    });

    await prisma.habit.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting habit' }, { status: 500 });
  }
}

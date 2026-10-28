import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArgentinaDateStr } from "@/lib/agendaDefaults";

export async function GET() {
  try {
    const learnings = await prisma.journalLearning.findMany({
      orderBy: [{ pinned: "desc" }, { dateStr: "desc" }, { id: "desc" }],
    });
    return NextResponse.json(learnings);
  } catch (error) {
    console.error("Error fetching journal learnings:", error);
    return NextResponse.json(
      { error: "Error fetching learnings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { content, dateStr, pinned } = await request.json();
    const trimmed = typeof content === "string" ? content.trim() : "";

    if (!trimmed) {
      return NextResponse.json(
        { error: "El contenido del conocimiento es obligatorio" },
        { status: 400 }
      );
    }

    const validDateStr =
      typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? dateStr
        : getArgentinaDateStr();

    const created = await prisma.journalLearning.create({
      data: {
        content: trimmed,
        dateStr: validDateStr,
        pinned: Boolean(pinned),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating journal learning:", error);
    return NextResponse.json(
      { error: "Error creating learning" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, content, pinned, dateStr } = await request.json();
    const parsedId = parseInt(String(id), 10);

    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const dataToUpdate: {
      content?: string;
      pinned?: boolean;
      dateStr?: string;
    } = {};

    if (typeof content === "string" && content.trim() !== "") {
      dataToUpdate.content = content.trim();
    }
    if (pinned !== undefined) {
      dataToUpdate.pinned = Boolean(pinned);
    }
    if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dataToUpdate.dateStr = dateStr;
    }

    const updated = await prisma.journalLearning.update({
      where: { id: parsedId },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating journal learning:", error);
    return NextResponse.json(
      { error: "Error updating learning" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    }

    await prisma.journalLearning.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting journal learning:", error);
    return NextResponse.json(
      { error: "Error deleting learning" },
      { status: 500 }
    );
  }
}

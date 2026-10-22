import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ensureStudyPlanSeeded,
  INITIAL_STUDY_COURSE,
  StudyLessonItem,
} from "@/lib/studyPlanData";

function parseLessons(raw: string | null | undefined): StudyLessonItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return [];
  }
  return [];
}

const DAY_NAMES_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export async function GET() {
  try {
    await ensureStudyPlanSeeded(false);

    const [course, tasks] = await Promise.all([
      prisma.studyCourse.findFirst({ where: { id: 1 } }),
      prisma.studyTask.findMany({
        orderBy: [{ date: "asc" }, { sessionNumber: "asc" }, { id: "asc" }],
      }),
    ]);

    return NextResponse.json({
      course: course || {
        id: 1,
        title: INITIAL_STUDY_COURSE.title,
        platform: INITIAL_STUDY_COURSE.platform,
        totalLessons: INITIAL_STUDY_COURSE.total_lessons,
        totalDurationMin: INITIAL_STUDY_COURSE.total_duration_min,
        totalSessions: INITIAL_STUDY_COURSE.total_sessions,
        daysOfWeek: INITIAL_STUDY_COURSE.schedule_config.days_of_week.join(","),
        targetDurationMin: INITIAL_STUDY_COURSE.schedule_config.target_duration_min,
        startDate: INITIAL_STUDY_COURSE.schedule_config.start_date,
        endDate: INITIAL_STUDY_COURSE.schedule_config.end_date,
      },
      tasks,
    });
  } catch (error) {
    console.error("Error fetching study data:", error);
    return NextResponse.json(
      { error: "Error fetching study tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "RELOAD_PLAN") {
      await ensureStudyPlanSeeded(true);
      const tasks = await prisma.studyTask.findMany({
        orderBy: [{ date: "asc" }, { sessionNumber: "asc" }],
      });
      return NextResponse.json({ success: true, tasks });
    }

    const {
      date,
      dateStr,
      subject,
      sessionNumber,
      dayOfWeek,
      totalMin,
      lessons,
    } = body;

    const cleanDateStr =
      dateStr ||
      (typeof date === "string" && date.includes("T")
        ? date.split("T")[0]
        : String(date));
    const [y, m, d] = cleanDateStr.split("-").map(Number);
    const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const computedDayOfWeek =
      dayOfWeek || DAY_NAMES_ES[new Date(y, m - 1, d).getDay()];

    const parsedLessons: StudyLessonItem[] = Array.isArray(lessons)
      ? lessons
      : parseLessons(lessons);

    const computedMin =
      totalMin !== undefined
        ? parseInt(String(totalMin), 10) || 0
        : parsedLessons.reduce((acc, l) => acc + (Number(l.min) || 0), 0) || 90;

    const task = await prisma.studyTask.create({
      data: {
        sessionNumber: sessionNumber ? parseInt(String(sessionNumber), 10) : null,
        date: utcNoon,
        dateStr: cleanDateStr,
        dayOfWeek: computedDayOfWeek,
        subject,
        totalMin: computedMin,
        lessonsCount: parsedLessons.length,
        lessons: JSON.stringify(parsedLessons),
        completed: false,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating study task:", error);
    return NextResponse.json(
      { error: "Error creating study task" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      completed,
      date,
      dateStr,
      subject,
      sessionNumber,
      dayOfWeek,
      totalMin,
      lessons,
      toggleLessonId,
    } = body;

    const existing = await prisma.studyTask.findUnique({
      where: { id: parseInt(String(id), 10) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Si se marca/desmarca una clase individual dentro de la jornada
    if (toggleLessonId !== undefined) {
      const currentLessons = parseLessons(existing.lessons);
      const updatedLessons = currentLessons.map((l) =>
        l.id === Number(toggleLessonId)
          ? { ...l, completed: !l.completed }
          : l
      );
      const allDone =
        updatedLessons.length > 0 && updatedLessons.every((l) => Boolean(l.completed));

      updateData.lessons = JSON.stringify(updatedLessons);
      updateData.completed = allDone;
    } else {
      if (completed !== undefined) {
        updateData.completed = Boolean(completed);
        const currentLessons = parseLessons(existing.lessons);
        if (currentLessons.length > 0 && lessons === undefined) {
          updateData.lessons = JSON.stringify(
            currentLessons.map((l) => ({ ...l, completed: Boolean(completed) }))
          );
        }
      }

      if (date || dateStr) {
        const cleanDateStr =
          dateStr ||
          (typeof date === "string" && date.includes("T")
            ? date.split("T")[0]
            : String(date));
        const [y, m, d] = cleanDateStr.split("-").map(Number);
        updateData.date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        updateData.dateStr = cleanDateStr;
        if (!dayOfWeek) {
          updateData.dayOfWeek = DAY_NAMES_ES[new Date(y, m - 1, d).getDay()];
        }
      }

      if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
      if (subject !== undefined) updateData.subject = subject;
      if (sessionNumber !== undefined) {
        updateData.sessionNumber = sessionNumber
          ? parseInt(String(sessionNumber), 10)
          : null;
      }
      if (totalMin !== undefined) {
        updateData.totalMin = parseInt(String(totalMin), 10) || 0;
      }
      if (lessons !== undefined) {
        const parsedLessons = Array.isArray(lessons)
          ? lessons
          : parseLessons(lessons);
        updateData.lessons = JSON.stringify(parsedLessons);
        updateData.lessonsCount = parsedLessons.length;
      }
    }

    const task = await prisma.studyTask.update({
      where: { id: parseInt(String(id), 10) },
      data: updateData,
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating study task:", error);
    return NextResponse.json(
      { error: "Error updating study task" },
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

    await prisma.studyTask.delete({
      where: { id: parseInt(id, 10) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error deleting study task" },
      { status: 500 }
    );
  }
}

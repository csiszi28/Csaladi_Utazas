import { unstable_cache } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from "@csaladi-utazas/shared";
import { requireAuthUserId } from "@/lib/auth";
import { tripAccessFilter } from "@/lib/trip-access";
import { USER_DATA_TAG } from "@/lib/revalidate-user-data";

export type CommandPaletteSearchItem = {
  id: string;
  label: string;
  hint: string;
  href: string;
  group: "Programok" | "Dokumentumok" | "Család";
  keywords: string;
};

function userDataTag(userId: string) {
  return `${USER_DATA_TAG}-${userId}`;
}

const getCachedCommandPaletteIndex = (userId: string) =>
  unstable_cache(
    async (): Promise<CommandPaletteSearchItem[]> => {
      const tripFilter = tripAccessFilter(userId);
      const [programs, documents, members] = await Promise.all([
        prisma.program.findMany({
          where: { trip: tripFilter },
          select: {
            id: true,
            title: true,
            location: true,
            date: true,
            trip: { select: { id: true, title: true } },
          },
          orderBy: { date: "desc" },
          take: 40,
        }),
        prisma.document.findMany({
          where: {
            trip: tripFilter,
            category: { not: "PHOTO" },
          },
          select: {
            id: true,
            fileName: true,
            category: true,
            trip: { select: { id: true, title: true } },
          },
          orderBy: { uploadedAt: "desc" },
          take: 40,
        }),
        prisma.familyMember.findMany({
          where: { userId },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
          take: 30,
        }),
      ]);

      const items: CommandPaletteSearchItem[] = [];

      for (const program of programs) {
        items.push({
          id: `program-${program.id}`,
          label: program.title,
          hint: `${program.trip.title}${program.location ? ` · ${program.location}` : ""}`,
          href: `/trips/${program.trip.id}?tab=planning`,
          group: "Programok",
          keywords: `${program.title} ${program.location ?? ""} ${program.trip.title}`,
        });
      }

      for (const doc of documents) {
        const categoryLabel =
          DOCUMENT_CATEGORY_LABELS[doc.category as DocumentCategory] ?? doc.category;
        items.push({
          id: `doc-${doc.id}`,
          label: doc.fileName,
          hint: `${categoryLabel} · ${doc.trip.title}`,
          href: `/trips/${doc.trip.id}?tab=documents`,
          group: "Dokumentumok",
          keywords: `${doc.fileName} ${categoryLabel} ${doc.category} ${doc.trip.title}`,
        });
      }

      for (const member of members) {
        items.push({
          id: `member-${member.id}`,
          label: member.name,
          hint: member.email ?? "Családtag",
          href: "/family",
          group: "Család",
          keywords: `${member.name} ${member.email ?? ""}`,
        });
      }

      return items;
    },
    [`command-palette-${userId}`],
    { revalidate: 45, tags: [userDataTag(userId)] }
  )();

export async function fetchCommandPaletteIndex(): Promise<CommandPaletteSearchItem[]> {
  const userId = await requireAuthUserId();
  return getCachedCommandPaletteIndex(userId);
}

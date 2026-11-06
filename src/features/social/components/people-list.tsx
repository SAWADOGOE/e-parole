import Link from "next/link";
import { profilePath } from "../lib/paths";
import type { PersonSummary } from "../types";
import { Avatar } from "./avatar";
import { FollowButton } from "./follow-button";

/** Liste de membres (recherche, abonnés) : sémantique de liste simple, jamais un listbox. */
export function PeopleList({ people, viewerId, dataSaver }: { people: readonly PersonSummary[]; viewerId: string; dataSaver: boolean }) {
  return (
    <ul className="divide-y border-y">
      {people.map((person) => (
        <li key={person.userId} className="flex items-center gap-3 py-3">
          <Avatar name={person.displayName} image={person.avatar} dataSaver={dataSaver} />
          <div className="min-w-0 flex-1">
            <Link href={profilePath(person.handle)} className="font-semibold break-words text-fg underline-offset-4 hover:underline">
              {person.displayName}
            </Link>
            <p className="truncate text-sm text-muted">@{person.handle}</p>
            {person.bio ? <p className="mt-1 line-clamp-2 text-sm text-fg">{person.bio}</p> : null}
          </div>
          {person.userId === viewerId ? null : <FollowButton userId={person.userId} name={person.displayName} following={person.following} />}
        </li>
      ))}
    </ul>
  );
}

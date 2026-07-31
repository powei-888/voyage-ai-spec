import type { TripMember } from "@voyage/shared";

export function MemberChecks({
  members,
  selectedIds = [],
  defaultAll = false,
  name = "participantMemberIds",
  legend = "Participants"
}: {
  members: TripMember[];
  selectedIds?: string[];
  defaultAll?: boolean;
  name?: string;
  legend?: string;
}) {
  return (
    <fieldset className="check-group field-span-2">
      <legend>{legend}</legend>
      {members.map((member) => (
        <label key={member.id}>
          <input
            type="checkbox"
            name={name}
            value={member.id}
            defaultChecked={defaultAll || selectedIds.includes(member.id)}
          />
          <span>{member.displayName}</span>
        </label>
      ))}
    </fieldset>
  );
}

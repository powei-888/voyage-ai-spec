import type { Trip, TripMember } from "@voyage/shared";
import { Crown, Mail, Pencil, Plus, Trash2, UserRound, Users } from "lucide-react";
import { addMemberAction, removeMemberAction, updateMemberAction } from "../../../actions/member-actions";
import { EmptyState } from "../../../../components/empty-state";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { apiGet } from "../../../../lib/api";
import { formatDate, titleCase } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function MembersPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [trip, members] = await Promise.all([
    apiGet<Trip>(`/trips/${tripId}`),
    apiGet<TripMember[]>(`/trips/${tripId}/members`)
  ]);

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Access"
        title="Members"
        description="People, roles, and trip participation."
        actions={<a className="button button-primary" href="#add-member"><Plus size={17} /> Add member</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">Travel group</p><h2>Trip members</h2></div>
          <span>{members.length}</span>
        </div>
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No members" body="Add the first person below." />
        ) : (
          <div className="member-list">
            {members.map((member) => {
              const isCreator = member.userId === trip.ownerUserId;
              return (
                <article className="member-row" key={member.id}>
                  <span className="member-avatar member-avatar-large">{member.displayName.slice(0, 2).toUpperCase()}</span>
                  <div className="member-main">
                    <div className="member-heading">
                      <div><h3>{member.displayName}</h3><p>{member.user?.email || "Guest traveler"}</p></div>
                      <span className={`role-badge role-${member.role}`}>
                        {member.role === "owner" ? <Crown size={13} /> : <UserRound size={13} />}
                        {titleCase(member.role)}
                      </span>
                    </div>
                    <div className="inline-meta">
                      <span>{member.joinedAt ? `Joined ${formatDate(member.joinedAt)}` : "Invitation pending"}</span>
                      {isCreator ? <span>Trip creator</span> : null}
                    </div>
                    <details className="edit-drawer">
                      <summary><Pencil size={14} /> Edit member</summary>
                      <form action={updateMemberAction.bind(null, tripId, member.id)} className="form-grid compact-form">
                        <label className="field"><span>Display name</span><input name="displayName" defaultValue={member.displayName} required /></label>
                        <label className="field">
                          <span>Role</span>
                          <select name="role" defaultValue={member.role} disabled={isCreator}>
                            <option value="member">Member</option><option value="owner">Owner</option>
                          </select>
                          {isCreator ? <input type="hidden" name="role" value="owner" /> : null}
                        </label>
                        <div className="form-actions field-span-2"><button className="button button-secondary" type="submit">Save member</button></div>
                      </form>
                    </details>
                  </div>
                  {!isCreator ? (
                    <form action={removeMemberAction.bind(null, tripId, member.id)}>
                      <button className="icon-button danger" type="submit" title="Remove member"><Trash2 size={16} /></button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="form-panel" id="add-member">
        <div className="section-heading"><div><p className="eyebrow">New traveler</p><h2>Add member</h2></div></div>
        <form action={addMemberAction.bind(null, tripId)} className="form-grid">
          <label className="field"><span>Display name</span><input name="displayName" placeholder="Amy Chen" required maxLength={80} /></label>
          <label className="field">
            <span>Email</span>
            <div className="input-affix"><Mail size={16} /><input name="email" type="email" placeholder="amy@example.com" maxLength={160} /></div>
          </label>
          <div className="form-actions field-span-2"><button className="button button-primary" type="submit"><Plus size={16} /> Add member</button></div>
        </form>
      </section>
    </div>
  );
}

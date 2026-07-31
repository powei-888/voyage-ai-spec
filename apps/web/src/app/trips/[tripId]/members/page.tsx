import type { Trip, TripMember } from "@voyage/shared";
import {
  Crown,
  Mail,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  UserRound,
  Users
} from "lucide-react";
import { addMemberAction, removeMemberAction, updateMemberAction } from "../../../actions/member-actions";
import { ConfirmForm } from "../../../../components/confirm-form";
import { EmptyState } from "../../../../components/empty-state";
import { PendingButton } from "../../../../components/pending-button";
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
  const travelerCount = members.filter((member) => member.kind === "traveler").length;
  const externalCount = members.length - travelerCount;

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="存取權限"
        title="成員與代購對象"
        description="管理旅伴權限與外部帳務對象。"
        actions={<a className="button button-primary" href="#add-member"><Plus size={17} /> 新增對象</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">旅程帳本</p><h2>帳務對象</h2></div>
          <span>{travelerCount} 位旅伴 · {externalCount} 位外部對象</span>
        </div>
        {members.length === 0 ? (
          <EmptyState icon={Users} title="尚無成員" body="從下方新增第一位同行成員。" />
        ) : (
          <div className="member-list">
            {members.map((member) => {
              const isCreator = member.userId === trip.ownerUserId;
              const isExternal = member.kind === "external";
              return (
                <article className="member-row" key={member.id}>
                  <span className="member-avatar member-avatar-large">{member.displayName.slice(0, 2).toUpperCase()}</span>
                  <div className="member-main">
                    <div className="member-heading">
                      <div>
                        <h3>{member.displayName}</h3>
                        <p>{isExternal ? "外部代購對象" : member.user?.email || "訪客旅人"}</p>
                      </div>
                      <span className={`role-badge role-${isExternal ? "external" : member.role}`}>
                        {isExternal ? <ShoppingBag size={13} /> : member.role === "owner" ? <Crown size={13} /> : <UserRound size={13} />}
                        {isExternal ? "代購對象" : titleCase(member.role)}
                      </span>
                    </div>
                    <div className="inline-meta">
                      <span>{isExternal ? "僅用於支出分攤與還款" : member.joinedAt ? `加入於 ${formatDate(member.joinedAt)}` : "邀請待接受"}</span>
                      {isCreator ? <span>旅程建立者</span> : null}
                    </div>
                    <details className="edit-drawer">
                      <summary><Pencil size={14} /> 編輯對象</summary>
                      <form action={updateMemberAction.bind(null, tripId, member.id)} className="form-grid compact-form">
                        <label className="field"><span>顯示名稱</span><input name="displayName" defaultValue={member.displayName} required /></label>
                        <label className="field">
                          <span>角色</span>
                          <select name="role" defaultValue={member.role} disabled={isCreator || isExternal}>
                            <option value="member">成員</option><option value="owner">擁有者</option>
                          </select>
                          {isCreator || isExternal ? <input type="hidden" name="role" value={isCreator ? "owner" : "member"} /> : null}
                        </label>
                        <div className="form-actions field-span-2"><PendingButton className="button button-secondary" type="submit" pendingLabel="儲存中…">儲存對象</PendingButton></div>
                      </form>
                    </details>
                  </div>
                  {!isCreator ? (
                    <ConfirmForm action={removeMemberAction.bind(null, tripId, member.id)} message="要移除這個帳務對象嗎？">
                      <button className="icon-button danger" type="submit" title="移除對象"><Trash2 size={16} /></button>
                    </ConfirmForm>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="form-panel" id="add-member">
        <div className="section-heading"><div><p className="eyebrow">新增帳務身分</p><h2>新增對象</h2></div></div>
        <form action={addMemberAction.bind(null, tripId)} className="form-grid">
          <label className="field"><span>顯示名稱</span><input name="displayName" placeholder="王小美" required maxLength={80} /></label>
          <label className="field">
            <span>對象類型</span>
            <select name="kind" defaultValue="traveler">
              <option value="traveler">旅伴</option>
              <option value="external">外部代購對象</option>
            </select>
          </label>
          <label className="field">
            <span>旅伴電子郵件（選填）</span>
            <div className="input-affix"><Mail size={16} /><input name="email" type="email" placeholder="amy@example.com" maxLength={160} /></div>
          </label>
          <div className="form-actions field-span-2"><PendingButton className="button button-primary" type="submit" pendingLabel="新增中…"><Plus size={16} /> 新增對象</PendingButton></div>
        </form>
      </section>
    </div>
  );
}

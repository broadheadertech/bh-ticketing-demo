"use client";

import "./backoffice.css";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sidebar, Topbar, ROLE_META, DEFAULT_PAGE, PAGE_TITLE, type BoRole } from "./_components/shell";
import { Icon } from "./_components/widgets";
import { AdminPages } from "./_components/admin";
import { OrgPages } from "./_components/organizer";
import { ArtistPages } from "./_components/artist";
import { UserPages } from "./_components/customer";
import { VenueEditor } from "./_components/venue-editor";

const BO_ROLES: BoRole[] = ["admin", "organization", "artist", "attendee"];

type Me = { name: string; email: string; roles: string[]; activeRole: string };

function BackOfficeApp({
  me,
  onSwitchRole,
}: {
  me: Me;
  onSwitchRole: (role: string) => void;
}) {
  const roles = useMemo<BoRole[]>(() => {
    const r = me.roles.filter((x): x is BoRole => (BO_ROLES as string[]).includes(x));
    return r.length ? r : ["attendee"];
  }, [me.roles]);

  const initialRole: BoRole = (BO_ROLES as string[]).includes(me.activeRole)
    ? (me.activeRole as BoRole)
    : roles[0];

  const [role, setRole] = useState<BoRole>(initialRole);
  const [page, setPage] = useState<string>(DEFAULT_PAGE[initialRole]);

  const onSwitch = (r: BoRole) => {
    setRole(r);
    setPage(DEFAULT_PAGE[r]);
    if (roles.includes(r)) onSwitchRole(r); // persist via switchRole()
    const c = document.querySelector(".bo .content");
    if (c) c.scrollTop = 0;
  };
  const go = (p: string) => {
    setPage(p);
    const c = document.querySelector(".bo .content");
    if (c) c.scrollTop = 0;
  };

  const user = { name: me.name || "Account", email: me.email || "" };
  const title = PAGE_TITLE[role]?.[page] || "TIX.PH";
  const crumb = `${ROLE_META[role].be} · ${page}`;

  let body: React.ReactNode;
  let actions: React.ReactNode = null;
  if (role === "admin") {
    body = page === "templates" ? <VenueEditor mode="template" /> : <AdminPages page={page} go={go} />;
  } else if (role === "organization") {
    body = <OrgPages page={page} go={go} />;
    if (page !== "create") {
      actions = (
        <button className="btn btn-p" onClick={() => go("create")}>
          <Icon name="plus" size={16} /> Create event
        </button>
      );
    }
  } else if (role === "artist") {
    body = <ArtistPages page={page} go={go} />;
  } else {
    body = <UserPages page={page} roles={roles} onSwitch={onSwitch} user={user} />;
  }

  return (
    <div className="bo">
      <Sidebar role={role} roles={roles} page={page} setPage={go} onSwitch={onSwitch} user={user} />
      <div className="main">
        <Topbar title={title} crumb={crumb} actions={actions} />
        <div className="content">{body}</div>
      </div>
    </div>
  );
}

export default function BackOfficePage() {
  const me = useQuery(api.users.getCurrentUser);
  const switchRoleMut = useMutation(api.users.switchRole);

  if (me === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fbf6ec", color: "#8a8073" }}>
        Loading back office…
      </div>
    );
  }

  if (me === null) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fbf6ec", color: "#17120c", textAlign: "center", padding: 24 }}>
        <div>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>Please sign in to access the back office.</p>
          <Link href="/sign-in" style={{ background: "#ea5a3d", color: "#fff", padding: "11px 18px", borderRadius: 11, fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <BackOfficeApp
      key={me._id}
      me={me}
      onSwitchRole={(role) => {
        switchRoleMut({ role }).catch(() => {});
      }}
    />
  );
}

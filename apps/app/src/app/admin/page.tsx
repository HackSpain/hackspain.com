"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import { EmptyState, LoadingText, Page, RecordCard, RecordList } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminCrmPage() {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<
    "all" | "attending" | "cancelled" | "undecided"
  >("all");
  const [accepted, setAccepted] = useState<"all" | "yes" | "no">("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  const rows = useQuery(api.admin.listParticipants, {
    search: searchQuery || undefined,
    attendance: attendance === "all" ? undefined : attendance,
    accepted: accepted === "all" ? undefined : accepted === "yes",
  });

  return (
    <Page title="Participants">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, team"
          className="sm:col-span-2 lg:col-span-1"
        />
        <Select
          value={accepted}
          onValueChange={(value) => setAccepted(value as "all" | "yes" | "no")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All acceptance</SelectItem>
            <SelectItem value="yes">Accepted</SelectItem>
            <SelectItem value="no">Not accepted</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={attendance}
          onValueChange={(value) =>
            setAttendance(value as "all" | "attending" | "cancelled" | "undecided")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All attendance</SelectItem>
            <SelectItem value="attending">Attending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="undecided">Undecided</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!rows ? (
        <LoadingText />
      ) : rows.length === 0 ? (
        <EmptyState title="No matching participants">
          Try a different search or clear the filters.
        </EmptyState>
      ) : (
        <RecordList
          desktop={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Diet</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const href = row.signupId
                    ? `/admin/users/${row.signupId}?kind=signup`
                    : `/admin/users/${row.userId}?kind=user`;
                  return (
                    <TableRow key={`${row.signupId ?? ""}-${row.userId ?? ""}`}>
                      <TableCell>
                        <Link href={href} className="underline underline-offset-2">
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>
                        <Badge variant={row.accepted ? "gold" : "default"}>
                          {row.accepted ? "accepted" : "not accepted"}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.phone ?? "—"}</TableCell>
                      <TableCell>{row.dietaryRestrictions ?? "—"}</TableCell>
                      <TableCell>{row.travelOrigin ?? "—"}</TableCell>
                      <TableCell>
                        <Badge>{row.attendanceStatus ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>{row.teamName ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          }
        >
          {rows.map((row) => {
            const href = row.signupId
              ? `/admin/users/${row.signupId}?kind=signup`
              : `/admin/users/${row.userId}?kind=user`;
            return (
              <Link
                key={`${row.signupId ?? ""}-${row.userId ?? ""}`}
                href={href}
                className="block motion-safe:transition-transform motion-safe:duration-[var(--duration-press)] motion-safe:ease-[var(--ease-out)] motion-safe:active:scale-[0.97]"
              >
                <RecordCard
                  title={row.name}
                  subtitle={row.email}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={row.accepted ? "gold" : "default"}>
                      {row.accepted ? "accepted" : "not accepted"}
                    </Badge>
                    <Badge>{row.attendanceStatus ?? "—"}</Badge>
                  </div>
                  <p className="text-sm text-hs-brown">
                    {row.teamName ?? "No team"}
                    {row.travelOrigin ? ` · ${row.travelOrigin}` : ""}
                  </p>
                </RecordCard>
              </Link>
            );
          })}
        </RecordList>
      )}
    </Page>
  );
}

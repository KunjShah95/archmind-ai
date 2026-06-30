import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { overallScore } from "@/lib/types";
import { ScoreRing } from "@/components/ScoreRing";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function Analyses() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["analyses", q],
    queryFn: () => api.listAnalyses(q || undefined),
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Analyses"
        description="Every diagram your team has reviewed."
        actions={
          <Link to="/upload">
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4 mr-1.5" /> New analysis
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search analyses…"
            className="pl-8 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setQ(search)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setQ(search)}>Search</Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Workspace</TableHead>
              <TableHead className="hidden lg:table-cell">Author</TableHead>
              <TableHead className="hidden lg:table-cell">Updated</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!isLoading && analyses.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No analyses found</TableCell></TableRow>
            )}
            {analyses.map((a) => (
              <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => window.location.assign(`/analyses/${a.id}`)}>
                <TableCell className="font-medium">
                  <Link to={`/analyses/${a.id}`} className="hover:text-primary">{a.name}</Link>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {a.diagram_type && <Badge variant="outline" className="font-normal">{a.diagram_type}</Badge>}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{a.workspace}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{a.author}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{new Date(a.uploaded_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {a.status === "ready" ? (
                    <div className="inline-flex"><ScoreRing value={overallScore(a.scores)} size={36} /></div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{a.status}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

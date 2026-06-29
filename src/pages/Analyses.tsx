import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_ANALYSES, overallScore } from "@/lib/mock-data";
import { ScoreRing } from "@/components/ScoreRing";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function Analyses() {
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
          <Input placeholder="Search analyses…" className="pl-8 bg-card" />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filter</Button>
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
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_ANALYSES.map((a) => (
              <TableRow key={a.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link to={`/analyses/${a.id}`} className="hover:text-primary">{a.name}</Link>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="font-normal">{a.type}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{a.workspace}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{a.author}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{new Date(a.uploadedAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {a.status === "ready" ? (
                    <div className="inline-flex"><ScoreRing value={overallScore(a.scores)} size={36} /></div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{a.status}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Layers, Activity, Target, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePrincipalRiskTypes,
  useRiskSubTypes,
  useRiskAppetite,
  useContagionLinks,
  channelLabel,
  type Rag,
} from "@/hooks/useRiskUniverse";
import { useKRIs } from "@/hooks/useKRI";

const ragClass = (rag: string) =>
  rag === "red"
    ? "bg-risk-red/15 text-risk-red border-risk-red/30"
    : rag === "amber"
    ? "bg-risk-amber/15 text-risk-amber border-risk-amber/30"
    : rag === "green"
    ? "bg-risk-green/15 text-risk-green border-risk-green/30"
    : "bg-muted text-muted-foreground border-border";

const PrtModule = () => {
  const { code = "" } = useParams();
  const { data: prts, isLoading } = usePrincipalRiskTypes();
  const { data: subTypes } = useRiskSubTypes();
  const { data: kris } = useKRIs();
  const { data: appetite } = useRiskAppetite();
  const { data: links } = useContagionLinks();

  const prt = useMemo(
    () => (prts ?? []).find((p) => (p.code ?? "").toLowerCase() === code.toLowerCase()),
    [prts, code]
  );

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    (prts ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [prts]);

  const mySubs = (subTypes ?? []).filter((s) => s.risk_type_id === prt?.id);
  const myKris = (kris ?? []).filter((k) => k.risk_type_id === prt?.id);
  const myAppetite = (appetite ?? []).filter((a) => a.risk_type_id === prt?.id);
  const outbound = (links ?? []).filter((l) => l.source_risk_type_id === prt?.id);
  const inbound = (links ?? []).filter((l) => l.target_risk_type_id === prt?.id);

  const rollup: Rag = myKris.some((k) => k.status === "red")
    ? "red"
    : myKris.some((k) => k.status === "amber")
    ? "amber"
    : myKris.length
    ? "green"
    : "grey";

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading risk module…</div>;
  }

  if (!prt) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h2 className="text-xl font-display font-bold mb-2">Risk module not found</h2>
        <p className="text-sm text-muted-foreground mb-4">No principal risk type matches “{code}”.</p>
        <Button asChild variant="outline"><Link to="/risk-universe">Back to Risk Universe</Link></Button>
      </div>
    );
  }

  const stats = [
    { label: "Sub Risk Types", value: mySubs.length, icon: Layers },
    { label: "Key Risk Indicators", value: myKris.length, icon: Activity },
    { label: "Appetite Statements", value: myAppetite.length, icon: Target },
    { label: "Transmission Links", value: outbound.length + inbound.length, icon: Share2 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/risk-universe" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Risk Universe
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
            {prt.name}
            <Badge variant="outline" className={ragClass(rollup)}>{rollup.toUpperCase()}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{prt.description}</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="mb-1">
            {prt.prt_category === "financial" ? "Financial Risk" : "Non-Financial Risk"}
          </Badge>
          <p className="text-xs text-muted-foreground">Owner: {prt.owner ?? "Unassigned"}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><s.icon className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="subtypes">
        <TabsList>
          <TabsTrigger value="subtypes">Sub Risk Types</TabsTrigger>
          <TabsTrigger value="kris">KRIs & Thresholds</TabsTrigger>
          <TabsTrigger value="appetite">Risk Appetite</TabsTrigger>
          <TabsTrigger value="links">Interconnections</TabsTrigger>
        </TabsList>

        <TabsContent value="subtypes" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg">Sub Risk Types</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Inherent</TableHead>
                    <TableHead>Residual</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mySubs.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.owner ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{s.inherent_rating}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{s.residual_rating ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.status}</TableCell>
                    </TableRow>
                  ))}
                  {!mySubs.length && (
                    <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No sub risk types registered yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kris" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg">Key Risk Indicators</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Green</TableHead>
                    <TableHead className="text-right">Amber</TableHead>
                    <TableHead className="text-right">Red</TableHead>
                    <TableHead>RAG</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myKris.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell className="text-right">{Number(k.current_value).toFixed(2)} {k.metric_unit}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{k.green_threshold}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{k.amber_threshold}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{k.red_threshold}</TableCell>
                      <TableCell><Badge variant="outline" className={ragClass(k.status)}>{k.status.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{k.trend}</TableCell>
                    </TableRow>
                  ))}
                  {!myKris.length && (
                    <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No KRIs registered for this risk type.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appetite" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {myAppetite.map((a) => (
              <Card key={a.id} className="shadow-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{a.appetite_level}</Badge>
                    <span className="text-xs text-muted-foreground">{a.status}</span>
                  </div>
                  <p className="text-sm">{a.statement}</p>
                  <p className="text-xs text-muted-foreground">
                    Tolerance: {a.tolerance_limit ?? "—"} {a.metric_unit ?? ""} · Review {a.review_frequency}
                  </p>
                </CardContent>
              </Card>
            ))}
            {!myAppetite.length && <p className="text-sm text-muted-foreground">No appetite statements yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="links" className="mt-4 space-y-4">
          {[
            { title: "Outbound — this risk drives", rows: outbound, other: (l: typeof outbound[number]) => nameById.get(l.target_risk_type_id) },
            { title: "Inbound — driven by", rows: inbound, other: (l: typeof inbound[number]) => nameById.get(l.source_risk_type_id) },
          ].map((block) => (
            <Card key={block.title} className="shadow-card">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ArrowRight className="h-4 w-4" />{block.title}</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Counterpart Risk</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Process</TableHead>
                      <TableHead className="w-40">Strength</TableHead>
                      <TableHead className="text-right">Inherent</TableHead>
                      <TableHead className="text-right">Residual</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.rows.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{block.other(l)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{channelLabel(l.transmission_channel ?? "operational")}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.process ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Number(l.strength) * 100} className="h-1.5" />
                            <span className="text-xs tabular-nums">{Number(l.strength).toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{Number(l.inherent_score ?? 0).toFixed(0)}</TableCell>
                        <TableCell className="text-right">{Number(l.residual_score ?? 0).toFixed(0)}</TableCell>
                        <TableCell className="text-right">{Number(l.weight ?? 1).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {!block.rows.length && (
                      <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No links recorded.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default PrtModule;

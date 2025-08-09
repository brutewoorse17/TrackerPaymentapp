import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-slate-700">App: Payment Tracker Pro</div>
          <div className="text-sm text-slate-700">Developer: <span className="font-medium">Francis Andrei Pelayo</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  testId?: string;
}

export function StatsCard({ title, value, icon, iconBg, testId }: StatsCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200" data-testid={testId}>
      <div className="p-2 sm:p-3 lg:p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={cn("w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center", iconBg)}>
              {icon}
            </div>
          </div>
          <div className="ml-2 sm:ml-3 lg:ml-5 w-0 flex-1 min-w-0">
            <dl>
              <dt className="text-xs font-medium text-slate-500 truncate">{title}</dt>
              <dd className="text-sm sm:text-lg lg:text-2xl font-bold text-slate-900 truncate" data-testid={`stats-${title.toLowerCase().replace(/\s+/g, '-')}-value`}>
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

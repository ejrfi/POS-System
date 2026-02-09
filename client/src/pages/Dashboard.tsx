import { useDailyReport } from "@/hooks/use-transactions";
import { StatCard } from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingBag, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { data: stats } = useDailyReport();

  // Mock chart data - in a real app this would come from a historical report endpoint
  const chartData = [
    { name: '08:00', total: 120 },
    { name: '10:00', total: 450 },
    { name: '12:00', total: 980 },
    { name: '14:00', total: 600 },
    { name: '16:00', total: 850 },
    { name: '18:00', total: 1100 },
    { name: '20:00', total: 300 },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of today's performance</p>
        </div>
        <div className="text-sm font-medium bg-white px-4 py-2 rounded-full border shadow-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          trend="+12.5%"
          trendUp={true}
        />
        <StatCard
          title="Transactions"
          value={stats?.totalTransactions || 0}
          icon={ShoppingBag}
        />
        <StatCard
          title="Items Sold"
          value={stats?.totalItems || 0}
          icon={PackageIcon} // Using custom component below
        />
        <StatCard
          title="Avg. Sale Value"
          value={formatCurrency(stats?.totalTransactions ? (stats.totalRevenue / stats.totalTransactions) : 0)}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2 shadow-sm border-none bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Sales Trend (Today)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#888' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#888' }} 
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="total" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { name: "Beverages", value: 45, color: "bg-blue-500" },
                { name: "Snacks", value: 32, color: "bg-purple-500" },
                { name: "Electronics", value: 15, color: "bg-amber-500" },
                { name: "Home", value: 8, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color}`} 
                      style={{ width: `${item.value}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PackageIcon(props: any) {
  return <Users {...props} />; // Placeholder, reusing icon
}

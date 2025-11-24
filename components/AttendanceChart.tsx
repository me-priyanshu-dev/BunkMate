
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AttendanceStats, User, DailyStatus } from '../types';
import { Trophy, Medal } from 'lucide-react';

interface Props {
  currentUser: User;
  users: User[];
  statuses: DailyStatus[];
  myStats: AttendanceStats;
}

const AttendanceChart: React.FC<Props> = ({ currentUser, users, statuses, myStats }) => {
  
  // Weekly Stats Calculation (Last 7 Days)
  const weeklyStats = useMemo(() => {
    // 7 days ago from now
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    const myWeeklyStatuses = statuses.filter(s => 
        s.userId === currentUser.id && 
        s.status !== 'UNDECIDED' &&
        s.date >= pastDateStr
    );
    
    const total = myWeeklyStatuses.length;
    const present = myWeeklyStatuses.filter(s => s.status === 'GOING').length;
    const percentage = total > 0 ? (present / total) * 100 : 0; // Default to 0 if no data
    
    return { total, present, percentage };
  }, [statuses, currentUser.id]);

  // Chart Data (Based on Weekly Stats now)
  const weeklyAbsent = weeklyStats.total - weeklyStats.present;
  
  // If no data, show a placeholder entry or empty
  const hasWeeklyData = weeklyStats.total > 0;
  
  const data = hasWeeklyData ? [
    { name: 'Present', value: weeklyStats.present },
    { name: 'Not Going', value: weeklyAbsent },
  ] : [
    { name: 'No Data', value: 1 } // Placeholder gray ring
  ];
  
  const COLORS = hasWeeklyData ? ['#22c55e', '#ef4444'] : ['#27272a'];

  // Leaderboard Calculation
  const leaderboard = useMemo(() => {
    return users.map(user => {
        const userStatuses = statuses.filter(s => s.userId === user.id && s.status !== 'UNDECIDED');
        const total = userStatuses.length;
        const present = userStatuses.filter(s => s.status === 'GOING').length;
        const percentage = total > 0 ? (present / total) * 100 : 0;
        return { ...user, percentage, total };
    })
    .sort((a, b) => b.percentage - a.percentage) // Sort by highest attendance
    .slice(0, 5); // Top 5
  }, [users, statuses]);


  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-1">
      
      {/* Main Stats Card */}
      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 relative overflow-hidden">
        <h3 className="text-center text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Weekly Attendance (Last 7 Days)</h3>
        
        <div className="h-56 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={hasWeeklyData ? 5 : 0}
                dataKey="value"
                stroke="none"
                cornerRadius={6}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  formatter={(value: number) => hasWeeklyData ? value : 'No Records'}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-5">
            <span className={`block text-4xl font-bold ${hasWeeklyData ? 'text-white' : 'text-zinc-600'}`}>
                {hasWeeklyData ? weeklyStats.percentage.toFixed(0) : '0'}%
            </span>
            <span className="text-xs text-zinc-500">Efficiency</span>
          </div>
        </div>

        {/* Goal Progress - Still useful to show lifetime comparison here lightly */}
        <div className="mt-2 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
            <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Weekly Target</span>
                <span className="text-blue-400 font-bold">{myStats.targetPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                {/* Visualizing the Weekly Percentage against Target */}
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${weeklyStats.percentage < myStats.targetPercentage ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, weeklyStats.percentage)}%` }}
                />
            </div>
             <p className="text-xs text-zinc-500 mt-2 text-center">
                {hasWeeklyData 
                    ? (weeklyStats.percentage >= myStats.targetPercentage ? "You're hitting your weekly goal!" : "You're behind schedule this week.") 
                    : "No data for this week yet."}
            </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 flex-grow">
        <div className="flex items-center gap-3 mb-5">
            <Trophy size={20} className="text-amber-500" />
            <h3 className="text-white font-bold">Squad Ranking (Lifetime)</h3>
        </div>
        <div className="space-y-4">
            {leaderboard.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className={`font-mono text-sm w-4 ${index === 0 ? 'text-amber-400 font-bold' : 'text-zinc-600'}`}>
                            #{index + 1}
                        </span>
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full bg-zinc-800" />
                        <div>
                            <span className={`text-sm font-medium block ${user.isCurrentUser ? 'text-blue-400' : 'text-zinc-300'}`}>
                                {user.name} {user.isCurrentUser && '(You)'}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-white">{user.percentage.toFixed(0)}%</span>
                        {index === 0 && <Medal size={14} className="inline ml-1 text-amber-500" />}
                    </div>
                </div>
            ))}
            {leaderboard.length === 0 && <p className="text-zinc-500 text-sm">No data yet.</p>}
        </div>
      </div>

    </div>
  );
};

export default AttendanceChart;

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const EfficiencyDonut = ({ machineName, percentage, size = 150 }) => {
    // Coloring based on efficiency
    let color = '#3B82F6'; // Blue default
    if (percentage >= 90) color = '#10B981'; // Green
    else if (percentage >= 75) color = '#F59E0B'; // Orange
    else color = '#EF4444'; // Red

    const data = [
        { name: 'Efficiency', value: percentage },
        { name: 'Gap', value: Math.max(0, 100 - percentage) },
    ];

    return (
        <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <h4 className="font-bold text-gray-700 mb-2 truncate max-w-[150px] text-center" title={machineName}>{machineName}</h4>
            <div style={{ width: size, height: size / 1.5 }} className="relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={size / 2 - 10}
                            outerRadius={size / 2}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={color} />
                            <Cell fill="#E5E7EB" />
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px' }}
                            formatter={(value) => `${value.toFixed(1)}%`}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                    <span className="text-2xl font-bold" style={{ color }}>{percentage.toFixed(0)}%</span>
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">OEE Match</p>
        </div>
    );
};

export default EfficiencyDonut;

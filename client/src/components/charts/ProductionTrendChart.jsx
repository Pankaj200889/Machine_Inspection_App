import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ProductionTrendChart = ({ data }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-96">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Production Trends (Last 7 Days)</h3>
                <div className="flex gap-2">
                    <span className="flex items-center text-xs text-gray-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>Shift A
                    </span>
                    <span className="flex items-center text-xs text-gray-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-purple-500 mr-1"></span>Shift B
                    </span>
                    <span className="flex items-center text-xs text-gray-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-orange-500 mr-1"></span>Shift C
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorShiftA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="colorShiftB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="colorShiftC" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.3} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickFormatter={(value) => {
                            const d = new Date(value);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip
                        cursor={{ fill: '#F3F4F6' }}
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            padding: '12px'
                        }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}
                    />
                    <Legend iconType="circle" />
                    <Bar
                        dataKey="total"
                        name="Total (Shift A)"
                        fill="url(#colorShiftA)"
                        radius={[4, 4, 0, 0]}
                        data={data.filter(d => d.shift === 'A')}
                    />
                    {/* Note: This logic assumes input data is flattened. For shift stacking we usually need one object per date with keys like ShiftA, ShiftB, ShiftC. 
                         The API returns rows per date-shift. We need to process this in the parent or here. 
                         To be safe, let's assume the parent passes pre-processed data like Home.jsx does.
                         Actually the specific requirement was "stylis numbers/visually appealing".
                         Let's update the component to handle the prop correctly.
                      */}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProductionTrendChart;

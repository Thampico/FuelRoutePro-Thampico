import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CostComparisonChart = ({ routes = [] }) => {
  if (!routes.length) return null;

  const data = {
    labels: routes.map((r) => r.name),
    datasets: [
      {
        label: 'Total Cost (USD)',
        data: routes.map((r) => r.estimatedCost),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Route Cost Comparison',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Route Options',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Cost (USD)',
        },
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Bar data={data} options={options} />
      <p className="text-center text-gray-600 text-sm mt-2">
        Bars show total project cost per route.
      </p>
    </div>
  );
};

export default CostComparisonChart;

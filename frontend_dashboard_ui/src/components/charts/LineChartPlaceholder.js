import React from 'react';
import ChartPlaceholderCard from './ChartPlaceholderCard';

// PUBLIC_INTERFACE
export default function LineChartPlaceholder({ title, subtitle }) {
  /** Line chart placeholder. Replace with real chart implementation later. */
  return (
    <ChartPlaceholderCard
      title={title || 'Line chart'}
      subtitle={subtitle || 'Chart coming soon'}
      footer={
        <div className="small-muted">
          TODO: Replace with a real time-series chart (e.g., Recharts/Visx) when analytics data is available.
        </div>
      }
    />
  );
}

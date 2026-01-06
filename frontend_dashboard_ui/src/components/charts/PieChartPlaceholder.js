import React from 'react';
import ChartPlaceholderCard from './ChartPlaceholderCard';

// PUBLIC_INTERFACE
export default function PieChartPlaceholder({ title, subtitle }) {
  /** Pie/donut chart placeholder. Replace with real chart implementation later. */
  return (
    <ChartPlaceholderCard
      title={title || 'Pie chart'}
      subtitle={subtitle || 'Chart coming soon'}
      footer={
        <div className="small-muted">
          TODO: Replace with a real donut chart once category mix data is available.
        </div>
      }
    />
  );
}

import React from 'react';
import ChartPlaceholderCard from './ChartPlaceholderCard';

// PUBLIC_INTERFACE
export default function BarChartPlaceholder({ title }) {
  /** Bar chart placeholder. Replace with real chart implementation later. */
  return (
    <ChartPlaceholderCard
      title={title || 'Bar chart'}
      subtitle="Chart coming soon"
      footer={
        <div className="small-muted">
          TODO: Replace with a real categorical bar chart once category aggregates are wired.
        </div>
      }
    />
  );
}

import React from 'react';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function NotFound() {
  /** 404 page shown for unknown routes. */
  return (
    <div className="card">
      <h2 style={{ fontSize: 16, margin: 0 }}>Page not found</h2>
      <div className="small-muted" style={{ marginTop: 8 }}>
        The page you’re looking for doesn’t exist.
      </div>

      <div style={{ marginTop: 12 }}>
        <Link to="/" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

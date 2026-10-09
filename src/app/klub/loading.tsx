export default function Loading() {
  return (
    <div className="stack" role="status" aria-label="Načítavam">
      <div className="skeleton" />
      <div className="dashboard-stats">
        {[1, 2, 3, 4].map((i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
      <div className="skeleton" style={{ minHeight: 300 }} />
    </div>
  );
}

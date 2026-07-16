type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "orange" | "violet" | "green";
};

export function StatCard({ label, value, detail, tone }: StatCardProps) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-header">
        <span>{label}</span>
        <span className="stat-accent" aria-hidden="true" />
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

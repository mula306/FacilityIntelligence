import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export function AppShell({
  title,
  subtitle,
  navItems,
  activePath,
  headerActions,
  children
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  activePath: string;
  headerActions?: ReactNode;
}>) {
  return (
    <div className="fi-shell">
      <aside className="fi-shell__sidebar">
        <div className="fi-shell__brand">
          <div className="fi-shell__brand-mark">FI</div>
          <div>
            <p className="fi-shell__brand-title">{title}</p>
            {subtitle ? <p className="fi-shell__brand-subtitle">{subtitle}</p> : null}
          </div>
        </div>
        <nav className="fi-shell__nav" aria-label="Primary">
          {navItems.map((item) => (
            <a
              key={item.href}
              className={joinClassNames("fi-shell__nav-item", item.href === activePath && "is-active")}
              href={item.href}
            >
              <span>{item.label}</span>
              {item.badge ? <span className="fi-badge fi-badge--neutral">{item.badge}</span> : null}
            </a>
          ))}
        </nav>
      </aside>
      <div className="fi-shell__content">
        <header className="fi-shell__header">
          <div>
            <p className="fi-shell__eyebrow">Healthcare Facility Operations</p>
            <h1 className="fi-shell__page-title">{title}</h1>
          </div>
          <div className="fi-shell__header-actions">{headerActions}</div>
        </header>
        <main className="fi-shell__main">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="fi-page-header">
      <div>
        <h2 className="fi-page-header__title">{title}</h2>
        {description ? <p className="fi-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="fi-page-header__actions">{actions}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children
}: PropsWithChildren<{
  title?: string;
  description?: string;
  actions?: ReactNode;
}>) {
  return (
    <section className="fi-card">
      {title || description || actions ? (
        <div className="fi-card__header">
          <div>
            {title ? <h3 className="fi-card__title">{title}</h3> : null}
            {description ? <p className="fi-card__description">{description}</p> : null}
          </div>
          {actions ? <div className="fi-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="fi-card__body">{children}</div>
    </section>
  );
}

export function StatStrip({
  items
}: {
  items: Array<{ label: string; value: ReactNode; tone?: "default" | "success" | "warning" | "danger" }>;
}) {
  return (
    <div className="fi-stat-strip">
      {items.map((item) => (
        <div key={item.label} className={joinClassNames("fi-stat", item.tone && `fi-stat--${item.tone}`)}>
          <span className="fi-stat__label">{item.label}</span>
          <strong className="fi-stat__value">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children
}: PropsWithChildren<{ tone?: "neutral" | "success" | "warning" | "danger" | "info" }>) {
  return <span className={joinClassNames("fi-badge", `fi-badge--${tone}`)}>{children}</span>;
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }
>) {
  return (
    <button className={joinClassNames("fi-button", `fi-button--${variant}`, className)} {...props}>
      {children}
    </button>
  );
}

export function PanelMessage({
  tone = "neutral",
  title,
  children
}: PropsWithChildren<{ tone?: "neutral" | "info" | "warning"; title: string }>) {
  return (
    <div className={joinClassNames("fi-message", `fi-message--${tone}`)}>
      <strong className="fi-message__title">{title}</strong>
      <div className="fi-message__body">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="fi-empty-state">
      <h3 className="fi-empty-state__title">{title}</h3>
      <p className="fi-empty-state__description">{description}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  helper,
  error,
  children
}: PropsWithChildren<{
  label: string;
  helper?: string | undefined;
  error?: string | undefined;
}>) {
  return (
    <label className="fi-field">
      <span className="fi-field__label">{label}</span>
      {children}
      {error ? <span className="fi-field__error">{error}</span> : helper ? <span className="fi-field__helper">{helper}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="fi-input" {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="fi-select" {...props} />;
}

export function TextareaInput(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="fi-textarea" {...props} />;
}

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
}

export function DataTable<T>({
  columns,
  rows,
  empty,
  onRowClick
}: {
  columns: TableColumn<T>[];
  rows: T[];
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) {
    return <>{empty ?? null}</>;
  }

  return (
    <div className="fi-table-wrap">
      <table className="fi-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? "is-clickable" : undefined}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DefinitionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="fi-definition-list">
      {items.map((item) => (
        <div key={item.label} className="fi-definition-list__item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

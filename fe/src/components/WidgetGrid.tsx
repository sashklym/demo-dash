/**
 * Placeholder — the full widget grid (empty state, add-widget, and line/bar/text
 * widgets with per-widget loading/error) is implemented in the widgets-UI phase.
 */
export function WidgetGrid({ dashboardKey }: { dashboardKey: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed p-12 text-center text-muted-foreground">
      <p>
        Widget grid for <code className="font-mono">{dashboardKey}</code> loads here.
      </p>
    </div>
  );
}

/**
 * Public declarations for the framework-neutral components installed by components.js.
 * Html-suffixed properties accept trusted renderer output, never raw API/user text.
 * Text properties are escaped by the implementation. This alias documents the
 * trust boundary; it is not a sanitizer or a substitute for server authorization.
 */
export type InternalHtml = string;
export type DataAttribute = `data-${string}`;
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface SourceBadgeProps { label: string; iconName?: string; variant?: string; }
export interface ConfidenceBadgeProps { level?: ConfidenceLevel | null; }
export interface StatCardProps { label: string; valueHtml: InternalHtml; detailHtml?: InternalHtml; variant?: string; }
export interface SegmentedControlProps { items: ReadonlyArray<readonly [value: string, label: string]>; selected: string; attribute: DataAttribute; }
export interface PageHeaderProps { title: string; description: string; eyebrow?: string; }
export interface EmptyStateProps { title: string; description: string; actionHtml?: InternalHtml; }
export interface ErrorStateProps { title?: string; description?: string; actionHtml?: InternalHtml; }
export interface LoadingSkeletonProps { label?: string; }
export interface DetailDrawerProps { title?: string; }
export interface DataTableProps { headers: readonly string[]; rowsHtml: InternalHtml; caption?: string; }
export interface ChartPanelProps { title: string; description?: string; bodyHtml: InternalHtml; footHtml?: InternalHtml; toolsHtml?: InternalHtml; className?: string; }
export interface AppSidebarProps { brandHtml: InternalHtml; navigationHtml: InternalHtml; footerHtml: InternalHtml; }
export interface WorkspaceHeaderProps { startHtml: InternalHtml; actionsHtml: InternalHtml; }
export interface AppShellProps { sidebar: Pick<Element, 'innerHTML'>; header: Pick<Element, 'innerHTML'>; sidebarHtml: InternalHtml; headerHtml: InternalHtml; }
export interface FilterToolbarProps { node: HTMLElement; }
export interface SearchCommandProps { top: HTMLElement; input: HTMLInputElement; help: HTMLElement; }
export interface ProtectedRouteProps {
  /** Only an authoritative, explicitly true authorization result may show content. */
  authorized?: boolean;
  contentHtml: InternalHtml;
  deniedHtml?: InternalHtml;
}

export interface TerminalComponentsAPI {
  escape(value: unknown): string;
  icon(name: string): InternalHtml;
  AppShell(props: AppShellProps): void;
  AppSidebar(props: AppSidebarProps): InternalHtml;
  WorkspaceHeader(props: WorkspaceHeaderProps): InternalHtml;
  PageHeader(props: PageHeaderProps): InternalHtml;
  StatCard(props: StatCardProps): InternalHtml;
  ChartPanel(props: ChartPanelProps): InternalHtml;
  FilterToolbar(props: FilterToolbarProps): void;
  DataTable(props: DataTableProps): InternalHtml;
  SearchCommand(props: SearchCommandProps): void;
  SegmentedControl(props: SegmentedControlProps): InternalHtml;
  SourceBadge(props: SourceBadgeProps): InternalHtml;
  ConfidenceBadge(props: ConfidenceBadgeProps): InternalHtml;
  DetailDrawer(props: DetailDrawerProps): InternalHtml;
  EmptyState(props: EmptyStateProps): InternalHtml;
  LoadingSkeleton(props: LoadingSkeletonProps): InternalHtml;
  ErrorState(props: ErrorStateProps): InternalHtml;
  /** Presentation gate only. Every future private API must also authorize server-side. */
  ProtectedRoute(props: ProtectedRouteProps): InternalHtml;
}

declare global {
  interface Window { readonly TerminalComponents: Readonly<TerminalComponentsAPI>; }
}

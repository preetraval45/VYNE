// Barrel export for all hooks

// Utility hooks
export { useDebounce } from "./useDebounce";
export { useThrottle } from "./useThrottle";
export { useDebouncedCallback } from "./useDebouncedCallback";
export { usePagination } from "./usePagination";
export type {
  UsePaginationOptions,
  UsePaginationResult,
} from "./usePagination";

// Domain hooks
export { useProjects } from "./useProjects";
export {
  useIssues,
  useIssue,
  useCreateIssue,
  useUpdateIssue,
  useReorderIssues,
} from "./useIssues";
export {
  useDocs,
  useDoc,
  useDocChildren,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  useDocSearch,
} from "./useDocs";
export { useMessages, useChannels } from "./useMessages";
export {
  useDeployments,
  useDeployment,
  useDeploymentStats,
  useCreateDeployment,
  usePullRequests,
  usePullRequestStats,
  useRepositories,
  useConnectRepository,
} from "./useCode";
export { useSocket, disconnectSocket } from "./useSocket";
export {
  usePageDashboard,
  TIME_RANGE_LABELS,
  TIME_RANGE_OPTIONS,
  timeRangeToMs,
} from "./usePageDashboard";
export type { TimeRange } from "./usePageDashboard";
export { useSavedViews } from "./useSavedViews";
export type {
  SavedView,
  UseSavedViewsOptions,
  UseSavedViewsResult,
} from "./useSavedViews";
export { useBulkSelection } from "./useBulkSelection";
export type { UseBulkSelectionResult } from "./useBulkSelection";

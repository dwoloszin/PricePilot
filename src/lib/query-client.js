// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

/**
 * Clear all shared data caches when user changes
 * Called when logout or user switches
 */
export const clearSharedDataCache = () => {
	queryClientInstance.invalidateQueries(['products']);
	queryClientInstance.invalidateQueries(['stores']);
	queryClientInstance.invalidateQueries(['all-prices']);
	queryClientInstance.invalidateQueries(['recent-prices']);
	queryClientInstance.invalidateQueries(['all-stores']);
};
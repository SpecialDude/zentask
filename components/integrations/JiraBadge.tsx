import React from 'react';

interface JiraBadgeProps {
    issueKey: string;
}

/**
 * Small inline badge shown on tasks that originated from Jira.
 */
const JiraBadge: React.FC<JiraBadgeProps> = ({ issueKey }) => (
    <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800"
        title={`Synced from Jira: ${issueKey}`}
    >
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor">
            <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.758a1.001 1.001 0 00-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024.013 12.487V1.005A1.005 1.005 0 0023.013 0z" />
        </svg>
        {issueKey}
    </span>
);

export default JiraBadge;

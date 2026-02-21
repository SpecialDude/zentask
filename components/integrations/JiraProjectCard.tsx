import React from 'react';
import { JiraProject } from '../../types';

interface JiraProjectCardProps {
    project: JiraProject;
    onFetch: (projectKey: string) => void;
    onRemove: (projectId: string) => void;
    isSyncing?: boolean;
}

const JiraProjectCard: React.FC<JiraProjectCardProps> = ({ project, onFetch, onRemove, isSyncing }) => (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow group">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold text-sm">
                    {project.project_key}
                </div>
                <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">{project.project_name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        {project.last_synced_at
                            ? `Last synced: ${new Date(project.last_synced_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                            : 'Never synced'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onFetch(project.project_key)}
                    disabled={isSyncing}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    title="Import new issues from this project"
                >
                    Fetch New
                </button>
                <button
                    onClick={() => onRemove(project.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove project"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
);

export default JiraProjectCard;

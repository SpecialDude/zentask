import React, { useState, useCallback } from 'react';
import { JiraIssue } from '../../types';
import { useAuth } from '../../hooks';
import { useJira } from '../../hooks/useJira';
import { JiraConnectButton, JiraProjectCard, JiraProjectSelector, JiraImportModal } from '../integrations';
import { getAvailableJiraProjects } from '../../services/jiraService';

interface IntegrationsViewProps {
    showToast: (message: string, type: 'success' | 'error') => void;
    updateTask: (id: string, updates: any) => Promise<void>;
    refetchTasks: () => Promise<void>;
}

const IntegrationsView: React.FC<IntegrationsViewProps> = ({ showToast, updateTask, refetchTasks }) => {
    const { session } = useAuth();
    const userId = session?.user?.id;

    const jira = useJira({ userId, onTaskUpdate: updateTask, showToast });

    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [importState, setImportState] = useState<{
        isOpen: boolean;
        isLoading: boolean;
        projectKey: string;
        projectId: string;
        issues: JiraIssue[];
    }>({ isOpen: false, isLoading: false, projectKey: '', projectId: '', issues: [] });

    const handleFetch = useCallback(async (projectKey: string) => {
        const project = jira.projects.find(p => p.project_key === projectKey);
        if (!project) return;

        setImportState({ isOpen: true, isLoading: true, projectKey, projectId: project.id, issues: [] });

        const issues = await jira.fetchNewIssues(projectKey);
        setImportState(prev => ({ ...prev, isLoading: false, issues }));
    }, [jira]);

    const handleImport = useCallback(async (issues: JiraIssue[], dates: Record<string, string>) => {
        await jira.importIssues(issues, dates, importState.projectId);
        setImportState({ isOpen: false, isLoading: false, projectKey: '', projectId: '', issues: [] });
        // Refresh the task list so imported tasks appear immediately
        await refetchTasks();
    }, [jira, importState.projectId, refetchTasks]);

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col p-2">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Integrations
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Connect external tools to sync tasks bidirectionally.
                </p>
            </div>

            {/* Jira Connection */}
            <JiraConnectButton
                connection={jira.connection}
                isLoading={jira.isLoading}
                onConnect={jira.connect}
                onDisconnect={jira.disconnect}
            />

            {/* Projects Section */}
            {jira.isConnected && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Synced Projects
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={jira.syncAll}
                                disabled={jira.isSyncing}
                                className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 transition-colors disabled:opacity-50"
                            >
                                {jira.isSyncing ? 'Syncing...' : 'Sync All'}
                            </button>
                            <button
                                onClick={() => setShowProjectSelector(true)}
                                className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                + Add Project
                            </button>
                        </div>
                    </div>

                    {jira.projects.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-sm text-slate-500">No projects added yet. Click "Add Project" to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {jira.projects.map(project => (
                                <JiraProjectCard
                                    key={project.id}
                                    project={project}
                                    onFetch={handleFetch}
                                    onRemove={jira.removeProject}
                                    isSyncing={jira.isSyncing}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Project Selector Modal */}
            {showProjectSelector && (
                <JiraProjectSelector
                    existingProjectIds={jira.projects.map(p => p.project_id)}
                    onSelect={(id, key, name) => {
                        jira.addProject(id, key, name);
                        setShowProjectSelector(false);
                    }}
                    onCancel={() => setShowProjectSelector(false)}
                    fetchAvailableProjects={getAvailableJiraProjects}
                />
            )}

            {/* Import Modal */}
            {importState.isOpen && (
                <JiraImportModal
                    issues={importState.issues}
                    isLoading={importState.isLoading}
                    projectKey={importState.projectKey}
                    onImport={handleImport}
                    onClose={() => setImportState({ isOpen: false, isLoading: false, projectKey: '', projectId: '', issues: [] })}
                />
            )}
        </div>
    );
};

export default IntegrationsView;

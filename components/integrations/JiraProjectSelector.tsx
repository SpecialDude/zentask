import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../LoadingSpinner';

interface AvailableProject {
    id: string;
    key: string;
    name: string;
}

interface JiraProjectSelectorProps {
    existingProjectIds: string[];
    onSelect: (projectId: string, projectKey: string, projectName: string) => void;
    onCancel: () => void;
    fetchAvailableProjects: () => Promise<any>;
}

const JiraProjectSelector: React.FC<JiraProjectSelectorProps> = ({
    existingProjectIds,
    onSelect,
    onCancel,
    fetchAvailableProjects,
}) => {
    const [projects, setProjects] = useState<AvailableProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const result = await fetchAvailableProjects();
                const available = (result.values || []).map((p: any) => ({
                    id: p.id,
                    key: p.key,
                    name: p.name,
                }));
                // Filter out already-added projects
                setProjects(available.filter((p: AvailableProject) => !existingProjectIds.includes(p.id)));
            } catch (err: any) {
                setError(err.message || 'Failed to load projects');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [fetchAvailableProjects, existingProjectIds]);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Jira Project</h3>
                    <p className="text-sm text-slate-500 mt-1">Select a project to sync with ZenTask</p>
                </div>

                <div className="p-6 max-h-80 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner size="md" message="Loading projects..." />
                        </div>
                    ) : error ? (
                        <div className="text-center py-4 text-red-500 text-sm">{error}</div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            All available projects have been added.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {projects.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => onSelect(project.id, project.key, project.name)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all flex items-center gap-3"
                                >
                                    <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold text-xs">
                                        {project.key}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900 dark:text-white text-sm">{project.name}</div>
                                        <div className="text-xs text-slate-400">{project.key}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JiraProjectSelector;

import { useState, useEffect, useCallback } from 'react';
import { JiraConnection, JiraProject, JiraIssue, JiraTaskMapping, Task, TaskStatus } from '../types';
import * as jiraService from '../services/jiraService';
import { supabase } from '../supabase';

interface UseJiraOptions {
    userId?: string;
    onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
    showToast?: (message: string, type: 'success' | 'error') => void;
}

export function useJira({ userId, onTaskUpdate, showToast }: UseJiraOptions) {
    const [connection, setConnection] = useState<JiraConnection | null>(null);
    const [projects, setProjects] = useState<JiraProject[]>([]);
    const [mappings, setMappings] = useState<JiraTaskMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const isConnected = !!connection;

    // Fetch connection + projects on mount
    const refresh = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [connResult, projResult, mapResult] = await Promise.all([
                jiraService.getJiraConnection(),
                jiraService.getJiraProjects(),
                jiraService.getTaskMappings(),
            ]);
            setConnection(connResult.data);
            setProjects(projResult.data || []);
            setMappings(mapResult.data || []);
        } catch (err) {
            console.error('Failed to load Jira state:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Connect: redirect to Atlassian OAuth
    const connect = useCallback(() => {
        if (!userId) return;
        // Pass userId as state parameter for the callback
        const authUrl = jiraService.getJiraAuthUrl() + `&state=${userId}`;
        window.location.href = authUrl;
    }, [userId]);

    // Disconnect
    const disconnect = useCallback(async () => {
        const { error } = await jiraService.disconnectJira();
        if (error) {
            showToast?.('Failed to disconnect Jira', 'error');
            return;
        }
        setConnection(null);
        setProjects([]);
        showToast?.('Jira disconnected', 'success');
    }, [showToast]);

    // Add a project
    const addProject = useCallback(async (projectId: string, projectKey: string, projectName: string) => {
        if (!connection) return;
        const { data, error } = await jiraService.addJiraProject(connection.id, projectId, projectKey, projectName);
        if (error) {
            showToast?.('Failed to add project', 'error');
            return;
        }
        if (data) {
            setProjects(prev => [...prev, data]);
            showToast?.(`Added project ${projectKey}`, 'success');
        }
    }, [connection, showToast]);

    // Remove a project
    const removeProject = useCallback(async (projectId: string) => {
        const { error } = await jiraService.removeJiraProject(projectId);
        if (error) {
            showToast?.('Failed to remove project', 'error');
            return;
        }
        setProjects(prev => prev.filter(p => p.id !== projectId));
        showToast?.('Project removed', 'success');
    }, [showToast]);

    // Fetch new issues from a project (for import modal)
    const fetchNewIssues = useCallback(async (projectKey: string): Promise<JiraIssue[]> => {
        try {
            const issues = await jiraService.fetchJiraIssues(projectKey);
            // Filter out already-imported issues
            const importedIds = new Set(mappings.map(m => m.jira_issue_id));
            return issues.filter(i => !importedIds.has(i.id));
        } catch (err: any) {
            showToast?.(err.message || 'Failed to fetch issues', 'error');
            return [];
        }
    }, [mappings, showToast]);

    // Import selected issues as ZenTask tasks
    const importIssues = useCallback(async (
        issues: JiraIssue[],
        dates: Record<string, string>, // issueId → date string
        jiraProjectId: string
    ) => {
        if (!userId) return;

        for (const issue of issues) {
            const date = dates[issue.id] || new Date().toISOString().split('T')[0];
            const status = jiraService.mapJiraStatusToZenTask(issue.statusCategory) as TaskStatus;

            // Find parent ZenTask if this issue has a Jira parent
            let parentId: string | null = null;
            if (issue.parentId) {
                const parentMapping = mappings.find(m => m.jira_issue_id === issue.parentId);
                if (parentMapping) {
                    parentId = parentMapping.task_id;
                }
            }

            const taskId = crypto.randomUUID();
            const now = Date.now();

            // Create the ZenTask task
            const { error: taskError } = await supabase.from('tasks').insert({
                id: taskId,
                user_id: userId,
                parentId,
                title: issue.summary,
                description: issue.description || '',
                status,
                priority: issue.priority === 'Highest' || issue.priority === 'High' ? 'HIGH'
                    : issue.priority === 'Low' || issue.priority === 'Lowest' ? 'LOW'
                    : 'MEDIUM',
                completion: status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 50 : 0,
                date,
                createdAt: now,
                updatedAt: now,
            });

            if (taskError) {
                console.error(`Failed to create task for ${issue.key}:`, taskError);
                continue;
            }

            // Create the mapping
            await jiraService.createTaskMapping(taskId, jiraProjectId, issue);
        }

        // Refresh mappings
        const { data: newMappings } = await jiraService.getTaskMappings();
        setMappings(newMappings || []);

        showToast?.(`Imported ${issues.length} task(s) from Jira`, 'success');
    }, [userId, mappings, showToast]);

    // Sync existing tasks (on app load)
    const syncAll = useCallback(async () => {
        if (!isConnected || !onTaskUpdate) return;
        setIsSyncing(true);
        try {
            const { updates, error } = await jiraService.syncExistingTasks();
            if (error) {
                showToast?.('Sync failed: ' + error, 'error');
                return;
            }

            for (const { taskId, newStatus } of updates) {
                const status = newStatus as TaskStatus;
                const completion = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 50 : 0;
                await onTaskUpdate(taskId, { status, completion });
            }

            if (updates.length > 0) {
                showToast?.(`Synced ${updates.length} task(s) from Jira`, 'success');
            }

            // Refresh mappings
            const { data: newMappings } = await jiraService.getTaskMappings();
            setMappings(newMappings || []);
        } catch (err: any) {
            showToast?.('Sync failed', 'error');
        } finally {
            setIsSyncing(false);
        }
    }, [isConnected, onTaskUpdate, showToast]);

    // Handle ZenTask status change → push to Jira
    const onZenTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
        if (newStatus === TaskStatus.CANCELLED) return; // No Jira equivalent

        const mapping = mappings.find(m => m.task_id === taskId);
        if (!mapping) return; // Not a Jira-linked task

        const targetCategory = jiraService.mapZenTaskStatusToJiraCategory(newStatus);
        const { error } = await jiraService.transitionJiraIssue(mapping.jira_issue_key, targetCategory);

        if (error) {
            console.error(`Failed to transition Jira issue ${mapping.jira_issue_key}:`, error);
        }
    }, [mappings]);

    // Check if a task has a Jira mapping
    const getMapping = useCallback((taskId: string) => {
        return mappings.find(m => m.task_id === taskId) || null;
    }, [mappings]);

    return {
        connection,
        projects,
        mappings,
        isConnected,
        isLoading,
        isSyncing,
        connect,
        disconnect,
        addProject,
        removeProject,
        fetchNewIssues,
        importIssues,
        syncAll,
        onZenTaskStatusChange,
        getMapping,
        refresh,
    };
}

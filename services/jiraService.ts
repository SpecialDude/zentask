import { ApiError, request, toServiceError } from './apiClient';
import type { ServiceError } from './apiClient';
import { JiraConnection, JiraProject, JiraIssue, JiraTaskMapping } from '../types';

// Recursively extract text from Jira's Atlassian Document Format (ADF)
const extractAdfText = (adf: any): string => {
    if (!adf || !adf.content) return '';
    const extractNode = (node: any): string => {
        if (node.type === 'text') return node.text || '';
        if (node.content) return node.content.map(extractNode).join('');
        return '';
    };
    return adf.content.map((block: any) => extractNode(block)).filter(Boolean).join('\n');
};

// --- Helper: Call the allowlisted Jira API proxy on the Django server ---
const callJiraProxy = async <T = any>(action: string, params: Record<string, any> = {}): Promise<T> => {
    try {
        return await request<T>('/jira/proxy', {
            method: 'POST',
            body: { action, ...params },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Proxy error';
        console.error(`[Jira Proxy] ${action} failed:`, message);
        throw new Error(message);
    }
};

// --- OAuth ---

// The server signs the state so the callback can identify the user.
export const getJiraAuthUrl = async (): Promise<string> => {
    const { url } = await request<{ url: string }>('/jira/authorize');
    return url;
};

// --- Connection ---

export const getJiraConnection = async (): Promise<{ data: JiraConnection | null; error: ServiceError | null }> => {
    try {
        return { data: await request<JiraConnection>('/jira/connection'), error: null };
    } catch (error) {
        // 404 is the normal "not connected yet" state.
        if (error instanceof ApiError && error.status === 404) {
            return { data: null, error: null };
        }
        return { data: null, error: toServiceError(error) };
    }
};

export const disconnectJira = async (): Promise<{ error: ServiceError | null }> => {
    try {
        await request('/jira/connection', { method: 'DELETE' });
        return { error: null };
    } catch (error) {
        return { error: toServiceError(error) };
    }
};

// --- Projects ---

export const getJiraProjects = async (): Promise<{ data: JiraProject[] | null; error: ServiceError | null }> => {
    try {
        return { data: await request<JiraProject[]>('/jira/projects'), error: null };
    } catch (error) {
        return { data: null, error: toServiceError(error) };
    }
};

// Raw Atlassian `{ values: [...] }` response, as the selector expects.
export const getAvailableJiraProjects = async () => {
    return callJiraProxy('get-projects');
};

export const addJiraProject = async (
    _connectionId: string,
    projectId: string,
    projectKey: string,
    projectName: string
): Promise<{ data: JiraProject | null; error: ServiceError | null }> => {
    try {
        const data = await request<JiraProject>('/jira/projects', {
            method: 'POST',
            body: {
                project_id: projectId,
                project_key: projectKey,
                project_name: projectName,
            },
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: toServiceError(error) };
    }
};

export const removeJiraProject = async (projectId: string): Promise<{ error: ServiceError | null }> => {
    try {
        await request(`/jira/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
        return { error: null };
    } catch (error) {
        return { error: toServiceError(error) };
    }
};

// --- Issues ---

export const fetchJiraIssues = async (projectKey: string): Promise<JiraIssue[]> => {
    const result = await callJiraProxy<{ issues?: any[] }>('get-issues', { projectKey });
    if (!result.issues) return [];

    return result.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields?.summary || '',
        description: extractAdfText(issue.fields?.description),
        status: issue.fields?.status?.name || '',
        statusCategory: issue.fields?.status?.statusCategory?.key || '',
        priority: issue.fields?.priority?.name || 'Medium',
        parentId: issue.fields?.parent?.id || undefined,
        parentKey: issue.fields?.parent?.key || undefined,
        issueType: issue.fields?.issuetype?.name || 'Task',
    }));
};

// --- Task Mappings ---

export const getTaskMappings = async (): Promise<{ data: JiraTaskMapping[] | null; error: ServiceError | null }> => {
    try {
        return { data: await request<JiraTaskMapping[]>('/jira/mappings'), error: null };
    } catch (error) {
        return { data: null, error: toServiceError(error) };
    }
};

export const getTaskMappingByTaskId = async (taskId: string): Promise<{ data: JiraTaskMapping | null; error: ServiceError | null }> => {
    const { data, error } = await getTaskMappings();
    if (error) return { data: null, error };
    return { data: (data || []).find(m => m.task_id === taskId) || null, error: null };
};

export const createTaskMapping = async (
    taskId: string,
    jiraProjectId: string,
    issue: JiraIssue
): Promise<{ error: ServiceError | null }> => {
    try {
        await request('/jira/mappings', {
            method: 'POST',
            body: {
                task_id: taskId,
                jira_project_id: jiraProjectId,
                jira_issue_id: issue.id,
                jira_issue_key: issue.key,
                jira_parent_id: issue.parentId || null,
                jira_status: issue.statusCategory,
            },
        });
        return { error: null };
    } catch (error) {
        return { error: toServiceError(error) };
    }
};

// --- Status Sync ---

export const transitionJiraIssue = async (issueKey: string, targetStatusCategory: string): Promise<{ error?: string }> => {
    try {
        // 1. Get available transitions
        const { transitions } = await callJiraProxy<{ transitions?: any[] }>('get-transitions', { issueKey });

        // 2. Find the right transition based on target status category
        const transition = transitions?.find((t: any) => {
            const cat = t.to?.statusCategory?.key;
            return cat === targetStatusCategory;
        });

        if (!transition) {
            return { error: `No valid transition found for status category: ${targetStatusCategory}` };
        }

        // 3. Execute the transition
        await callJiraProxy('transition-issue', { issueKey, transitionId: transition.id });
        return {};
    } catch (err: any) {
        return { error: err.message };
    }
};

// The server walks the user's mappings and applies the status changes itself.
export const syncExistingTasks = async (): Promise<{
    updates: { taskId: string; newStatus: string }[];
    error?: string;
}> => {
    try {
        const body = await request<{ updates: { taskId: string; newStatus: string }[] }>('/jira/sync', {
            method: 'POST',
        });
        return { updates: body.updates || [] };
    } catch (err: any) {
        return { updates: [], error: err.message };
    }
};

// --- Helpers ---

export const mapJiraStatusToZenTask = (statusCategory: string): string => {
    switch (statusCategory) {
        case 'new': return 'TODO';
        case 'indeterminate': return 'IN_PROGRESS';
        case 'done': return 'COMPLETED';
        default: return 'TODO';
    }
};

export const mapZenTaskStatusToJiraCategory = (status: string): string => {
    switch (status) {
        case 'IN_PROGRESS': return 'indeterminate';
        case 'COMPLETED': return 'done';
        case 'TODO': return 'new';
        default: return 'new';
    }
};

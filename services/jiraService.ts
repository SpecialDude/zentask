import { supabase } from '../supabase';
import { JiraConnection, JiraProject, JiraIssue, JiraTaskMapping } from '../types';

const SUPABASE_URL = process.env.SUPABASE_URL || '';

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

// --- Helper: Call the Jira API proxy Edge Function ---
const callJiraProxy = async (action: string, params: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke('jira-api-proxy', {
        body: { action, ...params },
    });

    if (error) {
        // Try to extract the actual error message from the response
        let message = error.message || 'Proxy error';
        try {
            // FunctionsHttpError contains a context with the response body
            if (error.context?.body) {
                const reader = error.context.body.getReader();
                const { value } = await reader.read();
                const bodyText = new TextDecoder().decode(value);
                const parsed = JSON.parse(bodyText);
                message = parsed.error || message;
            }
        } catch { /* ignore parse errors */ }
        console.error(`[Jira Proxy] ${action} failed:`, message);
        throw new Error(message);
    }

    return data;
};

// --- OAuth ---

export const getJiraAuthUrl = () => {
    const clientId = process.env.ATLASSIAN_CLIENT_ID || '';
    const redirectUri = encodeURIComponent(`${SUPABASE_URL}/functions/v1/jira-auth-callback`);
    const scopes = encodeURIComponent('read:jira-work write:jira-work read:jira-user offline_access');

    return `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&response_type=code&prompt=consent`;
};

// --- Connection ---

export const getJiraConnection = async (): Promise<{ data: JiraConnection | null; error: any }> => {
    const { data, error } = await supabase
        .from('jira_connections')
        .select('id, user_id, cloud_id, site_name, atlassian_email, token_expires_at, created_at')
        .single();
    return { data, error };
};

export const disconnectJira = async (): Promise<{ error: any }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Delete in order: mappings → projects → connection (respects FK constraints)
    await supabase.from('jira_task_mappings').delete().eq('user_id', user.id);
    await supabase.from('jira_projects').delete().eq('user_id', user.id);
    const { error } = await supabase.from('jira_connections').delete().eq('user_id', user.id);
    return { error };
};

// --- Projects ---

export const getJiraProjects = async (): Promise<{ data: JiraProject[] | null; error: any }> => {
    const { data, error } = await supabase
        .from('jira_projects')
        .select('*')
        .order('created_at', { ascending: true });
    return { data, error };
};

export const getAvailableJiraProjects = async () => {
    return callJiraProxy('get-projects');
};

export const addJiraProject = async (
    connectionId: string,
    projectId: string,
    projectKey: string,
    projectName: string
): Promise<{ data: JiraProject | null; error: any }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase.from('jira_projects').insert({
        user_id: user.id,
        connection_id: connectionId,
        project_id: projectId,
        project_key: projectKey,
        project_name: projectName,
    }).select().single();

    return { data, error };
};

export const removeJiraProject = async (projectId: string): Promise<{ error: any }> => {
    const { error } = await supabase.from('jira_projects').delete().eq('id', projectId);
    return { error };
};

// --- Issues ---

export const fetchJiraIssues = async (projectKey: string): Promise<JiraIssue[]> => {
    const result = await callJiraProxy('get-issues', { projectKey });
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

export const getTaskMappings = async (): Promise<{ data: JiraTaskMapping[] | null; error: any }> => {
    const { data, error } = await supabase
        .from('jira_task_mappings')
        .select('*');
    return { data, error };
};

export const getTaskMappingByTaskId = async (taskId: string): Promise<{ data: JiraTaskMapping | null; error: any }> => {
    const { data, error } = await supabase
        .from('jira_task_mappings')
        .select('*')
        .eq('task_id', taskId)
        .single();
    return { data, error };
};

export const createTaskMapping = async (
    taskId: string,
    jiraProjectId: string,
    issue: JiraIssue
): Promise<{ error: any }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };

    const { error } = await supabase.from('jira_task_mappings').insert({
        user_id: user.id,
        task_id: taskId,
        jira_project_id: jiraProjectId,
        jira_issue_id: issue.id,
        jira_issue_key: issue.key,
        jira_parent_id: issue.parentId || null,
        jira_status: issue.statusCategory,
    });

    return { error };
};

// --- Status Sync ---

export const transitionJiraIssue = async (issueKey: string, targetStatusCategory: string): Promise<{ error?: string }> => {
    try {
        // 1. Get available transitions
        const { transitions } = await callJiraProxy('get-transitions', { issueKey });

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

export const syncExistingTasks = async (): Promise<{
    updates: { taskId: string; newStatus: string }[];
    error?: string;
}> => {
    try {
        const { data: mappings } = await getTaskMappings();
        if (!mappings?.length) return { updates: [] };

        const updates: { taskId: string; newStatus: string }[] = [];

        // Group mappings by project to batch API calls
        const byProject = new Map<string, JiraTaskMapping[]>();
        for (const m of mappings) {
            const arr = byProject.get(m.jira_project_id) || [];
            arr.push(m);
            byProject.set(m.jira_project_id, arr);
        }

        for (const [, projectMappings] of byProject) {
            for (const mapping of projectMappings) {
                try {
                    const issue = await callJiraProxy('get-issue', { issueKey: mapping.jira_issue_key });
                    const currentCategory = issue?.fields?.status?.statusCategory?.key;

                    if (currentCategory && currentCategory !== mapping.jira_status) {
                        let newStatus = 'TODO';
                        if (currentCategory === 'indeterminate') newStatus = 'IN_PROGRESS';
                        else if (currentCategory === 'done') newStatus = 'COMPLETED';

                        updates.push({ taskId: mapping.task_id, newStatus });

                        // Update mapping's cached status
                        await supabase.from('jira_task_mappings')
                            .update({ jira_status: currentCategory, last_synced_at: new Date().toISOString() })
                            .eq('id', mapping.id);
                    }
                } catch (err) {
                    console.error(`Failed to sync issue ${mapping.jira_issue_key}:`, err);
                }
            }
        }

        return { updates };
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

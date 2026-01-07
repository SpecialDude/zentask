
import React from 'react';
import { Task, TaskStatus } from '../types';
import TaskItem from './TaskItem';

interface ListViewProps {
  tasks: Task[];
  allTasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (t: Task) => void;
  onViewTask: (t: Task) => void;
  onAddSubtask: (parentId: string) => void;
  onCarryOver: (id: string, newDate: string) => void;
}

const ListView: React.FC<ListViewProps> = ({
  tasks, allTasks, onUpdateTask, onDeleteTask, onEditTask, onViewTask, onAddSubtask, onCarryOver
}) => {
  // Only top-level tasks for this date
  const rootTasks = tasks.filter(t => t.parentId === null);

  if (rootTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p className="text-lg font-medium">No tasks for this day yet.</p>
        <p className="text-sm">Plan your day by adding a new task!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {rootTasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          allTasks={allTasks}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
          onViewTask={onViewTask}
          onAddSubtask={onAddSubtask}
          onCarryOver={onCarryOver}
          level={0}
        />
      ))}
    </div>
  );
};

export default ListView;

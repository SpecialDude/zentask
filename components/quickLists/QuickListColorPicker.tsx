import React, { useState } from 'react';
import { QUICK_LIST_COLORS } from './quickListConstants';

interface QuickListColorPickerProps {
    color: string;
    onColorChange: (color: string) => void;
    position?: 'top' | 'bottom';
}

const QuickListColorPicker: React.FC<QuickListColorPickerProps> = ({
    color,
    onColorChange,
    position = 'top'
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                style={{ backgroundColor: color }}
                title="Color"
            />
            {isOpen && (
                <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-1.5 z-10`}>
                    {QUICK_LIST_COLORS.map(c => (
                        <button
                            key={c.hex}
                            onClick={() => { onColorChange(c.hex); setIsOpen(false); }}
                            className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c.hex ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuickListColorPicker;

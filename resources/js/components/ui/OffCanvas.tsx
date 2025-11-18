import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OffCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  width?: number;
  position?: 'start' | 'end';
  title?: string;
  children: React.ReactNode;
}

const OffCanvas: React.FC<OffCanvasProps> = ({ isOpen, onClose, width = 400, position = 'end', title, children }) => {
  const isEnd = position === 'end';
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 h-full bg-white shadow-2xl z-50 flex flex-col"
            style={{ width }}
            initial={{ x: isEnd ? width : -width }}
            animate={{ x: 0 }}
            exit={{ x: isEnd ? width : -width }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            {...(isEnd ? { style: { width, right: 0 } } : { style: { width, left: 0 } })}
          >
            <div className="p-4 border-b border-gray-200">
              {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OffCanvas;
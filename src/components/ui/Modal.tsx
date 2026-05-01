
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-white italic tracking-tighter">{title}</h3>
              <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto text-slate-300 space-y-4 font-medium leading-relaxed">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

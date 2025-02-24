import { motion } from 'framer-motion';
import { HeartIcon } from 'lucide-react';
import { MessageIcon } from './icons';

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <p className="flex flex-row justify-center gap-4 items-center">
          <HeartIcon size={32} className="text-rose-500" />
          <span>+</span>
          <MessageIcon size={32} className="text-blue-500" />
        </p>
        <p className="text-lg">
          Welcome to Match Genius! Get help crafting engaging messages that 
          showcase your personality and create meaningful connections.
        </p>
        <p className="text-muted-foreground">
          Select any of the suggestions below to get started, or type your own 
          message. Our AI will help you write the perfect response.
        </p>
      </div>
    </motion.div>
  );
};
import { motion } from 'framer-motion';

export function Scene1() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.5 },
    },
    exit: { opacity: 0, scale: 1.05, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="absolute inset-0 flex flex-col items-center justify-center text-center z-10"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_60px_rgba(37,99,235,0.4)] flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </motion.div>
      
      <motion.h1 
        variants={itemVariants}
        className="font-display text-[7vw] font-bold tracking-tighter leading-none mb-4 text-white"
      >
        Mapey <span className="text-gradient">CRM</span>
      </motion.h1>
      
      <motion.p 
        variants={itemVariants}
        className="text-[2vw] font-medium text-text-secondary tracking-widest uppercase"
      >
        Locação de Contas de Anúncio
      </motion.p>
      
      {/* Decorative floating elements */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"
        animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-[120px]"
        animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

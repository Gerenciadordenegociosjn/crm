import { motion } from 'framer-motion';

export function Scene5() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.3, delayChildren: 0.3 },
    },
    exit: { opacity: 0, transition: { duration: 1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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
        variants={itemVariants}
        className="w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)]"
      >
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </motion.div>

      <motion.h2 
        variants={itemVariants}
        className="font-display text-[5vw] font-bold mb-4"
      >
        Bem-vindo à equipe.
      </motion.h2>

      <motion.p 
        variants={itemVariants}
        className="text-[1.8vw] text-text-secondary flex items-center gap-3"
      >
        <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Acesso individual e seguro.
      </motion.p>
      
      {/* Background cinematic particles video */}
      <motion.div 
        className="absolute inset-0 -z-10 opacity-30 mix-blend-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 2, delay: 0.5 }}
      >
        <video 
          src={`${import.meta.env.BASE_URL}videos/tech-particles.mp4`}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      </motion.div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';

export function Scene2() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 },
    },
    exit: { 
      opacity: 0,
      x: '-10vw',
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="absolute inset-0 flex items-center justify-between px-[10vw] z-10"
    >
      <div className="w-1/2 flex flex-col justify-center">
        <motion.div variants={itemVariants} className="mb-6">
          <span className="inline-block py-2 px-4 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium text-[1vw] uppercase tracking-wider">
            Visão Geral
          </span>
        </motion.div>
        
        <motion.h2 
          variants={itemVariants}
          className="font-display text-[4vw] font-bold leading-tight mb-8"
        >
          Tudo em um<br/>só lugar.
        </motion.h2>

        <div className="flex flex-col gap-6">
          {[
            { title: 'Gerencie', desc: 'clientes, negócios e contas.' },
            { title: 'Controle', desc: 'quem vende o quê.' },
            { title: 'Acompanhe', desc: 'o funil de vendas em tempo real.' }
          ].map((item, i) => (
            <motion.div 
              key={i}
              variants={itemVariants}
              className="flex items-center gap-6 glass-panel p-6 rounded-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <div className="w-4 h-4 bg-accent rounded-full" />
              </div>
              <div>
                <span className="font-bold text-[1.5vw] text-white block">{item.title}</span>
                <span className="text-[1.2vw] text-text-secondary">{item.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div 
        className="w-[40%] h-[70vh] relative perspective-1000"
        initial={{ opacity: 0, x: 100, rotateY: -20 }}
        animate={{ opacity: 1, x: 0, rotateY: -10 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full"
        >
          <img 
            src={`${import.meta.env.BASE_URL}images/ui-dashboard.png`} 
            alt="Dashboard UI" 
            className="w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(37,99,235,0.3)]"
          />
        </motion.div>
        
        {/* Floating elements around UI */}
        <motion.div
          className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 rounded-full blur-[40px]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}

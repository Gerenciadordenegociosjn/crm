import { motion } from 'framer-motion';

export function Scene3() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: '-10vh' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 flex items-center justify-center px-[8vw] z-10"
    >
      {/* Background layer specific to scene */}
      <motion.div 
        className="absolute right-0 top-0 w-[50vw] h-screen bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"
        initial={{ opacity: 0, x: '10vw' }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      <div className="flex w-full items-center justify-between gap-12">
        <div className="w-[45%] relative h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateZ: -10 }}
            animate={{ opacity: 1, scale: 1, rotateZ: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
            className="relative z-10"
          >
            <motion.div
              animate={{ y: [0, -15, 0], rotateY: [0, 5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <img 
                src={`${import.meta.env.BASE_URL}images/shield-icon.png`}
                className="w-[30vw] object-contain filter drop-shadow-[0_0_80px_rgba(16,185,129,0.3)]"
                alt="Admin Shield"
              />
            </motion.div>
          </motion.div>
          
          <motion.div
             className="absolute w-[35vw] h-[35vw] border border-accent/30 rounded-full"
             animate={{ rotate: 360, scale: [1, 1.05, 1] }}
             transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="w-[50%] flex flex-col">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6"
          >
            <span className="inline-block py-2 px-4 rounded-full bg-accent/20 text-accent border border-accent/30 font-medium text-[1vw] tracking-wider uppercase">
              Perfil: Administrador
            </span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-display text-[4.5vw] font-bold leading-none mb-8"
          >
            Acesso <span className="text-accent">Total.</span>
          </motion.h2>

          <div className="space-y-6">
            {[
              { label: 'Pipeline Kanban', desc: 'Arrastar e soltar negócios' },
              { label: 'Gestão Completa', desc: 'Cadastro de equipe, clientes e fornecedores' },
              { label: 'Visão 360º', desc: 'Relatórios e Pipeline Mensal consolidados' }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.5 + (i * 0.15), ease: [0.16, 1, 0.3, 1] }}
                className="pl-6 border-l-2 border-accent/40"
              >
                <h3 className="text-[1.8vw] font-bold text-white mb-1">{item.label}</h3>
                <p className="text-[1.2vw] text-text-secondary">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
